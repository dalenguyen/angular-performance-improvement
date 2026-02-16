import { Injectable, signal } from '@angular/core';
// Import from rxjs root for convenience (includes all operators)
import * as rxjs from 'rxjs';

/**
 * Service for tracking computational metrics and system performance.
 * Monitors the "power draw" of the application by counting operations.
 */
@Injectable({
  providedIn: 'root'
})
export class StatsService {
  // Use plain number instead of signal to avoid SSR issues
  private computations = 0;
  private powerDraw = signal(0);

  public readonly powerDraw$: rxjs.Observable<number>;

  constructor() {
    // Calculate power draw (kOps/sec) every second
    this.powerDraw$ = rxjs.interval(1000).pipe(
      rxjs.map(() => {
        const opsPerSecond = this.computations;
        const kOpsPerSecond = Math.round(opsPerSecond / 1000);

        // Reset counter for next measurement
        this.computations = 0;
        this.powerDraw.set(kOpsPerSecond);

        return kOpsPerSecond;
      })
    );
  }

  /**
   * Records a single computational operation.
   * Called by components to track their processing overhead.
   */
  recordCalculation(): void {
    this.computations++;
  }

  /**
   * Gets the current power draw reading
   */
  getCurrentPowerDraw(): number {
    return this.powerDraw();
  }
}
