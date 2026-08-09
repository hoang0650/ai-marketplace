import { Routes } from '@angular/router';
import { authGuard, creatorGuard, adminGuard } from './guards/auth.guards';

export const routes: Routes = [
  {
    path: 'work',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/work/work-shell.component').then((m) => m.WorkShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/work/work-dashboard.component').then((m) => m.WorkDashboardComponent),
      },
      {
        path: 'profile',
        data: { page: 'profile' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'saved',
        data: { page: 'saved' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'job-profile',
        data: { page: 'job-profile' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'post',
        data: { page: 'post' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'org',
        data: { page: 'org' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'services',
        data: { page: 'services' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'contests',
        data: { page: 'contests' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'contracts',
        data: { page: 'contracts' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'disputes',
        data: { page: 'disputes' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'withdraw',
        data: { page: 'withdraw' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
    ],
  },
  {
    path: 'sell',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/sell/sell-shell.component').then((m) => m.SellShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/sell/sell-overview.component').then((m) => m.SellOverviewComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/sell/sell-profile.component').then((m) => m.SellProfileComponent),
      },
      {
        path: 'images',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellImagesComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellProductsComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellOrdersComponent),
      },
      {
        path: 'complaints',
        data: { page: 'complaints' },
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellPlaceholderComponent),
      },
      {
        path: 'coupons',
        data: { page: 'coupons' },
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellPlaceholderComponent),
      },
      {
        path: 'payment',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellPaymentComponent),
      },
      {
        path: 'withdraw',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellWithdrawComponent),
      },
      {
        path: 'ledger',
        data: { page: 'ledger' },
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellPlaceholderComponent),
      },
      {
        path: 'integrate',
        data: { page: 'integrate' },
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellPlaceholderComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/landing/landing.component').then((m) => m.LandingComponent),
      },
      {
        path: 'marketplace',
        loadComponent: () =>
          import('./features/marketplace/marketplace.component').then((m) => m.MarketplaceComponent),
      },
      {
        path: 'models',
        loadComponent: () =>
          import('./features/deploy/deploy.components').then((m) => m.ModelsHubComponent),
      },
      {
        path: 'agent-browser',
        loadComponent: () =>
          import('./features/deploy/deploy.components').then((m) => m.AgentBrowserComponent),
      },
      {
        path: 'deploy/:slug',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/deploy/deploy.components').then((m) => m.DeployWizardComponent),
      },
      {
        path: 'deployments',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/deploy/deploy.components').then((m) => m.MyDeploymentsComponent),
      },
      {
        path: 'marketplace/:category',
        loadComponent: () =>
          import('./features/marketplace/marketplace.component').then((m) => m.MarketplaceComponent),
      },
      {
        path: 'product/:slug',
        loadComponent: () =>
          import('./features/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'text-to-text',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'text-to-text', title: 'Text to Text' },
      },
      {
        path: 'text-to-video',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'text-to-video', title: 'Text to Video' },
      },
      {
        path: 'image-to-video',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'image-to-video', title: 'Image to Video' },
      },
      {
        path: 'text-to-image',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'text-to-image', title: 'Text to Image' },
      },
      {
        path: 'image-to-image',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'image-to-image', title: 'Image to Image' },
      },
      {
        path: 'fine-tune',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'fine-tune', title: 'Fine-tune' },
      },
      {
        path: 'dataset',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'dataset', title: 'Dataset' },
      },
      {
        path: 'inference',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'inference', title: 'Inference' },
      },
      {
        path: 'hire-agent',
        loadComponent: () =>
          import('./features/agents/agents.components').then((m) => m.MyAgentsComponent),
      },
      {
        path: 'hire-agent/marketplace',
        loadComponent: () =>
          import('./features/agents/agents.components').then((m) => m.AgentMarketplaceComponent),
      },
      {
        path: 'hire-agent/:agentId/setup',
        loadComponent: () =>
          import('./features/agents/setup-wizard.component').then((m) => m.OpenClawSetupWizardComponent),
      },
      {
        path: 'hire-agent/:agentId',
        loadComponent: () =>
          import('./features/agents/agents.components').then((m) => m.AgentDetailComponent),
      },
      {
        path: 'hire-marketing',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'hire-marketing', title: 'Hire Marketing' },
      },
      {
        path: 'hire-seo',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'hire-seo', title: 'Hire SEO' },
      },
      {
        path: 'hire-creator',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'hire-creator', title: 'Hire Creator' },
      },
      {
        path: 'hire-workflow',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'hire-workflow', title: 'Workflow automation' },
      },
      {
        path: 'hire-build-app',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'hire-build-app', title: 'Build app' },
      },
      {
        path: 'hire-build-web',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'hire-build-web', title: 'Build web' },
      },
      {
        path: 'skill-pack',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'skill-pack', title: 'Skill packs' },
      },
      // Digital / sản phẩm số (gcmmo-style)
      {
        path: 'ai-account',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'ai-account', title: 'Tài khoản AI' },
      },
      {
        path: 'social-account',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'social-account', title: 'Mạng xã hội' },
      },
      {
        path: 'software',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'software', title: 'Phần mềm' },
      },
      {
        path: 'vpn-proxy',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'vpn-proxy', title: 'VPN & Proxy' },
      },
      {
        path: 'license-key',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'license-key', title: 'Key / License' },
      },
      {
        path: 'course',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'course', title: 'Khóa học' },
      },
      {
        path: 'template',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'template', title: 'Template / Source' },
      },
      {
        path: 'email-domain',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'email-domain', title: 'Email & Domain' },
      },
      {
        path: 'boost-service',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'boost-service', title: 'Tăng tương tác' },
      },
      {
        path: 'mmo-tool',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'mmo-tool', title: 'Tool MMO' },
      },
      {
        path: 'design-asset',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'design-asset', title: 'Thiết kế' },
      },
      {
        path: 'cloud-hosting',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'cloud-hosting', title: 'Cloud / Hosting' },
      },
      {
        path: 'store/:creatorSlug',
        loadComponent: () =>
          import('./features/creator-store/creator-store.component').then(
            (m) => m.CreatorStoreComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search.component').then((m) => m.SearchComponent),
      },
      {
        path: 'auth/login',
        loadComponent: () => import('./features/auth/auth.components').then((m) => m.LoginComponent),
      },
      {
        path: 'auth/register',
        loadComponent: () => import('./features/auth/auth.components').then((m) => m.RegisterComponent),
      },
      {
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'wishlist',
        redirectTo: 'cart',
        pathMatch: 'full',
      },
      {
        path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/settings/settings-shell.component').then((m) => m.SettingsShellComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'profile' },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/settings/settings-profile.component').then(
                (m) => m.SettingsProfileComponent,
              ),
          },
          {
            path: 'activity',
            loadComponent: () =>
              import('./features/settings/settings-pages.components').then(
                (m) => m.SettingsActivityComponent,
              ),
          },
          {
            path: 'security',
            loadComponent: () =>
              import('./features/settings/settings-pages.components').then(
                (m) => m.SettingsSecurityComponent,
              ),
          },
          {
            path: 'notifications',
            loadComponent: () =>
              import('./features/settings/settings-pages.components').then(
                (m) => m.SettingsNotificationsComponent,
              ),
          },
          {
            path: 'connections',
            loadComponent: () =>
              import('./features/settings/settings-pages.components').then(
                (m) => m.SettingsConnectionsComponent,
              ),
          },
          {
            path: 'feed',
            loadComponent: () =>
              import('./features/settings/settings-pages.components').then(
                (m) => m.SettingsFeedComponent,
              ),
          },
        ],
      },
      {
        path: 'billing',
        canActivate: [authGuard],
        loadComponent: () => import('./features/commerce/commerce.components').then((m) => m.BillingComponent),
      },
      {
        path: 'wallet',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/wallet/wallet.component').then((m) => m.WalletComponent),
      },
      {
        path: 'affiliate',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/commerce/commerce.components').then((m) => m.AffiliateComponent),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/commerce/commerce.components').then((m) => m.ReviewsPageComponent),
      },
      {
        path: 'privacy-policy',
        loadComponent: () =>
          import('./features/legal/privacy-policy/privacy-policy.component').then(
            (m) => m.PrivacyPolicyComponent,
          ),
      },
      {
        path: 'terms-of-service',
        loadComponent: () =>
          import('./features/legal/terms-of-service/terms-of-service.component').then(
            (m) => m.TermsOfServiceComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/commerce/commerce.components').then((m) => m.AdminComponent),
      },
      {
        path: 'dashboard',
        canActivate: [creatorGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.components').then((m) => m.DashboardShellComponent),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then((m) => m.DashboardHomeComponent),
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then((m) => m.DashboardOrdersComponent),
          },
          {
            path: 'usage',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then((m) => m.DashboardUsageComponent),
          },
          {
            path: 'tokens',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then((m) => m.DashboardTokensComponent),
          },
          {
            path: 'gpu',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then((m) => m.DashboardGpuComponent),
          },
          {
            path: 'analytics',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then(
                (m) => m.DashboardAnalyticsComponent,
              ),
          },
          {
            path: 'products',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then(
                (m) => m.DashboardProductsComponent,
              ),
          },
          {
            path: 'withdraw',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then(
                (m) => m.DashboardWithdrawComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
