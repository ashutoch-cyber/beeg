# Deploy Beeg on Cloudflare Pages + Supabase

This setup keeps everything free except your custom domain:

- Web/PWA: Cloudflare Pages
- API routes: Cloudflare Pages Functions at `/api/food/scan` and `/api/food/insight`
- Database/auth: Supabase

The existing Express API is useful for local/Replit-style Node hosting, but Cloudflare Pages deploys the production API through the `functions/` directory.

## 1. Supabase

1. Open your Supabase project: `mqupfhbtjxpbraioanml`
2. Go to SQL Editor.
3. Run `lib/db/sql/000_repair_create_tables_first.sql`.
4. Run `lib/db/sql/001_food_tracker_tables.sql`.
5. Use `lib/db/sql/002_food_tracker_queries.sql` for checks and manual queries.

## 2. Cloudflare Pages Project

Create a Cloudflare Pages project connected to:

```text
https://github.com/ashutoch-cyber/beeg.git
```

Use these settings:

```text
Framework preset: None
Root directory: /
Build command: corepack enable && pnpm install --frozen-lockfile --config.minimumReleaseAge=0 && pnpm run build:cloudflare
Build output directory: artifacts/mobile/static-build/web
```

## 3. Cloudflare Environment Variables

Add these in Cloudflare Pages > Settings > Environment variables.

Production and Preview:

```text
GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_SUPABASE_URL=https://mqupfhbtjxpbraioanml.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You normally do not need `EXPO_PUBLIC_DOMAIN` on Cloudflare because the web app can call same-origin `/api/...`.

## 4. Local Build Test

On a Linux shell or Cloudflare build environment:

```bash
corepack enable
pnpm install --frozen-lockfile --config.minimumReleaseAge=0
pnpm run build:cloudflare
```

Preview the Cloudflare Pages build locally:

```bash
npx wrangler pages dev artifacts/mobile/static-build/web --compatibility-date=2026-05-13
```

## 5. Custom Domain

After the first successful Pages deploy:

1. Cloudflare Pages > Custom domains
2. Add your purchased domain or subdomain
3. Let Cloudflare create the DNS record
4. Wait for SSL to become active

## Notes

- Do not commit `.env`.
- Add `GEMINI_API_KEY` only as a Cloudflare secret/env var.
- Supabase anon key is public by design, but Row Level Security must stay enabled.
