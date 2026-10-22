# Achola Odhiambo & Company Advocates

Production-ready static website for Achola Odhiambo & Company Advocates. The Insights section is a zero-cost static publishing system: Markdown articles are turned into an article index, individual shareable pages, social preview metadata and sitemap entries at build time. It requires no database, paid CMS or server-side runtime.

## Commands

```bash
npm run check
npm run build
vercel --prod --yes
```

## Publish an article

The simplest client workflow is through GitHub's website, so nothing needs to be installed:

1. Prepare a landscape JPG or PNG image, ideally `1200 × 630` pixels and below 1 MB.
2. In GitHub, open `site/assets/media`, choose **Add file → Upload files**, upload the image and commit it.
3. Open `content/ARTICLE_TEMPLATE.md`, copy its contents, then create a new file in `content/articles`.
4. Name the file with lowercase words and hyphens, for example `employment-records-to-preserve.md`. This filename becomes the permanent article URL.
5. Complete every field between the `---` lines, write the article below them, and commit to the production branch.
6. Vercel's Git integration rebuilds the website. The article will appear under `/insights` and its direct link will be `/insights/employment-records-to-preserve`.

Do not rename an article file after sharing its URL; that would change the link. To replace its preview image, keep the same image filename or update the article's `image` field and rebuild. WhatsApp may cache an older preview temporarily even after a deployment.

### Article fields

- `title`: headline shown on the page and in link previews.
- `description`: concise summary used by search engines and WhatsApp.
- `date`: publication date in `YYYY-MM-DD` format.
- `category`: practice area shown above the headline.
- `author`: article byline.
- `image`: a local image path beginning with `/assets/media/`.
- `imageAlt`: describes the image for people using assistive technology.

Run `npm run check` before publishing when editing locally. The check builds the site and rejects missing metadata, invalid dates, missing images and broken links.

## Visual asset notes (v4)
- Homepage hero uses a real, non-AI stock photograph fetched from Unsplash: Vitaly Gariev, photo `omGSZqBXkqY`, under the Unsplash License.
- The firm/advocate photography in the website uses the higher-resolution images supplied for Achola Odhiambo & Company Advocates, optimised to WebP for production delivery.
- Header and footer branding use custom vector wordmarks (black/gold and ivory/gold variants).
