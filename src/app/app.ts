import { Component, signal, inject, ChangeDetectionStrategy, isDevMode } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemoryGridComponent } from './components/memory-grid.component';
import { MemoryStreamService } from './services/memory-stream.service';
import { StatsService } from './services/stats.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, MemoryGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private memoryStreamService = inject(MemoryStreamService);
  protected statsService = inject(StatsService);
  private performanceMonitor = inject(PerformanceMonitorService);

  // UI state
  updateRate = signal(100);
  powerDraw = signal(0);

  constructor() {
    // Subscribe to power draw updates
    this.statsService.powerDraw$.pipe(takeUntilDestroyed()).subscribe((kOps) => {
      this.powerDraw.set(kOps);
    });

    // Expose performance monitor for testing in development mode
    if (typeof window !== 'undefined' && isDevMode()) {
      (window as any).performanceMonitor = this.performanceMonitor;
    }
  }

  /**
   * Updates the memory stream refresh rate from input event
   */
  onUpdateRateChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.updateRate.set(value);
    this.memoryStreamService.setUpdateRate(value);
  }
}
