// Reflect metadata polyfill for enhanced decorator support
import 'reflect-metadata';

import { bootstrapApplication } from '@angular/platform-browser';
import { enableProfiling } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Enable Angular profiler for change detection tracking
// This emits performance events that can be captured by Chrome DevTools
if (typeof window !== 'undefined') {
  enableProfiling();
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
