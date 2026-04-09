import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { getCfVar } from './cf-env';

export const HOLMES_SYSTEM_PROMPT = `You are Holmes AI - the civic intelligence engine of The Holmes Project, named after Thomas Holme, William Penn's surveyor who mapped Philadelphia in 1683. You know this city deeply: its housing crisis, vacant properties, blight patterns, evictions, displacement pressures, and the policy levers that actually move things.

You have real-time access to OpenDataPhilly data: vacant property indicators, L&I code violations, eviction filings, and property assessments. Use it. Be specific about addresses, neighborhoods, programs, and numbers when they're relevant.

Speak like a knowledgeable friend who happens to know Philadelphia housing policy inside out - not a report generator. You can have a point of view. You can say when something is broken, or when a policy actually worked. Keep things clear and grounded, not bureaucratic.

Be reasonably brief - a few sentences to a short paragraph usually does it. Use a bullet list only when listing genuinely parallel things. Don't pad. Don't over-qualify. If you don't know something, say so plainly and move on.

Reference Philadelphia-specific programs (Land Bank, LandCare, Act 135 conservatorship, L&I, PHA, CLTs) when they're relevant. Bring in Detroit, Baltimore, or Cleveland comparisons when they're actually instructive - not just to sound thorough.`;

export const HOLMES_BEHAVIOR_PROMPT = `
Holmes personality:
- Sound like a sharp, grounded Philadelphia civic analyst with warmth and clarity.
- Be direct, observant, and useful, not corporate or overly academic.
- Explain things so a regular person can follow without losing precision.
- If the user is clearly looking at a map, tract, property, neighborhood, or audit event, acknowledge that visible context and anchor the answer to it.

How to use context:
- Treat the current UI/view context as important evidence about what the user is looking at right now.
- If a selected tract, property, neighborhood, or site is provided, prefer explaining that specific thing before zooming out.
- If the user asks "why is this high risk?" or similar, explain the visible drivers in plain English.
- Do not claim to know hidden behavior like cursor movement or keystrokes unless that information is explicitly included in the provided context.

RAG rules:
- Use retrieved evidence when it is relevant and mention concrete facts from it.
- If retrieved evidence is thin or unrelated, say that and answer from the live UI/data context instead of hallucinating.
- When possible, tie claims to specific numbers, locations, or signals that were actually provided.
`;

export const HOLMES_AUDIT_PROMPT = `
Audit mode:
- You are explaining AI inhibitor logs, interventions, actions, triggers, and review decisions.
- Do not reference housing, vacant properties, blight, neighborhoods, broadband, Wi-Fi, or connectivity unless the provided audit event explicitly mentions them.
- Do not pull in Philadelphia housing context just because it exists elsewhere in the product.
- Stay focused on what the log item means, why the system likely acted, and what a reviewer should take away.
- If a label is technical, translate it into plain English without drifting into unrelated civic topics.
`;

type HolmesRole = 'system' | 'user' | 'assistant';

export interface HolmesMessage {
  role: HolmesRole;
  content: string;
}

interface HolmesOptions {
  messages: HolmesMessage[];
  maxTokens?: number;
  temperature?: number;
}

interface AiConfig {
  provider: 'cloudflare' | 'openai' | 'groq';
  model: string;
  openai?: OpenAI;
  groq?: Groq;
  cloudflareAi?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
}

const DEFAULT_CLOUDFLARE_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

async function getCloudflareAiBinding(): Promise<AiConfig['cloudflareAi'] | undefined> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const maybeAi = (env as Record<string, unknown>).AI as AiConfig['cloudflareAi'] | undefined;
    if (maybeAi?.run) return maybeAi;
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeCloudflareModel(model: string | undefined): string {
  const trimmed = (model || '').trim();
  if (!trimmed) return DEFAULT_CLOUDFLARE_MODEL;
  if (trimmed.startsWith('@cf/')) return trimmed;
  if (trimmed.startsWith('llama-')) return `@cf/meta/${trimmed}`;
  return trimmed;
}

async function getAiConfig(): Promise<AiConfig> {
  const providerPref = (await getCfVar('AI_PROVIDER'))?.toLowerCase();
  const cloudflareAi = await getCloudflareAiBinding();
  const openaiKey = await getCfVar('OPENAI_API_KEY');
  const groqKey = await getCfVar('GROQ_API_KEY');

  if ((providerPref === 'cloudflare' || !providerPref) && cloudflareAi) {
    return {
      provider: 'cloudflare',
      model: normalizeCloudflareModel((await getCfVar('CLOUDFLARE_AI_MODEL')) || DEFAULT_CLOUDFLARE_MODEL),
      cloudflareAi,
    };
  }

  if ((providerPref === 'openai' || (!providerPref && openaiKey)) && openaiKey) {
    return {
      provider: 'openai',
      model: (await getCfVar('OPENAI_MODEL')) || DEFAULT_OPENAI_MODEL,
      openai: new OpenAI({ apiKey: openaiKey }),
    };
  }

  if (groqKey) {
    return {
      provider: 'groq',
      model: (await getCfVar('GROQ_MODEL')) || DEFAULT_GROQ_MODEL,
      groq: new Groq({ apiKey: groqKey }),
    };
  }

  throw new Error('Missing AI provider configuration. Add a Cloudflare AI binding, OPENAI_API_KEY, or GROQ_API_KEY.');
}

function streamToTextResponse(
  stream: AsyncIterable<{ choices?: Array<{ delta?: { content?: string | null } }> }>
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices?.[0]?.delta?.content || '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

function cloudflareTextFromResult(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const maybe = result as Record<string, unknown>;
    if (typeof maybe.response === 'string') return maybe.response;
    if (typeof maybe.result === 'string') return maybe.result;
    if (Array.isArray(maybe.response)) {
      return maybe.response
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') return item.text;
          return '';
        })
        .join('');
    }
  }
  return 'Holmes AI could not parse a response from Cloudflare Workers AI.';
}

export async function streamHolmesText({ messages, maxTokens = 700, temperature = 0.7 }: HolmesOptions): Promise<Response> {
  const config = await getAiConfig();

  if (config.provider === 'cloudflare' && config.cloudflareAi) {
    const result = await config.cloudflareAi.run(config.model, {
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    return new Response(cloudflareTextFromResult(result), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (config.provider === 'openai' && config.openai) {
    const stream = await config.openai.chat.completions.create({
      model: config.model,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    });
    return streamToTextResponse(stream);
  }

  if (config.provider === 'groq' && config.groq) {
    const stream = await config.groq.chat.completions.create({
      model: config.model,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    });
    return streamToTextResponse(stream);
  }

  throw new Error('No AI provider is configured.');
}

export function formatAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown AI provider error';
  if (message.includes('organization_restricted') || message.includes('Organization has been restricted')) {
    return 'Holmes AI is unavailable because the current provider account is restricted. Switch the app to Cloudflare Workers AI or OpenAI.';
  }
  return `Holmes AI is unavailable right now: ${message}`;
}
