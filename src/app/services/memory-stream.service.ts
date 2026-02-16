import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, switchMap, map } from 'rxjs';
// Lodash for data manipulation utilities
import _ from 'lodash';

/**
 * Configuration for memory visualization
 */
export interface MemoryConfig {
  readonly GRID_SIZE: 64;
  readonly TOTAL_BYTES: 4096; // 64 * 64
  readonly DEFAULT_UPDATE_RATE_MS: 100;
}

export const MEMORY_CONFIG: MemoryConfig = {
  GRID_SIZE: 64,
  TOTAL_BYTES: 4096,
  DEFAULT_UPDATE_RATE_MS: 100
};

/**
 * Service that simulates a live stream of memory data.
 * Emits random byte arrays at configurable intervals.
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryStreamService {
  private updateRateMs$ = new BehaviorSubject<number>(MEMORY_CONFIG.DEFAULT_UPDATE_RATE_MS);

  /**
   * Observable stream of memory data.
   * Emits an array of 4,096 random bytes (0-255) at the configured rate.
   */
  public readonly memoryStream$ = this.updateRateMs$.pipe(
    switchMap(rate => interval(rate)),
    map(() => this.generateRandomMemory())
  );

  /**
   * Updates the rate at which memory data is emitted.
   * Lower values increase the frequency of updates.
   *
   * @param ms Update interval in milliseconds (minimum: 10ms)
   */
  setUpdateRate(ms: number): void {
    // Use lodash for robust number clamping
    const clampedRate = _.clamp(ms, 10, Infinity);
    this.updateRateMs$.next(clampedRate);
  }

  /**
   * Generates a random array of 4,096 bytes.
   */
  private generateRandomMemory(): number[] {
    const memory = new Array(MEMORY_CONFIG.TOTAL_BYTES);
    for (let i = 0; i < MEMORY_CONFIG.TOTAL_BYTES; i++) {
      memory[i] = Math.floor(Math.random() * 256);
    }
    return memory;
  }
}
