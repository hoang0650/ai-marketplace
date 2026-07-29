import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'marketplace/:category', renderMode: RenderMode.Server },
  { path: 'product/:slug', renderMode: RenderMode.Server },
  { path: 'store/:creatorSlug', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Server },
];
