import { AdminDisputeDetail, AdminDisputeListItem, AdminUserDetail, DisputeMessage } from '../models/marketplace.models';

const NOW = '2026-10-29T16:04:13.000Z';

const messages: DisputeMessage[] = [
  {
    id: 'msg-1',
    authorId: 'buyer-1',
    role: 'buyer',
    authorName: 'Minh Buyer',
    body: 'The delivered site is still the placeholder from phase 1. Please refund or finish the agreed pages.',
    at: '2026-10-28T04:10:00.000Z',
  },
  {
    id: 'msg-2',
    authorId: 'seller-1',
    role: 'seller',
    authorName: 'Ngô Vũ Tuấn Anh',
    body: 'Phase 2 was scoped separately. The $199 order covers the ops agent, not the extra pages.',
    at: '2026-10-28T09:40:00.000Z',
  },
];

const list: AdminDisputeListItem[] = [
  {
    id: 'ord-open-1',
    productId: 'prod-ops',
    productName: 'OpenClaw Ops Agent',
    buyerId: 'buyer-1',
    buyerName: 'Minh Buyer',
    sellerId: 'user-tuan',
    sellerName: 'Ngô Vũ Tuấn Anh',
    amount: 199,
    currency: 'USD',
    sellerNet: 159.2,
    payoutHeld: true,
    disputeStatus: 'open',
    disputeReason: 'Delivered workspace does not match the listing.',
    disputeOpenedAt: '2026-10-28T04:00:00.000Z',
    disputeResolvedAt: null,
  },
  {
    id: 'ord-buyer-1',
    productName: 'Brand Web Rebuild',
    buyerId: 'buyer-2',
    buyerName: 'Lan Buyer',
    sellerId: 'seller-2',
    sellerName: 'Studio Bắc',
    amount: 2,
    currency: 'USD',
    sellerNet: 1.6,
    payoutHeld: false,
    disputeOutcome: 'buyer_full',
    disputeStatus: 'buyer_win',
    disputeReason: 'Phase 3 was missing and the fix was never deployed.',
    disputeOpenedAt: '2026-10-12T03:09:00.000Z',
    disputeResolvedAt: '2026-10-14T02:00:00.000Z',
  },
  {
    id: 'ord-seller-1',
    productName: 'Brand Web Rebuild',
    buyerId: 'buyer-3',
    buyerName: 'Hà Buyer',
    sellerId: 'seller-2',
    sellerName: 'Studio Bắc',
    amount: 2,
    currency: 'USD',
    sellerNet: 1.6,
    payoutHeld: false,
    disputeOutcome: 'seller',
    disputeStatus: 'seller_win',
    disputeReason: 'Phase 2 matches the brief that was accepted.',
    disputeOpenedAt: '2026-10-12T04:59:00.000Z',
    disputeResolvedAt: '2026-10-13T08:00:00.000Z',
  },
  {
    id: 'ord-split-1',
    productName: 'Kimi K3 Chat',
    buyerId: 'buyer-1',
    buyerName: 'Minh Buyer',
    sellerId: 'user-tuan',
    sellerName: 'Ngô Vũ Tuấn Anh',
    amount: 29,
    currency: 'USD',
    sellerNet: 23.2,
    payoutHeld: false,
    disputeOutcome: 'split',
    disputeStatus: 'split',
    disputeReason: 'Half the prepaid credits were never issued.',
    disputeOpenedAt: '2026-10-20T02:15:00.000Z',
    disputeResolvedAt: '2026-10-21T06:00:00.000Z',
  },
];

