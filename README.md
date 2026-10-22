# Achola Odhiambo & Company Advocates — Website

Production website for Achola Odhiambo & Company Advocates, maintained by Wakiliwa Tech. Cloudflare Pages serves the statically built public pages, Cloudflare Pages Functions serve dynamic article pages and APIs, and Supabase provides Auth, Postgres, Realtime and Storage.

## Verify the project

Requires Node.js 22 or later:

```bash
npm test       # checks source, builds for sample domain, validates SEO/CSP, restores demo build
npm run build  # creates dist/
```

The advocate publishes through `/admin`; no GitHub knowledge is required. Drafts stay private, published articles appear automatically on `/insights`, and every article has a stable shareable URL with server-rendered social metadata. Required Cloudflare production variables are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SITE_URL`.

Edit **`site/`** for page content, photos and styles. `dist/` is generated deployment output; do not hand-edit `dist/` or the generated `dist/_headers` file.

## Cloudflare Pages production deployment

The full site is deployed to `https://achola-odhiambo-advocates.pages.dev`. The `functions/` directory contains the Cloudflare equivalents of the article listing, configuration, dynamic article-page and sitemap routes. The old Vercel hostname permanently redirects to Cloudflare; the previous implementation remains in `api/` as a source-level rollback path.

1. Authenticate Wrangler with the intended Cloudflare account and install dependencies with `npm install`.
2. Configure the Pages project's production secrets `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SITE_URL`. `SITE_URL` must be the exact HTTPS canonical origin, with no path, query or fragment.
3. Run `npm run deploy:cloudflare`. This builds `dist/`, compiles Pages Functions and deploys the `main` production branch.
4. Run `TEST_BASE_URL=https://achola-odhiambo-advocates.pages.dev TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:production`, then `npm run test:mobile` with the same environment to verify the complete live workflow.
5. When a custom domain is ready, attach it under the Pages project, update the `SITE_URL` secret and build environment, deploy again, and redirect the non-canonical host to the chosen canonical host.
6. Submit the canonical `/sitemap.xml` to Google Search Console and request indexing after the custom domain is approved.

Cloudflare Pages automatically serves `about.html` at `/about`; the standard `404.html` is used for unknown routes. `site/_headers` is the Cloudflare Pages security-header template: the build emits `dist/_headers` with SHA-256 hashes for each inline JSON-LD metadata block, so executable inline scripts remain blocked by the Content Security Policy.

Production builds default to the current `pages.dev` origin. Always set `SITE_URL` explicitly when moving to a custom domain so canonical, Open Graph, robots and sitemap URLs remain consistent.

## WhatsApp / social link preview

Every content page contains **server-rendered Open Graph (OG)** and Twitter/X metadata. When a link is sent through WhatsApp, Facebook or LinkedIn, the receiving platform can fetch the site's **1200 × 630 JPEG** containing a 50/50 split: the law firm's wordmark on a dark background, and the managing partner's existing portrait. The file is `site/images/social-card-v2.jpg` (also copied into `dist/images/` by the build).

- The metadata uses an absolute `https://` URL and includes `og:image`, `og:image:secure_url`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:site_name`, and Twitter large-card image/alt tags. Image filename is versioned to avoid stale image caches.
- Setting `SITE_URL` to the new primary domain rewrites the image links for **every page** during `npm run build`, just like the canonical tags. For example, the new link preview URL will be `https://YOUR-ACTUAL-DOMAIN/images/social-card-v2.jpg`.
- After **deploying**, test on the real HTTPS domain. Open the image URL directly in a private window to check it returns the JPEG without requiring login; inspect HTML source on `/` and `/about` to confirm the image URL begins with the correct domain. Share the complete HTTPS link in WhatsApp to check actual platform rendering.
- **WhatsApp chooses its own preview layout and caches metadata.** Even correctly configured tags cannot guarantee a preview on every device or in every chat. If you previously shared the same URL, its old preview may remain cached; try a newly configured canonical domain or a temporary page-link query suffix such as `?share=2`, and allow the messaging app to refresh.
- The preview is created from original local brand assets; if the client changes the approved logo or portrait, optionally regenerate with `python3 scripts/generate_social_preview.py` (requires Python packages `Pillow` and `CairoSVG` for development only, never for Cloudflare).

## Built-in security and usability

- The contact form stores no personal data; it opens WhatsApp only **after explicit consent**. Article records and cover images are protected by Supabase row-level security and owner-scoped storage rules.
- No Google Analytics, advertising pixels or third-party JavaScript are included.
- Cloudflare CSP restricts scripts to local files and hashes of inline structured data, blocks framing and unexpected form posts; additional headers include `nosniff`, HSTS, referrer and permissions policies.
- Accessible skip links, keyboard focus styles, mobile-menu Escape behavior, collapsed contact-rail keyboard management, and reduced-motion preference support.
- Fast local WebP office/profile photography, intrinsic image dimensions, lazy-loaded below-the-fold photos and 24-hour revalidation for unversioned media.
- Some editorial/hero photos are still loaded from **Pexels and Unsplash**; if an image cannot load, the browser substitutes a local firm photo. These third-party image requests are disclosed in the privacy page. Original Pexels hero credit: Christina Morillo / Pexels photo 1181427. Confirm all photo rights and any credit requirements before launch.

## Final client-approval checks (not verifiable from source code)

Ask the law firm to verify **business name spelling, telephone/WhatsApp destination, office address, practice areas, admissions/practising details, court-work references, photos, copyright permission, website terms and privacy notice**. Do a live end-to-end WhatsApp test. Regulatory/professional claims must be confirmed by the client; automated code checks cannot validate them. If the client later wants confidential enquiries, use an authenticated, rate-limited, encrypted server-side system instead of WhatsApp URL prefilling.

The Cloudflare Pages deployment is active. Registrar/DNS changes, a custom domain, and Google Search Console ownership verification still require the final domain decision.
