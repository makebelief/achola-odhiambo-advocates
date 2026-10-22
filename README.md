# Achola Odhiambo & Company Advocates — Website

Static HTML/CSS/JavaScript website for Achola Odhiambo & Company Advocates, maintained for production delivery by Wakiliwa Tech. No CMS, server-side application, database, external JavaScript bundles, or runtime npm dependencies.

## Verify the project

Requires Node.js 22 or later:

```bash
npm test       # checks source, builds for sample domain, validates SEO/CSP, restores demo build
npm run build  # creates dist/
```

Edit **`site/`** for page content, photos and styles. `dist/` is generated deployment output; do not hand-edit `dist/` or the generated `dist/_headers` file.

## Cloudflare Pages — deploy from GitHub

1. Import `makebelief/achola-odhiambo-advocates` into **Cloudflare → Workers & Pages → Pages → Import repository**. Use a separate preview/security branch until approved; keep the Vercel site live meanwhile.
2. Set **Framework preset: None**, **Production branch: `main`**, **Build command: `npm run build`**, **Build output directory: `dist`**, **Root directory: leave blank (repository root)**, **Node.js: 22 or later**.
3. Once the purchased domain has been decided, set **`SITE_URL` = `https://YOUR-ACTUAL-DOMAIN`** in **Settings → Environment variables**, in the **production** (and ideally preview) build environment. Only an HTTPS origin is allowed, without a path or trailing query. Example: `https://example.co.ke`.
4. Deploy after setting `SITE_URL`. In **Custom domains**, attach the real domain and its DNS, enforce HTTPS, choose either `www` or apex as canonical, and **301-redirect the other host** to the chosen canonical host at the Cloudflare zone. Set `SITE_URL` to exactly that canonical host.
5. Check live `/`, `/about`, `/practice-areas`, `/managing-partner`, `/insights`, `/contact`, `/privacy`, `/terms`, `/legal-notice`, `/robots.txt`, `/sitemap.xml` and a nonexistent route (custom 404). Check canonical, Open Graph and CSP response headers on the real domain and test the WhatsApp flow on mobile and desktop.
6. When Cloudflare has been verified, redirect the old Vercel deployment/demo URL to the canonical domain, or disable the old deployment after confirming the new site works, to reduce duplicate indexing.
7. Submit `https://YOUR-ACTUAL-DOMAIN/sitemap.xml` to Google Search Console and request indexing; optionally set up a Bing Webmaster Tools profile. This is a post-domain SEO step; no sitemap submissions have been performed here.

Cloudflare Pages automatically serves `about.html` at `/about`; the standard `404.html` is used for unknown routes. `site/_headers` is the Cloudflare Pages security-header template: the build emits `dist/_headers` with SHA-256 hashes for each inline JSON-LD metadata block, so executable inline scripts remain blocked by the Content Security Policy.

**Search indexing protection:** Cloudflare preview branches, or a Cloudflare build without `SITE_URL`, receive `noindex` automatically. The final `main` build becomes indexable when the real `SITE_URL` is present. Do not bypass this gate by directly uploading the prebuilt `dist/` folder.

## WhatsApp / social link preview

Every content page contains **server-rendered Open Graph (OG)** and Twitter/X metadata. When a link is sent through WhatsApp, Facebook or LinkedIn, the receiving platform can fetch the site's **1200 × 630 JPEG** containing a 50/50 split: the law firm's wordmark on a dark background, and the managing partner's existing portrait. The file is `site/images/social-card-v2.jpg` (also copied into `dist/images/` by the build).

- The metadata uses an absolute `https://` URL and includes `og:image`, `og:image:secure_url`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:site_name`, and Twitter large-card image/alt tags. Image filename is versioned to avoid stale image caches.
- Setting `SITE_URL` to the new primary domain rewrites the image links for **every page** during `npm run build`, just like the canonical tags. For example, the new link preview URL will be `https://YOUR-ACTUAL-DOMAIN/images/social-card-v2.jpg`.
- After **deploying**, test on the real HTTPS domain. Open the image URL directly in a private window to check it returns the JPEG without requiring login; inspect HTML source on `/` and `/about` to confirm the image URL begins with the correct domain. Share the complete HTTPS link in WhatsApp to check actual platform rendering.
- **WhatsApp chooses its own preview layout and caches metadata.** Even correctly configured tags cannot guarantee a preview on every device or in every chat. If you previously shared the same URL, its old preview may remain cached; try a newly configured canonical domain or a temporary page-link query suffix such as `?share=2`, and allow the messaging app to refresh.
- The preview is created from original local brand assets; if the client changes the approved logo or portrait, optionally regenerate with `python3 scripts/generate_social_preview.py` (requires Python packages `Pillow` and `CairoSVG` for development only, never for Cloudflare).

## Built-in security and usability

- Static pages have no contact-form backend or stored personal data. The enquiry form opens WhatsApp only **after explicit consent**; the visitor reviews and sends the message there.
- No Google Analytics, advertising pixels or third-party JavaScript are included.
- Cloudflare CSP restricts scripts to local files and hashes of inline structured data, blocks framing and unexpected form posts; additional headers include `nosniff`, HSTS, referrer and permissions policies.
- Accessible skip links, keyboard focus styles, mobile-menu Escape behavior, collapsed contact-rail keyboard management, and reduced-motion preference support.
- Fast local WebP office/profile photography, intrinsic image dimensions, lazy-loaded below-the-fold photos and 24-hour revalidation for unversioned media.
- Some editorial/hero photos are still loaded from **Pexels and Unsplash**; if an image cannot load, the browser substitutes a local firm photo. These third-party image requests are disclosed in the privacy page. Original Pexels hero credit: Christina Morillo / Pexels photo 1181427. Confirm all photo rights and any credit requirements before launch.

## Final client-approval checks (not verifiable from source code)

Ask the law firm to verify **business name spelling, telephone/WhatsApp destination, office address, practice areas, admissions/practising details, court-work references, photos, copyright permission, website terms and privacy notice**. Do a live end-to-end WhatsApp test. Regulatory/professional claims must be confirmed by the client; automated code checks cannot validate them. If the client later wants confidential enquiries, use an authenticated, rate-limited, encrypted server-side system instead of WhatsApp URL prefilling.

No registrar/DNS changes, Cloudflare account deployment, real-domain performance audits, or Google Search Console ownership verification are performed by the source ZIP itself.
