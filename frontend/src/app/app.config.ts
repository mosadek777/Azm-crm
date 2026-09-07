import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';

// No component library. PrimeNG was removed on 2026-09-07 after v22 was found
// to require a paid licence key for every component — see
// docs/decisions-pending.md decision 24. The UI is Tailwind only, so there are
// no theme providers, no animation provider and no CSS layer ordering to keep
// in sync with a vendor's own stylesheet.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor]))
  ]
};
