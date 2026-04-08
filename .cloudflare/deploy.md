# Cloudflare Pages Deployment

## Steps

1. Push repo to GitHub
2. Go to Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. Set build settings:
   - Framework preset: **Next.js**
   - Build command: `npm run build`
   - Build output directory: `.next`

## Environment Variables (set in Cloudflare Pages dashboard)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `PINECONE_API_KEY` | Your Pinecone API key |
| `GROQ_API_KEY` | Your Groq API key |
| `NODE_VERSION` | `20` |
