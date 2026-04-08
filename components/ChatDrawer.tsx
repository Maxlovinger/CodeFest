'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Zap, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mapContext?: string;
}

const STARTER_PROMPTS = [
  'Which neighborhoods have the highest blight concentration?',
  'What are the most effective interventions for vacant properties in Kensington?',
  'Explain the link between evictions and property vacancy in Philadelphia.',
  'Which zip codes have the most L&I violations?',
  'Compare Philadelphia\'s vacancy crisis to Detroit and Baltimore.',
];

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 80 80" className="flex-shrink-0">
      <polygon points="40,4 44,36 40,40 36,36" fill="#FFCC00" />
      <polygon points="40,76 44,44 40,40 36,44" fill="#471396" />
      <polygon points="4,40 36,44 40,40 36,36" fill="#471396" />
      <polygon points="76,40 44,36 40,40 44,44" fill="#B13BFF" />
      <circle cx="40" cy="40" r="4" fill="#FFCC00" />
      <circle cx="40" cy="40" r="2" fill="#090040" />
    </svg>
  );
}

export default function ChatDrawer({ isOpen, onClose, mapContext }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || isStreaming) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsStreaming(true);

    // Add empty assistant message
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: mapContext,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errorText = (await res.text()) || 'Unable to connect to Holmes AI. Please try again.';
        throw new Error(errorText);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setMessages([...newMessages, { role: 'assistant', content: accumulated }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages([...newMessages, { role: 'assistant', content: err.message }]);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(9,0,64,0.5)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed left-60 right-0 bottom-12 z-50 flex flex-col"
            style={{
              height: '60vh',
              background: 'rgba(9,0,48,0.97)',
              backdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(177,59,255,0.3)',
              borderLeft: '1px solid rgba(177,59,255,0.2)',
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Grid texture */}
            <div className="absolute inset-0 survey-grid opacity-20 pointer-events-none" />

            {/* Header */}
            <div
              className="relative flex items-center justify-between px-6 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(177,59,255,0.2)' }}
            >
              <div className="flex items-center gap-3">
                <CompassIcon />
                <div>
                  <h3
                    className="text-sm font-bold"
                    style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
                  >
                    Holmes AI
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Playfair Display, serif', fontStyle: 'italic' }}>
                    Civic Intelligence System · Philadelphia Housing
                  </p>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full ml-2"
                  style={{ background: 'rgba(177,59,255,0.1)', border: '1px solid rgba(177,59,255,0.2)' }}
                >
                  <Zap size={10} style={{ color: 'var(--electric)' }} />
                  <span className="text-[10px]" style={{ fontFamily: 'DM Sans', color: 'var(--electric)' }}>
                    Groq · llama-3.3-70b
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:bg-electric/10"
                style={{ color: 'var(--text-muted)' }}
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="relative flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="text-center">
                    <p
                      className="text-lg font-semibold mb-2"
                      style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
                    >
                      Ask Holmes about Philadelphia
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Playfair Display', fontStyle: 'italic' }}>
                      Vacancy · Blight · Displacement · Policy
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                    {STARTER_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: 'rgba(71,19,150,0.2)',
                          border: '1px solid rgba(177,59,255,0.2)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'DM Sans',
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <motion.div
                      className="max-w-[75%] rounded-xl px-4 py-3"
                      style={msg.role === 'user' ? {
                        background: 'var(--royal)',
                        color: 'var(--text-primary)',
                        borderRadius: '16px 16px 4px 16px',
                      } : {
                        background: 'rgba(71,19,150,0.15)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(177,59,255,0.2)',
                        borderLeft: '3px solid var(--electric)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px 16px 16px 16px',
                      }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {msg.content}
                        {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                          <span className="inline-flex gap-0.5 ml-1 align-middle">
                            {[0, 1, 2].map(j => (
                              <motion.span
                                key={j}
                                className="w-1 h-1 rounded-full inline-block"
                                style={{ background: 'var(--electric)' }}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.2 }}
                              />
                            ))}
                          </span>
                        )}
                      </p>
                    </motion.div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="relative px-6 py-3 flex items-end gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(177,59,255,0.2)' }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Philadelphia housing, blight, policy interventions..."
                rows={1}
                className="flex-1 resize-none outline-none text-sm py-2 px-3 rounded-lg"
                style={{
                  background: 'rgba(45,11,94,0.6)',
                  border: '1px solid rgba(177,59,255,0.25)',
                  color: 'var(--text-primary)',
                  fontFamily: 'DM Sans, sans-serif',
                  maxHeight: '80px',
                  caretColor: 'var(--electric)',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="p-2.5 rounded-lg transition-all duration-200 flex-shrink-0 disabled:opacity-40"
                style={{
                  background: input.trim() && !isStreaming
                    ? 'linear-gradient(135deg, var(--electric), var(--royal-bright))'
                    : 'rgba(177,59,255,0.15)',
                  boxShadow: input.trim() && !isStreaming ? '0 0 16px rgba(177,59,255,0.3)' : 'none',
                }}
              >
                <Send size={15} style={{ color: 'white' }} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
