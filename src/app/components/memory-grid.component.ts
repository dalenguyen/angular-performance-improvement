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

  gridTemplate = `repeat(${MEMORY_CONFIG.GRID_SIZE}, minmax(0, 1fr))`;

  constructor() {
    this.memoryStreamService.memoryStream$
      .pipe(takeUntilDestroyed())
      .subscribe(data => this.updateMemory(data));
  }

  /**
   * Updates memory cells with new data from the stream.
   * Locked cells are not updated.
   * Optimized: Only creates new cell objects for cells that actually changed.
   */
  private updateMemory(data: number[]): void {
    this.memoryCells.update(currentCells => {
      const newCells = currentCells.slice();
      for (let i = 0; i < data.length; i++) {
        if (!currentCells[i].isLocked && currentCells[i].value !== data[i]) {
          newCells[i] = { value: data[i], isLocked: false };
        }
      }
      return newCells;
    });
  }

  /**
   * Toggles the locked state of a memory cell.
   * Locked cells ignore stream updates and turn red.
   * Optimized: Uses slice() for better performance than spread operator.
   */
  toggleLock(index: number): void {
    this.memoryCells.update(cells => {
      const newCells = cells.slice();
      newCells[index] = {
        ...cells[index],
        isLocked: !cells[index].isLocked
      };
      return newCells;
    });
  }

  /**
   * Calculates the average value of all cells
   */
  protected averageValue = computed(() => {
    this.statsService.recordCalculation();

    const cells = this.memoryCells();
    const sum = cells.reduce((acc, cell) => acc + cell.value, 0);
    return Math.round(sum / cells.length);
  });

  /**
   * Finds the maximum value across all cells
   * Optimized: Uses reduce to avoid spread operator and intermediate array
   */
  protected maxValue = computed(() => {
    this.statsService.recordCalculation();

    const cells = this.memoryCells();
    return cells.reduce((max, cell) => Math.max(max, cell.value), 0);
  });

  /**
   * Counts the number of locked cells
   * Optimized: Uses reduce to avoid intermediate filtered array
   */
  protected lockedCount = computed(() => {
    this.statsService.recordCalculation();

    const cells = this.memoryCells();
    return cells.reduce((count, cell) => count + (cell.isLocked ? 1 : 0), 0);
  });

  /**
   * Calculates grid health metric
   */
  protected gridHealth = computed(() => {
    this.statsService.recordCalculation();

    const cells = this.memoryCells();
    const avgValue = this.averageValue(); // Reuse cached value
    const lockedRatio = this.lockedCount() / cells.length;

    return Math.round((avgValue / 255) * 50 + (1 - lockedRatio) * 50);
  });

  /**
   * Calculates CSS filter for grid brightness
   */
  protected gridFilter = computed(() => {
    this.statsService.recordCalculation();

    const avgValue = this.averageValue(); // Reuse cached value
    const brightness = 0.9 + (avgValue / 255) * 0.2;

    return `brightness(${brightness})`;
  });

}
