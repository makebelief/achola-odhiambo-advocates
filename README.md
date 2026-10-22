# Achola Odhiambo & Company Advocates

Production-ready website for Achola Odhiambo & Company Advocates. The Insights section includes a private, non-technical article dashboard backed by Supabase Auth, Postgres and Storage. Published articles appear immediately with individual URLs and social preview metadata.

## Commands

```bash
npm run check
npm run build
vercel --prod --yes
```

## Advocate publishing workflow

The advocate does not need GitHub access. He visits `/admin`, signs in with his publishing email and password, and can:

- create an article or save a private draft;
- format headings, bold text, lists and links;
- upload a cover image;
- publish, edit or delete articles; and
- open the public Insights page from the dashboard.

Published content appears without a Git commit or Vercel rebuild. The server-rendered article route provides WhatsApp, search engine and social metadata.

## Developer setup

1. Create a Supabase project and apply `supabase/migrations/20261022074437_create_article_publishing.sql`.
2. Create the advocate in Supabase Authentication using email/password.
3. Add the new user's UUID to `public.admin_users`.
4. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to Vercel for Production, Preview and Development.
5. Deploy. The dashboard is available at `/admin`.

Only the publishable key is returned to the browser. Database and Storage writes are protected by Row Level Security and an explicit `admin_users` allowlist. Never expose a Supabase secret or service-role key.

The Markdown content under `content/articles` remains a static fallback for environments where the publishing service is unavailable.

## Visual asset notes (v4)
- Homepage hero uses a real, non-AI stock photograph fetched from Unsplash: Vitaly Gariev, photo `omGSZqBXkqY`, under the Unsplash License.
- The firm/advocate photography in the website uses the higher-resolution images supplied for Achola Odhiambo & Company Advocates, optimised to WebP for production delivery.
- Header and footer branding use custom vector wordmarks (black/gold and ivory/gold variants).
