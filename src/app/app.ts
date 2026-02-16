import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Angular Material imports for future UI enhancements
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MemoryGridComponent } from './components/memory-grid.component';
import { MemoryStreamService } from './services/memory-stream.service';
import { StatsService } from './services/stats.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    MemoryGridComponent,
    // Material modules for planned UI upgrades
    MatButtonModule,
    MatSliderModule,
    MatCardModule,
    MatToolbarModule,
    MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css'
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
    this.statsService.powerDraw$
      .pipe(takeUntilDestroyed())
      .subscribe(kOps => {
        this.powerDraw.set(kOps);
      });

    // Expose performance monitor for testing
    if (typeof window !== 'undefined') {
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
