import { Injectable, NgZone } from '@angular/core';

/**
 * Performance monitoring service that tracks change detection cycles.
 *
 * STRATEGY: NgZone.onMicrotaskEmpty with production-mode handling
 *
 * For Angular 21 with OnPush + signals:
 * - onMicrotaskEmpty fires when zone completes microtask queue processing
 * - Each emission represents completion of a batch of updates (signals, events, etc.)
 * - This correlates with CD synchronization passes in OnPush components
 * - Run INSIDE the zone to ensure it fires properly
 */
@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {
  private cdCycleCount = 0;
  private isMonitoring = false;

  constructor(private ngZone: NgZone) {
    this.setupMonitoring();
  }

  private setupMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Run the subscription INSIDE the zone to ensure it fires
    this.ngZone.run(() => {
      this.ngZone.onMicrotaskEmpty.subscribe(() => {
        this.cdCycleCount++;

        performance.measure(
          `cd-cycle-${this.cdCycleCount}`,
          { start: performance.now(), detail: { cycle: this.cdCycleCount } }
        );
      });
    });
  }

  getCycleCount(): number {
    return this.cdCycleCount;
  }

  reset(): void {
    this.cdCycleCount = 0;
  }
}