function detail(id: string): AdminDisputeDetail | null {
  const row = list.find((item) => item.id === id);
  if (!row) return null;
  const open = row.disputeStatus === 'open';
  const refund = open ? 0 : row.disputeOutcome === 'seller' ? 0 : row.disputeOutcome === 'split' ? 14.5 : row.amount;
  return {
    id: row.id,
    productId: row.productId || 'prod-1',
    productName: row.productName,
    buyerName: row.buyerName,
    sellerId: row.sellerId,
    amount: row.amount,
    currency: row.currency,
    sellerNet: row.sellerNet,
    platformFee: Math.round((row.amount - row.sellerNet) * 100) / 100,
    status: open || row.disputeStatus === 'seller_win' ? 'paid' : 'refunded',
    provider: 'wallet',
    createdAt: '2026-10-20T08:00:00.000Z',
    payoutHeld: !!row.payoutHeld,
    disputeStatus: row.disputeStatus,
    disputeReason: row.disputeReason,
    disputeOpenedAt: row.disputeOpenedAt,
    disputeResolvedAt: row.disputeResolvedAt || null,
    disputeOutcome: row.disputeOutcome || '',
    disputeResolutionNote: open ? '' : 'Reviewed the delivery against the listing and the message thread.',
    buyer: {
      id: row.buyerId || 'buyer-1',
      name: row.buyerName,
      email: 'minh.buyer@example.com',
      href: `/admin/users/${row.buyerId || 'buyer-1'}`,
    },
    seller: {
      id: row.sellerId || 'user-tuan',
      name: row.sellerName || '',
      email: 'ngovutuananh@gmail.com',
      creatorSlug: 'ngo-vu-tuan-anh',
      href: `/admin/users/${row.sellerId || 'user-tuan'}`,
      shopHref: '/store/ngo-vu-tuan-anh',
    },
    product: {
      id: row.productId || 'prod-1',
      name: row.productName,
      slug: 'openclaw-ops-agent',
      href: '/product/openclaw-ops-agent',
      adminHref: `/admin/products/${row.productId || 'prod-1'}`,
    },
    orderHref: `/orders/${row.id}`,
    amounts: {
      gross: row.amount,
      currency: row.currency,
      sellerNet: row.sellerNet,
      held: row.payoutHeld ? row.sellerNet : 0,
      payoutHeld: !!row.payoutHeld,
      refund,
      sellerKept: Math.max(0, row.sellerNet - refund),
    },
    evidenceUrls: open ? ['https://example.com/evidence/deploy-log.txt'] : [],
    outcome: row.disputeOutcome || '',
    resolutionNote: open ? '' : 'Reviewed the delivery against the listing and the message thread.',
    messages: row.id === 'ord-open-1' ? messages.slice() : [],
    timeline: [
      { at: row.disputeOpenedAt, action: 'opened', actorRole: 'buyer', note: row.disputeReason },
      ...(open ? [] : [{ at: row.disputeResolvedAt || NOW, action: 'resolved', actorRole: 'admin', note: row.disputeOutcome || '' }]),
    ],
    complaint: null,
    audit: open
      ? []
      : [{
          id: `audit-${row.id}`,
          action: 'dispute.resolve',
          reason: 'Reviewed the delivery against the listing and the message thread.',
          actorId: 'preview-admin',
          createdAt: row.disputeResolvedAt || NOW,
        }],
  } as AdminDisputeDetail;
}

const user: AdminUserDetail = {
  id: 'user-tuan',
  email: 'ngovutuananh@gmail.com',
  name: 'Ngô Vũ Tuấn Anh',
  role: 'seller',
  creatorSlug: 'ngo-vu-tuan-anh',
  avatarUrl: '',
  accountStatus: 'active',
  statusReason: '',
  createdAt: NOW,
  productCount: 2,
  orderCount: 3,
  phone: { number: '0901 234 567', source: 'shop', verified: null },
  wallet: { currency: 'USD', balance: 248.4, held: 159.2, available: 89.2 },
  kyc: { status: 'verified', subjectType: 'individual', fullName: 'Ngô Vũ Tuấn Anh', reviewedAt: '2026-10-20T03:12:00.000Z' },
  lastLoginAt: '2026-10-31T13:40:00.000Z',
  links: { admin: '/admin/users/user-tuan', shop: '/store/ngo-vu-tuan-anh' },
  licenses: [
    { id: 'lic-1', licenseKeyMasked: '••••4410', productName: 'OpenClaw Ops Agent', side: 'seller', status: 'active', expiresAt: '2027-10-20T00:00:00.000Z' },
  ],
  recentOrders: [
    { id: 'ord-open-1', productName: 'OpenClaw Ops Agent', amount: 199, currency: 'USD', status: 'paid', side: 'seller', createdAt: '2026-10-20T08:00:00.000Z', disputeStatus: 'open' },
    { id: 'ord-split-1', productName: 'Kimi K3 Chat', amount: 29, currency: 'USD', status: 'refunded', side: 'seller', createdAt: '2026-10-18T08:00:00.000Z', disputeStatus: 'split' },
  ],
  products: [
    { id: 'prod-ops', name: 'OpenClaw Ops Agent', slug: 'openclaw-ops-agent', published: true, moderationStatus: 'active', salesCount: 4 },
    { id: 'prod-kimi', name: 'Kimi K3 Chat', slug: 'kimi-k3-chat', published: true, moderationStatus: 'active', salesCount: 12 },
  ],
  disputes: [
    { id: 'ord-open-1', productName: 'OpenClaw Ops Agent', amount: 199, currency: 'USD', disputeStatus: 'open', disputeOutcome: '', side: 'seller', disputeOpenedAt: '2026-10-28T04:00:00.000Z' },
    { id: 'ord-split-1', productName: 'Kimi K3 Chat', amount: 29, currency: 'USD', disputeStatus: 'split', disputeOutcome: 'split', side: 'seller', disputeOpenedAt: '2026-10-20T02:15:00.000Z' },
  ],
  affiliate: { code: 'TUANANH', clicks: 128, conversions: 6, earnings: 42.5, pitStatus: 'none', pitYear: null },
};

