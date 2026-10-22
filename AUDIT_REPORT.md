# Production readiness audit — 22 October 2026

Scope: source ZIP for **Achola Odhiambo & Company Advocates**. This is a code and offline-build assessment, **not** a live penetration test or legal certification.

## Improvements delivered

| Area | Status and action |
| --- | --- |
| Static deployment | Cloudflare Pages-compatible `npm run build` emits extensionless-route HTML, custom 404 and `_headers`; no server-side dependency. |
| HTTP security | Cloudflare CSP restricts scripts, media and framing; hash-based JSON-LD exceptions; HSTS, `nosniff`, permissions, referrer, opener and cache headers. Vercel fallback policy improved too. |
| SEO | Individual page descriptions, title/social metadata, `LegalService` + `WebPage` structured data, sitemap/robots/canonical URL rewrite using single `SITE_URL` build variable. |
| Indexing | Cloudflare previews and production builds without `SITE_URL` are marked `noindex`; final canonical domain is indexable after configuration. Error pages are noindex. |
| Forms and privacy | WhatsApp remains the only enquiry mechanism (no website-side message storage). Consent checkbox, maximum field lengths, client-side whitespace/control-character sanitizing, clear warning about sensitive facts and external service, improved privacy text. |
| Access and mobile | Keyboard Escape/outside-click navigation handling, contact-rail disclosure state and tab-order fix, focus indication, responsive checks with no horizontal overflow at tested widths. |
| Images/performance | Intrinsic image dimensions, lazy loading for secondary photos, local fallback for stock-CDN failures, correctly revalidating unversioned assets instead of one-year immutable caching. |
| Change control | Added `npm test`, build integrity tests and GitHub Actions quality checks; existing `site/` design and route structure preserved. |
| Social link preview | Redesigned 1200×630 share card with the real firm wordmark and advocate portrait in a 50/50 composition; added explicit Open Graph image dimensions, JPEG type, alt text and domain-aware preview links for WhatsApp/Facebook/LinkedIn/Twitter. |

## Tests completed

- `npm test` succeeded (source checks, domain switching, valid JSON-LD, security hash coverage, robots/sitemap, invalid `http://` rejection).
- `npm run build` succeeded with Node.js 22.
- Open Graph preview tests passed for all 13 HTML pages and custom domain replacement, with a valid optimized JPEG under 500 KB.
- JavaScript syntax check succeeded.
- Offline rendered desktop/mobile screenshots showed no horizontal overflow. Mobile menu opened and closed with Escape. Contact consent requirement was checked.
- No application runtime dependencies or credentials were found in the supplied source files. This does **not** rule out issues in hosting-account settings or third-party services.

## Operational checks still required

1. **Real domain / Cloudflare**: connect the purchased domain, choose canonical apex or `www`, set Cloudflare `SITE_URL=https://chosen-domain` and rebuild, confirm HTTPS/DNS, CSP, 404 route and canonical redirects.
2. **Contact destination**: call and test WhatsApp number `+254112572628` with the client to confirm ownership and actual delivery.
3. **Professional claims and legal text**: obtain client approval for firm name, practitioner admission/practising number, scope of work, address, legal terms, photo rights and privacy notice. Do not treat source-copy claims as independently verified.
4. **Live QA**: manually verify on at least one real mobile device and desktop browser, confirm network-loaded photographs, keyboard navigation, and check performance/SEO via Search Console and PageSpeed Insights after the custom domain exists.
5. **WhatsApp previews**: test actual messages against the final HTTPS domain. Meta previews are cached by third-party apps, and display cannot be guaranteed or forced by the website.
6. **Cutover**: redirect or disable the old Vercel demo only **after** Cloudflare is verified, and then submit the final sitemap to search engines.

External Pexels/Unsplash photography is retained for visual continuity and is served by third-party CDNs, with local-photo fallbacks if images fail. These resources and any use/attribution rights should be reviewed by the client. No platform account was accessed or domain changed as part of this code package.
