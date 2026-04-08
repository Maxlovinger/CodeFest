# Cloudflare Workers Deployment

This project is configured for OpenNext on Cloudflare Workers, not classic Cloudflare Pages.

## One-time setup

1. Authenticate Wrangler:
   - `npx wrangler login`
2. Confirm the Worker name in [wrangler.jsonc](/Users/max_lovinger/Documents/CodeFest/holmes-project/wrangler.jsonc).
3. Make sure your local `.env.local` has the required secrets for local testing.

## Required Cloudflare secrets

Set these as Worker secrets for the `holmes` Worker:

- `DATABASE_URL`
- `PINECONE_API_KEY`
- `GROQ_API_KEY`

Commands:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put PINECONE_API_KEY
npx wrangler secret put GROQ_API_KEY
```

Optional public variable:

```bash
npx wrangler secret put NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

If you prefer dashboard setup, add the same keys under Workers and Pages -> `holmes` -> Settings -> Variables and Secrets.

## Build and deploy

```bash
npm run cf:build
npm run deploy
```

`npm run deploy` runs the OpenNext build and publishes the generated Worker bundle.

## Verify secrets after deploy

Call `/api/debug/env` and confirm `GROQ_API_KEY`, `PINECONE_API_KEY`, and `DATABASE_URL` report `cf-env ✓`.

If AI endpoints still fail after deploy, the issue is usually one of:

- Secrets were added to Pages but not to the Worker runtime.
- The Worker was deployed before the latest secrets were saved.
- `DATABASE_URL` is missing or invalid, which breaks routes that combine AI with live query data.
