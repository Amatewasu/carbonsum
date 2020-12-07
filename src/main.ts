import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import * as Sentry from "@sentry/angular";
import { Integrations } from "@sentry/tracing";

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

Sentry.init({
  dsn: "https://0e4299e473254075b91aef817e15e986@o487188.ingest.sentry.io/5545704",
  integrations: [
    new Integrations.BrowserTracing({
      tracingOrigins: ["localhost", "https://yourserver.io/api"],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
