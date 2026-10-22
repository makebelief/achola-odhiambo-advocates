import { serveArticle } from '../_shared/article.js';

export function onRequestGet({ request, env, params }) {
  return serveArticle(request, env, params.slug);
}
