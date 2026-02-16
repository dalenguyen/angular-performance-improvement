import { bootstrapApplication } from '@angular/platform-browser';
import { enableProfiling, isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Enable Angular profiler only in development mode
// This emits performance events that can be captured by Chrome DevTools
if (isDevMode()) {
  enableProfiling();
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
