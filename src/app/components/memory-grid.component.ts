import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MemoryCellComponent } from './memory-cell.component';
import { MemoryStreamService, MEMORY_CONFIG } from '../services/memory-stream.service';
import { StatsService } from '../services/stats.service';

/**
 * Represents a memory cell with its value and locked state
 */
interface MemoryCell {
  value: number;
  isLocked: boolean;
}

/**
 * Main grid component that displays all 4,096 memory cells.
 * Subscribes to the memory stream and updates cell values in real-time.
 */
@Component({
  selector: 'app-memory-grid',
  imports: [CommonModule, MemoryCellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-stats">
      <div class="stat">Average Value: {{ averageValue() }}</div>
      <div class="stat">Max Value: {{ maxValue() }}</div>
      <div class="stat">Locked Cells: {{ lockedCount() }}</div>
      <div class="stat">Grid Health: {{ gridHealth() }}%</div>
    </div>
    <div
      class="grid-container"
      [style.grid-template-columns]="gridTemplate"
      [style.filter]="gridFilter()"
    >
      @for (cell of memoryCells(); track $index) {
        <app-memory-cell
          [value]="cell.value"
          [isLocked]="cell.isLocked"
          (cellClicked)="toggleLock($index)"
        />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .grid-stats {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #00ffff;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #00ffff;
      max-width: 100%;
      box-sizing: border-box;
    }

    .stat {
      flex: 1;
      text-align: center;
      min-width: 0;
    }

    .grid-container {
      display: grid;
      gap: 1px;
      background: #000;
      padding: 4px;
      border: 2px solid #00ffff;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
      max-width: 100%;
      width: 100%;
      aspect-ratio: 1;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .grid-container {
        gap: 0;
        padding: 2px;
      }

      .grid-stats {
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.75rem;
      }
    }
  `]
})
export class MemoryGridComponent {
  private memoryStreamService = inject(MemoryStreamService);
  private statsService = inject(StatsService);

  memoryCells = signal<MemoryCell[]>(
    Array.from({ length: MEMORY_CONFIG.TOTAL_BYTES }, () => ({
      value: 0,
      isLocked: false
    }))
  );

  /**
   * Running statistics for O(1) access in computed signals.
   * Updated incrementally to avoid O(n) recalculations.
   */
  private stats = signal({
    sum: 0,
    max: 0,
    lockedCount: 0
  });

  gridTemplate = `repeat(${MEMORY_CONFIG.GRID_SIZE}, minmax(0, 1fr))`;

  constructor() {
    // Calculate initial statistics once - O(n)
    const initialCells = this.memoryCells();
    let sum = 0;
    let max = 0;
    let lockedCount = 0;

    for (let i = 0; i < initialCells.length; i++) {
      sum += initialCells[i].value;
      max = Math.max(max, initialCells[i].value);
      if (initialCells[i].isLocked) lockedCount++;
    }

    this.stats.set({ sum, max, lockedCount });

    this.memoryStreamService.memoryStream$
      .pipe(takeUntilDestroyed())
      .subscribe(data => this.updateMemory(data));
  }

  /**
   * Updates memory cells with new data from the stream.
   * Locked cells are not updated.
   * Optimized: Updates stats incrementally - O(k) where k = changed cells.
   */
  private updateMemory(data: number[]): void {
    this.memoryCells.update(currentCells => {
      const newCells = currentCells.slice();
      let sumDelta = 0;
      let needsMaxRecalc = false;
      const currentStats = this.stats();

      for (let i = 0; i < data.length; i++) {
        if (!currentCells[i].isLocked && currentCells[i].value !== data[i]) {
          const oldValue = currentCells[i].value;
          const newValue = data[i];

          // Update sum incrementally
          sumDelta += newValue - oldValue;

          // Check if we need to recalculate max
          if (oldValue === currentStats.max && newValue < oldValue) {
            needsMaxRecalc = true;
          }

          newCells[i] = { value: newValue, isLocked: false };
        }
      }

      // Update stats incrementally - O(k) for max check, O(n) only if max was removed
      let newMax = currentStats.max;
      if (needsMaxRecalc) {
        // Full recalc needed only when current max value was removed
        newMax = newCells.reduce((max, cell) => Math.max(max, cell.value), 0);
      } else {
        // Just check if any new values exceed current max - O(k)
        for (let i = 0; i < data.length; i++) {
          if (!currentCells[i].isLocked && currentCells[i].value !== data[i]) {
            newMax = Math.max(newMax, data[i]);
          }
        }
      }

      this.stats.update(s => ({
        sum: s.sum + sumDelta,
        max: newMax,
        lockedCount: s.lockedCount
      }));

      return newCells;
    });
  }

  /**
   * Toggles the locked state of a memory cell.
   * Locked cells ignore stream updates and turn red.
   * Optimized: Updates locked count incrementally - O(1).
   */
  toggleLock(index: number): void {
    this.memoryCells.update(cells => {
      const newCells = cells.slice();
      const wasLocked = cells[index].isLocked;

      newCells[index] = {
        ...cells[index],
        isLocked: !wasLocked
      };

      // Update locked count incrementally - O(1)
      this.stats.update(s => ({
        ...s,
        lockedCount: s.lockedCount + (wasLocked ? -1 : 1)
      }));

      return newCells;
    });
  }

  /**
   * Calculates the average value of all cells
   * Optimized: Uses cached sum - O(1) instead of O(n)
   */
  protected averageValue = computed(() => {
    this.statsService.recordCalculation();

    const stats = this.stats();
    return Math.round(stats.sum / MEMORY_CONFIG.TOTAL_BYTES);
  });

  /**
   * Finds the maximum value across all cells
   * Optimized: Uses cached max - O(1) instead of O(n)
   */
  protected maxValue = computed(() => {
    this.statsService.recordCalculation();

    return this.stats().max;
  });

  /**
   * Counts the number of locked cells
   * Optimized: Uses cached count - O(1) instead of O(n)
   */
  protected lockedCount = computed(() => {
    this.statsService.recordCalculation();

    return this.stats().lockedCount;
  });

  /**
   * Calculates grid health metric
   * Optimized: Uses cached computed values - O(1)
   */
  protected gridHealth = computed(() => {
    this.statsService.recordCalculation();

    const avgValue = this.averageValue(); // O(1) - cached
    const lockedRatio = this.lockedCount() / MEMORY_CONFIG.TOTAL_BYTES; // O(1) - cached

    return Math.round((avgValue / 255) * 50 + (1 - lockedRatio) * 50);
  });

  /**
   * Calculates CSS filter for grid brightness
   * Optimized: Uses cached computed value - O(1)
   */
  protected gridFilter = computed(() => {
    this.statsService.recordCalculation();

    const avgValue = this.averageValue(); // O(1) - cached
    const brightness = 0.9 + (avgValue / 255) * 0.2;

    return `brightness(${brightness})`;
  });

}
