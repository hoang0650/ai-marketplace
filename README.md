# AI Markets

Production-oriented Angular 20 frontend for an AI marketplace: RunPod-style modalities (text-to-text, text-to-video, image-to-video, text-to-image, image-to-image) plus hire talent (agent, marketing, SEO, creator).

## Stack

- Angular 20 (standalone, signals, SSR)
- Tailwind CSS + SCSS design tokens
- Angular Material / CDK (virtual scroll ready)
- Real backend by default: [`ai-marketplace-api`](../ai-marketplace-api) (`environment.useMockApi: false`)
- Optional mock API via HTTP interceptor (`/api/*`) backed by `src/assets/mock/marketplace.json` — set `useMockApi: true` for offline demo

## Quick start

```bash
cd ai-marketplace
npm install
npm start
```

Open `http://localhost:4200`.

SSR build:

```bash
npm run build
npm run serve:ssr:ai-marketplace
```

## Demo accounts

| Email | Role | Store |
|-------|------|-------|
| `buyer@example.com` | buyer | — |
| `nova@creators.dev` | seller | `/store/nova-labs` |
| `orbit@creators.dev` | seller | `/store/orbit-ai` |
| `pulse@creators.dev` | seller | `/store/pulse-studio` |
| `admin@phaimarket.com` | admin | — |

Any password works against the mock auth API. Sellers publish products with a **RunPod modality** (`text-to-text`, `text-to-video`, `image-to-video`, `text-to-image`, `image-to-image`) from **Dashboard → Products**.

## Multi-tenant

- Path-based creator stores: `/store/{creatorSlug}`
- Subdomain style (`creator.marketplace.ai`) is documented for future DNS; local UX uses path routing.

## Swap to a real API

Set `environment.apiUrl` to your Nest/backend origin and remove or disable `mockApiInterceptor` in `app.config.ts`.
