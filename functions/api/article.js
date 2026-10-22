import { serveArticle } from '../_shared/article.js';

export function onRequestGet({ request, env }) {
  return serveArticle(request, env, new URL(request.url).searchParams.get('slug'));
}