function filtered(params: URLSearchParams) {
  const status = params.get('status') || '';
  const q = (params.get('q') || '').toLowerCase();
  const page = Math.max(1, Number(params.get('page') || 1));
  const limit = Math.max(1, Number(params.get('limit') || 20));
  let items = list.slice();
  if (status === 'open') items = items.filter((row) => row.disputeStatus === 'open');
  if (status === 'resolved') items = items.filter((row) => row.disputeStatus !== 'open');
  if (q) {
    items = items.filter((row) => `${row.productName} ${row.buyerName} ${row.sellerName} ${row.id} ${row.disputeReason}`.toLowerCase().includes(q));
  }
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    pages,
    openCount: list.filter((row) => row.disputeStatus === 'open').length,
  };
}

/** Mock responses for the admin user / dispute screens. Returns null when the route is unrelated. */
export function mockAdminCommerce(method: string, path: string, params: URLSearchParams, body: unknown): unknown | undefined {
  if (method === 'GET' && path === '/admin/users/user-tuan') return user;
  if (method === 'PATCH' && path === '/admin/users/user-tuan/status') {
    const patch = body as { status?: AdminUserDetail['accountStatus']; reason?: string };
    return { ...user, accountStatus: patch.status || user.accountStatus, statusReason: patch.reason || '' };
  }
  if (method === 'GET' && path === '/admin/disputes') return filtered(params);
  const decision = path.match(/^\/admin\/disputes\/([^/]+)\/decision$/);
  if (decision && method === 'POST') {
    const id = decodeURIComponent(decision[1]);
    const row = list.find((item) => item.id === id);
    if (!row) return { status: 404, body: { message: 'Not found' } };
    const payload = body as { resolution?: string; note?: string; reason?: string; refundAmount?: number };
    const note = String(payload.note || payload.reason || '');
    if (payload.resolution === 'split') {
      row.disputeStatus = 'split';
      row.disputeOutcome = 'split';
    } else if (payload.resolution === 'buyer') {
      row.disputeStatus = 'buyer_win';
      row.disputeOutcome = payload.refundAmount != null && payload.refundAmount < row.amount ? 'buyer_partial' : 'buyer_full';
    } else {
      row.disputeStatus = 'seller_win';
      row.disputeOutcome = 'seller';
    }
    row.payoutHeld = false;
    row.disputeResolvedAt = new Date().toISOString();
    row.disputeResolutionNote = note;
    messages.push({
      id: `msg-${Date.now()}`,
      authorId: 'preview-admin',
      role: 'admin',
      authorName: 'AI Markets (Admin)',
      kind: 'decision',
      outcome: row.disputeOutcome,
      body: note,
      at: row.disputeResolvedAt,
    });
    return detail(id);
  }
  const dispute = path.match(/^\/admin\/disputes\/([^/]+)$/);
  if (dispute && method === 'GET') return detail(decodeURIComponent(dispute[1]));
  const adminMsg = path.match(/^\/admin\/disputes\/([^/]+)\/messages$/);
  if (adminMsg && method === 'POST') {
    const text = String((body as { body?: string })?.body || '');
    messages.push({
      id: `msg-${Date.now()}`,
      authorId: 'preview-admin',
      role: 'admin',
      authorName: 'AI Markets (Admin)',
      kind: 'message',
      body: text,
      at: new Date().toISOString(),
    });
    return detail(decodeURIComponent(adminMsg[1]));
  }
  const orderDispute = path.match(/^\/orders\/([^/]+)\/dispute$/);
  if (orderDispute && method === 'GET') return detail(decodeURIComponent(orderDispute[1]));
  const thread = path.match(/^\/orders\/([^/]+)\/dispute\/messages$/);
  if (thread && method === 'POST') {
    const text = String((body as { body?: string })?.body || '');
    messages.push({
      id: `msg-${Date.now()}`,
      authorId: 'buyer-1',
      role: 'buyer',
      authorName: 'Minh Buyer',
      kind: 'message',
      body: text,
      at: new Date().toISOString(),
    });
    return detail(decodeURIComponent(thread[1]));
  }
  if (method === 'GET' && path === '/orders/disputes') {
    return list.map((row) => ({ id: row.id, disputeStatus: row.disputeStatus }));
  }
  if (method === 'GET' && path === '/orders/ord-open-1/invoice') {
    return {
      order: { id: 'ord-open-1', productName: 'OpenClaw Ops Agent', amount: 199, currency: 'USD', status: 'paid', createdAt: '2026-10-20T08:00:00.000Z' },
      invoice: null,
      prefill: {},
      hasSavedProfile: false,
    };
  }
  return undefined;
}
