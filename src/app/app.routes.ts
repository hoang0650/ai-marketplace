import { Routes } from '@angular/router';
import { authGuard, creatorGuard, sellerGuard, adminGuard, listingGuard } from './guards/auth.guards';

export const routes: Routes = [
  {
    path: 'work/manage',
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
        loadComponent: () =>
          import('./features/work/work-talent-profile.component').then((m) => m.WorkTalentProfileComponent),
      },
      {
        path: 'saved',
        data: { page: 'saved' },
        loadComponent: () =>
          import('./features/work/work-pages.components').then((m) => m.WorkPlaceholderComponent),
      },
      {
        path: 'job-profile',
        loadComponent: () =>
          import('./features/work/work-talent-profile.component').then((m) => m.WorkTalentProfileComponent),
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
        loadComponent: () =>
          import('./features/work/work-contracts.component').then((m) => m.WorkContractsComponent),
      },
      {
        path: 'disputes',
        data: { inbox: 'work' },
        loadComponent: () =>
          import('./features/complaints/complaint-list.component').then((m) => m.ComplaintListComponent),
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
        path: 'verification',
        loadComponent: () =>
          import('./features/sell/sell-verification.component').then((m) => m.SellVerificationComponent),
      },
      {
        path: 'images',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellImagesComponent),
      },
      {
        path: 'products/new',
        canActivate: [listingGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.components').then((m) => m.DashboardProductsComponent),
      },
      {
        path: 'products',
        canActivate: [listingGuard],
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellProductsComponent),
      },
      {
        path: 'templates',
        canActivate: [sellerGuard],
        loadComponent: () =>
          import('./features/builder/sell-templates.component').then((m) => m.SellTemplatesComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/sell/sell-pages.components').then((m) => m.SellOrdersComponent),
      },
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./features/chat/chat-thread.component').then((m) => m.ChatThreadComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/chat/chat-inbox.component').then((m) => m.ChatInboxComponent),
      },
      {
        path: 'complaints',
        data: { inbox: 'seller' },
        loadComponent: () =>
          import('./features/complaints/complaint-list.component').then((m) => m.ComplaintListComponent),
      },
      {
        path: 'coupons',
        canActivate: [sellerGuard],
        loadComponent: () =>
          import('./features/sell/sell-coupons.component').then((m) => m.SellCouponsComponent),
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
        path: 'docs/api-usage',
        loadComponent: () =>
          import('./features/sell/sell-api-usage.component').then((m) => m.SellApiUsageDocsComponent),
      },
      {
        path: 'integrate',
        loadComponent: () =>
          import('./features/sell/sell-compute-integrate.component').then(
            (m) => m.SellComputeIntegrateComponent,
          ),
      },
      {
        path: 'kyc',
        loadComponent: () =>
          import('./features/settings/settings-kyc.component').then((m) => m.SettingsKycComponent),
      },
      {
        path: 'issues',
        data: { inbox: 'work' },
        loadComponent: () =>
          import('./features/complaints/complaint-list.component').then((m) => m.ComplaintListComponent),
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
        path: 'gpu',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/gpu/gpu-rent.component').then((m) => m.GpuRentComponent),
      },
      {
        path: 'training',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/training/training-studio.component').then((m) => m.TrainingStudioComponent),
      },
      {
        path: 'build',
        canActivate: [authGuard],
        loadComponent: () => import('./features/builder/builder-home.component').then((m) => m.BuilderHomeComponent),
      },
      {
        path: 'build/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/builder/builder-studio.component').then((m) => m.BuilderStudioComponent),
      },
      {
        path: 'play/:productSlug',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/gpu/gpu-play.component').then((m) => m.GpuPlayComponent),
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
        path: 'voice-clone',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'voice-clone', title: 'Voice clone' },
      },
      {
        path: 'voice-preset',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'voice-preset', title: 'Voice presets' },
      },
      {
        path: 'ai-film-series',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'ai-film-series', title: 'Watch AI films' },
      },
      {
        path: 'story-book',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'story-book', title: 'Stories & books' },
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
        path: 'template-web',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'template-web', title: 'Web templates' },
      },
      {
        path: 'template-app',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'template-app', title: 'App templates' },
      },
      {
        path: 'providers',
        redirectTo: 'marketplace',
        pathMatch: 'full',
      },
      {
        path: 'api-endpoint',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'api-endpoint', title: 'Sell API' },
      },
      {
        path: 'openrouter',
        redirectTo: 'inference',
        pathMatch: 'full',
      },
      {
        path: 'featherless',
        redirectTo: 'inference',
        pathMatch: 'full',
      },
      {
        path: 'runpod-public',
        redirectTo: 'marketplace',
        pathMatch: 'full',
      },
      {
        path: 'gpu-compute',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'gpu-compute', title: 'GPU compute' },
      },
      {
        path: 'game-server',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'game-server', title: 'Game servers' },
      },
      {
        path: 'training-service',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'training-service', title: 'Training' },
      },
      {
        path: 'agent-runtime',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'agent-runtime', title: 'Agent runtime' },
      },
      {
        path: 'skill-pack',
        loadComponent: () =>
          import('./features/category-hub/category-hub.component').then((m) => m.CategoryHubComponent),
        data: { category: 'skill-pack', title: 'Skill packs' },
      },
      {
        path: 'shops',
        loadComponent: () => import('./features/shops/shops.component').then((m) => m.ShopsComponent),
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
        path: 'auth/google/callback',
        loadComponent: () =>
          import('./features/auth/google-auth-callback.component').then((m) => m.GoogleAuthCallbackComponent),
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
            path: 'kyc',
            loadComponent: () =>
              import('./features/settings/settings-kyc.component').then((m) => m.SettingsKycComponent),
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
        path: 'hire/projects/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/hire/hire-project-detail.component').then((m) => m.HireProjectDetailComponent),
      },
      {
        path: 'hire/projects',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/hire/hire-projects.component').then((m) => m.HireProjectsComponent),
      },
      {
        path: 'usage',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/usage/usage.component').then((m) => m.UsageComponent),
      },
      {
        path: 'account/console',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/account/buyer-console.component').then((m) => m.BuyerConsoleComponent),
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
        path: 'messages/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/chat/chat-thread.component').then((m) => m.ChatThreadComponent),
      },
      {
        path: 'messages',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/chat/chat-inbox.component').then((m) => m.ChatInboxComponent),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/support/support.component').then((m) => m.SupportComponent),
      },
      {
        path: 'complaints/new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/complaints/complaint-form.component').then((m) => m.ComplaintFormComponent),
      },
      {
        path: 'complaints/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/complaints/complaint-detail.component').then(
            (m) => m.ComplaintDetailComponent,
          ),
      },
      {
        path: 'complaints',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/complaints/complaint-list.component').then((m) => m.ComplaintListComponent),
      },
      {
        path: 'admin/finance',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-finance.component').then((m) => m.AdminFinanceComponent),
      },
      {
        path: 'admin/kyc',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin-kyc.component').then((m) => m.AdminKycComponent),
      },
      {
        path: 'admin/complaints/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/complaints/complaint-detail.component').then(
            (m) => m.ComplaintDetailComponent,
          ),
      },
      {
        path: 'admin/complaints',
        canActivate: [adminGuard],
        data: { inbox: 'admin' },
        loadComponent: () =>
          import('./features/complaints/complaint-list.component').then((m) => m.ComplaintListComponent),
      },
      {
        path: 'docs',
        loadComponent: () =>
          import('./features/docs/docs-hub.component').then((m) => m.DocsHubComponent),
      },
      {
        path: 'docs/api-usage',
        loadComponent: () =>
          import('./features/sell/sell-api-usage.component').then((m) => m.SellApiUsageDocsComponent),
      },
      {
        path: 'docs/compute-streaming',
        loadComponent: () =>
          import('./features/docs/docs-compute.component').then((m) => m.DocsComputeComponent),
      },
      {
        path: 'docs/models',
        loadComponent: () =>
          import('./features/docs/docs-models.component').then((m) => m.DocsModelsComponent),
      },
      {
        path: 'docs/models/:slug',
        loadComponent: () =>
          import('./features/docs/docs-model.component').then((m) => m.DocsModelComponent),
      },
      {
        path: 'work',
        loadComponent: () =>
          import('./features/work/public/work-public.components').then((m) => m.WorkOverviewComponent),
      },
      {
        path: 'work/jobs',
        loadComponent: () =>
          import('./features/work/public/work-public.components').then((m) => m.WorkJobsComponent),
      },
      {
        path: 'work/jobs/:slug',
        loadComponent: () =>
          import('./features/work/public/work-public.components').then((m) => m.WorkJobDetailComponent),
      },
      {
        path: 'work/talents',
        loadComponent: () =>
          import('./features/work/public/work-public.components').then((m) => m.WorkTalentsComponent),
      },
      {
        path: 'work/talents/:slug',
        loadComponent: () =>
          import('./features/work/public/work-public.components').then((m) => m.WorkTalentDetailComponent),
      },
      {
        path: 'work/post',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/work/public/work-public.components').then((m) => m.WorkPostJobComponent),
      },
      {
        path: 'privacy-policy',
        data: { policySlug: 'chinh-sach-bao-mat-va-du-lieu' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'terms-of-service',
        data: { policySlug: 'dieu-khoan-su-dung' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'legal',
        loadComponent: () =>
          import('./features/legal/legal-hub.component').then((m) => m.LegalHubComponent),
      },
      {
        path: 'legal/:slug',
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'marketplace-rules',
        data: { policySlug: 'quy-che-hoat-dong-san-tmdt' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'seller-policy',
        data: { policySlug: 'chinh-sach-nguoi-ban' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'buyer-policy',
        data: { policySlug: 'chinh-sach-nguoi-mua' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'payment-policy',
        data: { policySlug: 'chinh-sach-thanh-toan-doi-soat' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'refund-policy',
        data: { policySlug: 'chinh-sach-hoan-tien' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'dispute-policy',
        data: { policySlug: 'chinh-sach-khieu-nai-tranh-chap' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'complaint-policy',
        data: { policySlug: 'chinh-sach-khieu-nai-tranh-chap' },
        loadComponent: () =>
          import('./features/legal/legal-policy-page.component').then((m) => m.LegalPolicyPageComponent),
      },
      {
        path: 'admin/users/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/commerce/admin-moderation.components').then((m) => m.AdminUserDetailComponent),
      },
      {
        path: 'admin/products/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/commerce/admin-moderation.components').then(
            (m) => m.AdminProductDetailComponent,
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
              import('./features/gpu/gpu-servers.component').then((m) => m.GpuServersComponent),
          },
          {
            path: 'projects/:projectId/terminal',
            loadComponent: () =>
              import('./features/gpu/gpu-terminal.component').then((m) => m.GpuTerminalComponent),
          },
          {
            path: 'servers/:serverId/play',
            loadComponent: () =>
              import('./features/gpu/gpu-play.component').then((m) => m.GpuPlayComponent),
          },
          {
            path: 'analytics',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then(
                (m) => m.DashboardAnalyticsComponent,
              ),
          },
          {
            path: 'licenses',
            loadComponent: () =>
              import('./features/dashboard/dashboard.components').then(
                (m) => m.DashboardLicensesComponent,
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
