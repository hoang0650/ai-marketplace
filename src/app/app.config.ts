import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { ChunkAwareErrorHandler, isChunkLoadError, reloadForNewVersion } from './core/chunk-reload';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { mockApiInterceptor } from './interceptors/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Stale tab after a deploy: the lazy chunk is gone -> full load of the target URL once.
      withNavigationErrorHandler((e) => {
        if (isChunkLoadError(e.error)) reloadForNewVersion(e.url);
      })
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, mockApiInterceptor])),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    { provide: ErrorHandler, useClass: ChunkAwareErrorHandler },
  ],
};
