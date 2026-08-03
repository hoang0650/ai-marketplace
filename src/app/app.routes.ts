import { Routes } from '@angular/router';
import { authGuard, creatorGuard, adminGuard } from './guards/auth.guards';

export const routes: Routes = [
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
        path: 'wishlist',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/wishlist/wishlist.component').then((m) => m.WishlistComponent),
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
        loadComponent: () => import('./features/commerce/commerce.components').then((m) => m.ProfileComponent),
      },
      {
        path: 'billing',
        canActivate: [authGuard],
        loadComponent: () => import('./features/commerce/commerce.components').then((m) => m.BillingComponent),
      },
      {
        path: 'wallet',
        canActivate: [authGuard],
        loadComponent: () => import('./features/commerce/commerce.components').then((m) => m.WalletComponent),
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
