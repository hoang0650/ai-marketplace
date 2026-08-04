import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, delay, switchMap, from } from 'rxjs';
import { MockDataStore } from '../services/mock-data.store';
import { environment } from '../../environments/environment';

function jsonOk<T>(body: T, status = 200) {
  return of(new HttpResponse({ status, body })).pipe(delay(120));
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const store = inject(MockDataStore);
  const path = req.url.replace(environment.apiUrl, '').split('?')[0];
  const params = new URL(req.url, 'http://local').searchParams;

  return from(store.ready()).pipe(
    switchMap(() => {
      if (req.method === 'GET' && path === '/products') {
        return jsonOk(store.listProducts({
          category: params.get('category') || undefined,
          q: params.get('q') || undefined,
          featured: params.get('featured') === 'true' ? true : undefined,
          creatorSlug: params.get('creatorSlug') || undefined,
        }));
      }
      if (req.method === 'GET' && path.startsWith('/products/')) {
        const slug = path.split('/')[2];
        const product = store.getProductBySlug(slug);
        return product ? jsonOk(product) : jsonOk({ message: 'Not found' }, 404);
      }
      if (req.method === 'GET' && path === '/categories') {
        return jsonOk(store.categories());
      }
      if (req.method === 'GET' && path === '/creators') {
        return jsonOk(store.creators());
      }
      if (req.method === 'GET' && path.startsWith('/creators/')) {
        const slug = path.split('/')[2];
        const creator = store.getCreatorBySlug(slug);
        return creator ? jsonOk(creator) : jsonOk({ message: 'Not found' }, 404);
      }
      if (req.method === 'GET' && path.startsWith('/reviews')) {
        const productId = params.get('productId') || undefined;
        return jsonOk(store.reviews(productId));
      }
      if (req.method === 'POST' && path === '/reviews') {
        return jsonOk(store.addReview(req.body as never));
      }
      if (req.method === 'GET' && path === '/orders') {
        return jsonOk(store.orders());
      }
      if (req.method === 'GET' && path === '/wallet') {
        return jsonOk(store.wallet());
      }
      if (req.method === 'POST' && path === '/wallet/withdraw') {
        return jsonOk(store.withdraw((req.body as { amount: number }).amount));
      }
      if (req.method === 'POST' && path === '/wallet/deposit') {
        return jsonOk(store.deposit((req.body as { amount: number }).amount));
      }
      if (req.method === 'GET' && path === '/usage') {
        return jsonOk(store.usage());
      }
      if (req.method === 'GET' && path === '/dashboard/summary') {
        return jsonOk(store.dashboard());
      }
      if (req.method === 'GET' && path === '/notifications') {
        return jsonOk(store.notifications());
      }
      if (req.method === 'POST' && path === '/notifications/read-all') {
        return jsonOk(store.markNotificationsRead());
      }
      if (req.method === 'GET' && path === '/affiliate') {
        return jsonOk(store.affiliate());
      }
      if (req.method === 'GET' && path === '/wishlist') {
        return jsonOk(store.wishlist());
      }
      if (req.method === 'POST' && path === '/wishlist/toggle') {
        return jsonOk(store.toggleWishlist((req.body as { productId: string }).productId));
      }
      if (req.method === 'POST' && path === '/auth/login') {
        const body = req.body as { email: string; password: string };
        const user = store.login(body.email, body.password);
        return user
          ? jsonOk({ token: `mock.${user.id}`, user })
          : jsonOk({ message: 'Invalid credentials' }, 401);
      }
      if (req.method === 'POST' && path === '/auth/register') {
        const body = req.body as { email: string; name: string; password: string; asCreator?: boolean };
        const user = store.register(body);
        return jsonOk({ token: `mock.${user.id}`, user });
      }
      if (req.method === 'GET' && path === '/auth/me') {
        const auth = req.headers.get('Authorization') || '';
        const id = auth.replace('Bearer mock.', '');
        const user = store.getUser(id);
        return user ? jsonOk(user) : jsonOk({ message: 'Unauthorized' }, 401);
      }
      if (req.method === 'PATCH' && path === '/auth/me') {
        const auth = req.headers.get('Authorization') || '';
        const id = auth.replace('Bearer mock.', '');
        const user = store.updateUser(id, req.body as {
          name?: string;
          bio?: string;
          avatarUrl?: string;
          coverUrl?: string;
        });
        return user ? jsonOk(user) : jsonOk({ message: 'Unauthorized' }, 401);
      }
      if (req.method === 'POST' && path === '/openclaw/launch') {
        return jsonOk({
          success: false,
          message: 'Configure OpenClaw env (AI_URL / OPENCLAW_GATEWAY_*) to launch gateway.',
        });
      }
      if (req.method === 'GET' && path === '/admin/overview') {
        return jsonOk(store.adminOverview());
      }
      if (req.method === 'POST' && path === '/billing/checkout') {
        return jsonOk({
          checkoutId: `chk_${Date.now()}`,
          provider: (req.body as { provider: string }).provider,
          status: 'created',
        });
      }
      if (req.method === 'POST' && path === '/products') {
        return jsonOk(store.upsertProduct(req.body as never));
      }
      if (req.method === 'PUT' && path.startsWith('/products/')) {
        return jsonOk(store.upsertProduct({ ...(req.body as object), id: path.split('/')[2] } as never));
      }
      if (req.method === 'DELETE' && path.startsWith('/products/')) {
        store.deleteProduct(path.split('/')[2]);
        return jsonOk({ ok: true });
      }

      return jsonOk({ message: `Mock route missing: ${req.method} ${path}` }, 404);
    }),
  );
};
