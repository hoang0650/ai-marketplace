import { AdminDisputeDetail, AdminDisputeListItem, AdminUserDetail, DisputeMessage } from '../models/marketplace.models';

const NOW = '2026-10-29T16:04:13.000Z';

const messages: DisputeMessage[] = [
  {
    id: 'msg-1',
    authorId: 'buyer-1',
    role: 'buyer',
    authorName: 'Minh Buyer',
    body: 'The delivered site is still the placeholder from phase 1. Please refund or finish the agreed pages.',
    createdAt: '2026-10-28T04:10:00.000Z',
  },
  {
    id: 'msg-2',
    authorId: 'seller-1',
    role: 'seller',
    authorName: 'Ngô Vũ Tuấn Anh',
    body: 'Phase 2 was scoped separately. The $199 order covers the ops agent, not the extra pages.',
    createdAt: '2026-10-28T09:40:00.000Z',
  },
];

const list: AdminDisputeListItem[] = [
  {
    id: 'ord-open-1',
    productId: 'prod-ops',
    productName: 'OpenClaw Ops Agent',
    productSlug: 'openclaw-ops-agent',
    buyerId: 'buyer-1',
    buyerName: 'Minh Buyer',
    sellerId: 'user-tuan',
    sellerName: 'Ngô Vũ Tuấn Anh',
    amount: 199,
    currency: 'USD',
    sellerNet: 159.2,
    held: 159.2,
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
    held: 0,
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
    held: 0,
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
    held: 0,
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
  return {
    id: row.id,
    disputeStatus: row.disputeStatus,
    currency: row.currency,
    amount: row.amount,
    sellerNet: row.sellerNet,
    platformFee: Math.round((row.amount - row.sellerNet) * 100) / 100,
    held: row.held ?? 0,
    refunded: open ? null : row.disputeStatus === 'seller_win' ? 0 : row.disputeStatus === 'split' ? 14.5 : row.amount,
    order: {
      id: row.id,
      status: open ? 'paid' : row.disputeStatus === 'seller_win' ? 'paid' : 'refunded',
      amount: row.amount,
      currency: row.currency,
      sellerNet: row.sellerNet,
      platformFee: Math.round((row.amount - row.sellerNet) * 100) / 100,
      createdAt: '2026-10-20T08:00:00.000Z',
      payoutHeld: open,
    },
    product: { id: row.productId || 'prod-1', name: row.productName, slug: row.productSlug || 'brand-web-rebuild' },
    buyer: { id: row.buyerId || 'buyer-1', name: row.buyerName, email: 'minh.buyer@example.com' },
    seller: {
      id: row.sellerId || 'user-tuan',
      name: row.sellerName,
      email: 'ngovutuananh@gmail.com',
      creatorSlug: 'ngo-vu-tuan-anh',
    },
    claim: { reason: row.disputeReason, openedAt: row.disputeOpenedAt, openedBy: 'buyer' },
    evidence: open
      ? [{ id: 'ev-1', url: 'https://example.com/evidence/deploy-log.txt', name: 'deploy-log.txt', note: 'Log shows the workspace never left maintenance mode.', createdAt: row.disputeOpenedAt }]
      : [],
    timeline: [
      { at: row.disputeOpenedAt || NOW, action: 'opened', actorRole: 'buyer', note: row.disputeReason },
      ...(open ? [] : [{ at: row.disputeResolvedAt || NOW, action: 'resolved', actorRole: 'admin', note: 'Decision recorded.' }]),
    ],
    outcome: open
      ? null
      : {
          resolution: row.disputeStatus,
          reason: 'Reviewed the delivery against the listing and the message thread.',
          refundAmount: row.disputeStatus === 'seller_win' ? 0 : row.disputeStatus === 'split' ? 14.5 : row.amount,
          resolvedAt: row.disputeResolvedAt,
          resolvedByName: 'AI Markets (Admin)',
        },
    auditLog: [
      { at: row.disputeOpenedAt || NOW, action: 'dispute.opened', actorRole: 'buyer', actorName: row.buyerName, note: row.disputeReason },
      ...(open ? [] : [{ at: row.disputeResolvedAt || NOW, action: 'dispute.resolved', actorRole: 'admin', actorName: 'AI Markets (Admin)', note: row.disputeStatus }]),
    ],
    messages: row.id === 'ord-open-1' ? messages : [],
  };
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
  phone: { number: '0901 234 567', source: 'shop' },
  wallet: { currency: 'USD', balance: 248.4, held: 159.2, available: 89.2 },
  kyc: { status: 'verified', subjectType: 'individual', fullName: 'Ngô Vũ Tuấn Anh', verifiedAt: '2026-10-20T03:12:00.000Z' },
  lastLogin: { at: '2026-10-31T13:40:00.000Z', ip: '113.22.10.18' },
  licenses: [
    { id: 'lic-1', licenseKey: 'AIM-OPS-9F2C-4410', productName: 'OpenClaw Ops Agent', orderId: 'ord-open-1', status: 'active', expiresAt: '2027-10-20T00:00:00.000Z' },
  ],
  recentOrders: [
    { id: 'ord-open-1', productName: 'OpenClaw Ops Agent', amount: 199, currency: 'USD', status: 'paid', role: 'seller', createdAt: '2026-10-20T08:00:00.000Z', disputeStatus: 'open' },
    { id: 'ord-split-1', productName: 'Kimi K3 Chat', amount: 29, currency: 'USD', status: 'refunded', role: 'seller', createdAt: '2026-10-18T08:00:00.000Z', disputeStatus: 'split' },
  ],
  products: [
    { id: 'prod-ops', name: 'OpenClaw Ops Agent', slug: 'openclaw-ops-agent', published: true, moderationStatus: 'active', salesCount: 4 },
    { id: 'prod-kimi', name: 'Kimi K3 Chat', slug: 'kimi-k3-chat', published: true, moderationStatus: 'active', salesCount: 12 },
  ],
  disputes: [
    { id: 'ord-open-1', productName: 'OpenClaw Ops Agent', amount: 199, currency: 'USD', disputeStatus: 'open', disputeOpenedAt: '2026-10-28T04:00:00.000Z', disputeReason: 'Delivered workspace does not match the listing.' },
    { id: 'ord-split-1', productName: 'Kimi K3 Chat', amount: 29, currency: 'USD', disputeStatus: 'split', disputeOpenedAt: '2026-10-20T02:15:00.000Z', disputeReason: 'Half the prepaid credits were never issued.' },
  ],
  affiliate: { code: 'TUANANH', clicks: 128, conversions: 6, earnings: 42.5, currency: 'USD', orders: 6 },
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
  const dispute = path.match(/^\/admin\/disputes\/([^/]+)$/);
  if (dispute && method === 'GET') return detail(decodeURIComponent(dispute[1]));
  if (dispute && method === 'PATCH') {
    const id = decodeURIComponent(dispute[1]);
    const row = list.find((item) => item.id === id);
    if (!row) return { status: 404, body: { message: 'Not found' } };
    const decision = body as { resolution?: string; reason?: string };
    row.disputeStatus = decision.resolution || row.disputeStatus;
    row.held = 0;
    row.disputeResolvedAt = new Date().toISOString();
    row.disputeReason = decision.reason || row.disputeReason;
    return detail(id);
  }
  const adminMsg = path.match(/^\/admin\/disputes\/([^/]+)\/messages$/);
  if (adminMsg && method === 'POST') {
    const text = String((body as { body?: string })?.body || '');
    const message: DisputeMessage = {
      id: `msg-${Date.now()}`,
      authorId: 'preview-admin',
      role: 'admin',
      authorName: 'AI Markets Admin',
      body: text,
      createdAt: new Date().toISOString(),
    };
    messages.push(message);
    return message;
  }
  const thread = path.match(/^\/orders\/([^/]+)\/dispute\/messages$/);
  if (thread && method === 'GET') {
    return decodeURIComponent(thread[1]) === 'ord-open-1' ? { messages: messages.slice() } : { messages: [] };
  }
  if (thread && method === 'POST') {
    const text = String((body as { body?: string })?.body || '');
    const message: DisputeMessage = {
      id: `msg-${Date.now()}`,
      authorId: 'buyer-1',
      role: 'buyer',
      authorName: 'Minh Buyer',
      body: text,
      createdAt: new Date().toISOString(),
    };
    messages.push(message);
    return message;
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
