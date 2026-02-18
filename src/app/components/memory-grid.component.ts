import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MEMORY_CONFIG, MemoryStreamService } from '../services/memory-stream.service';
import { StatsService } from '../services/stats.service';

@Component({
  selector: 'app-memory-grid',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-stats">
      <div class="stat">Average Value: {{ averageValue() }}</div>
      <div class="stat">Max Value: {{ maxValue() }}</div>
      <div class="stat">Locked Cells: {{ lockedCount() }}</div>
      <div class="stat">Grid Health: {{ gridHealth() }}%</div>
    </div>
    <div class="canvas-wrapper">
      <canvas
        #gridCanvas
        class="grid-canvas"
        [style.filter]="gridFilter()"
        (click)="onCanvasClick($event)"
        (mousemove)="onMouseMove($event)"
        (mouseleave)="onMouseLeave()"
        role="grid"
        [attr.aria-label]="
          'Memory grid ' + GRID_SIZE + 'x' + GRID_SIZE + ', ' + lockedCount() + ' locked'
        "
      ></canvas>
      @if (tooltipVisible()) {
        <div class="cell-tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
          {{ tooltipContent() }}
        </div>
      }
    </div>
  `,
  styles: [
    `
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

      .canvas-wrapper {
        position: relative;
        width: 100%;
      }

      .grid-canvas {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        cursor: pointer;
        border: 2px solid #00ffff;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        image-rendering: pixelated;
      }

      .cell-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.85);
        color: #00ffff;
        border: 1px solid #00ffff;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 0.7rem;
        font-family: 'Courier New', monospace;
        pointer-events: none;
        white-space: nowrap;
        z-index: 100;
        transform: translate(10px, -100%);
      }

      @media (max-width: 768px) {
        .grid-stats {
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class MemoryGridComponent implements AfterViewInit {
  @ViewChild('gridCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private memoryStreamService = inject(MemoryStreamService);
  private statsService = inject(StatsService);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx!: CanvasRenderingContext2D;
  private cellSize = 10;
  private rafId = 0;
  private hoveredIndex = -1;
  private readonly dirtyIndices = new Set<number>();

  protected tooltipVisible = signal(false);
  protected tooltipContent = signal('');
  protected tooltipX = signal(0);
  protected tooltipY = signal(0);

  /** Raw byte values — Uint8Array is memory-efficient and cache-friendly */
  private readonly values = new Uint8Array(MEMORY_CONFIG.TOTAL_BYTES);
  private readonly locked = new Array<boolean>(MEMORY_CONFIG.TOTAL_BYTES).fill(false);

  /**
   * Precomputed color strings for all 256 possible byte values.
   * Computed once at startup — no per-frame color math.
   */
  private readonly colorTable = Array.from({ length: 256 }, (_, val) => {
    const r = Math.floor((val / 255) * 100 + 50);
    const g = Math.floor(Math.sin(val * 0.1) * 50 + 100);
    const b = Math.floor((1 - val / 255) * 155 + 100);
    return `rgb(${r},${g},${b})`;
  });

  readonly GRID_SIZE = MEMORY_CONFIG.GRID_SIZE;

  private stats = signal({ sum: 0, max: 0, lockedCount: 0 });

  constructor() {
    this.memoryStreamService.memoryStream$
      .pipe(takeUntilDestroyed())
      .subscribe((data) => this.updateMemory(data));
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // ResizeObserver keeps the canvas pixel-perfect as the layout changes
    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(canvas);
    this.destroyRef.onDestroy(() => ro.disconnect());

    this.onResize();
  }

  private onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const cssSize = canvas.clientWidth;
    if (!cssSize) {
      console.log('[canvas] onResize: clientWidth is 0, skipping');
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    this.ctx.scale(dpr, dpr);
    this.cellSize = cssSize / MEMORY_CONFIG.GRID_SIZE;
    this.drawAll();
  }

  private drawCell(index: number): void {
    this.statsService.recordCalculation();
    const col = index % MEMORY_CONFIG.GRID_SIZE;
    const row = Math.floor(index / MEMORY_CONFIG.GRID_SIZE);
    const x = col * this.cellSize;
    const y = row * this.cellSize;
    const val = this.values[index];

    // Background fill
    this.ctx.fillStyle = this.locked[index] ? '#ff0000' : this.colorTable[val];
    this.ctx.fillRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);

    // Hex label — only when cells are large enough to be readable
    if (this.cellSize >= 8) {
      const hex = val.toString(16).toUpperCase().padStart(2, '0');
      this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
      this.ctx.font = `bold ${Math.floor(this.cellSize * 0.35)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(hex, x + this.cellSize / 2, y + this.cellSize / 2);
    }

    // Hover highlight — cyan border overlay on the active cell
    if (index === this.hoveredIndex) {
      this.ctx.strokeStyle = '#00ffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
    }
  }

  private drawAll(): void {
    if (!this.ctx) return;
    // Black background gives the 1px gap effect between cells
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(
      0,
      0,
      this.canvasRef.nativeElement.width,
      this.canvasRef.nativeElement.height,
    );
    for (let i = 0; i < MEMORY_CONFIG.TOTAL_BYTES; i++) {
      this.drawCell(i);
    }
  }

  /**
   * Schedules a canvas repaint outside Angular zone via rAF.
   * Multiple signal updates within one tick are batched into a single draw.
   */
  private scheduleDraw(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      for (const i of this.dirtyIndices) {
        this.drawCell(i);
      }
      this.dirtyIndices.clear();
    });
  }

  private updateMemory(data: number[]): void {
    const currentStats = this.stats();
    let sumDelta = 0;
    let needsMaxRecalc = false;
    let newMax = currentStats.max;

    for (let i = 0; i < data.length; i++) {
      if (!this.locked[i] && this.values[i] !== data[i]) {
        const oldVal = this.values[i];
        const newVal = data[i];

        sumDelta += newVal - oldVal;

        if (oldVal === currentStats.max && newVal < oldVal) {
          needsMaxRecalc = true;
        } else {
          newMax = Math.max(newMax, newVal);
        }

        this.values[i] = newVal;
        this.dirtyIndices.add(i);
      }
    }

    if (needsMaxRecalc) {
      newMax = this.values.reduce((m, v) => Math.max(m, v), 0);
    }

    if (sumDelta !== 0 || newMax !== currentStats.max) {
      this.stats.update((s) => ({ ...s, sum: s.sum + sumDelta, max: newMax }));
    }

    this.scheduleDraw();
  }

  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / this.cellSize);
    const row = Math.floor((event.clientY - rect.top) / this.cellSize);
    const index = row * MEMORY_CONFIG.GRID_SIZE + col;
    const newHovered = index >= 0 && index < MEMORY_CONFIG.TOTAL_BYTES ? index : -1;

    if (newHovered === this.hoveredIndex) return;

    const prev = this.hoveredIndex;
    this.hoveredIndex = newHovered;

    // Update custom tooltip
    if (this.hoveredIndex !== -1) {
      const val = this.values[this.hoveredIndex];
      const hex = val.toString(16).toUpperCase().padStart(2, '0');
      const isLocked = this.locked[this.hoveredIndex];
      const content = isLocked
        ? `LOCKED — 0x${hex} | ${val} | Click to unlock`
        : `0x${hex} | ${val} | Click to lock`;
      this.tooltipContent.set(content);
      this.tooltipX.set(event.offsetX);
      this.tooltipY.set(event.offsetY);
      this.tooltipVisible.set(true);
    } else {
      this.tooltipVisible.set(false);
    }

    // Redraw both cells immediately — hover feedback should not wait for rAF batch
    if (prev !== -1) this.drawCell(prev);
    if (this.hoveredIndex !== -1) this.drawCell(this.hoveredIndex);
  }

  onMouseLeave(): void {
    const prev = this.hoveredIndex;
    this.hoveredIndex = -1;
    this.tooltipVisible.set(false);
    if (prev !== -1) this.drawCell(prev);
  }

  onCanvasClick(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / this.cellSize);
    const row = Math.floor((event.clientY - rect.top) / this.cellSize);
    const index = row * MEMORY_CONFIG.GRID_SIZE + col;

    if (index >= 0 && index < MEMORY_CONFIG.TOTAL_BYTES) {
      this.toggleLock(index);
    }
  }

  toggleLock(index: number): void {
    const wasLocked = this.locked[index];
    this.locked[index] = !wasLocked;

    this.stats.update((s) => ({
      ...s,
      lockedCount: s.lockedCount + (wasLocked ? -1 : 1),
    }));

    this.dirtyIndices.add(index);
    this.scheduleDraw();
  }

  protected averageValue = computed(() => {
    this.statsService.recordCalculation();
    return Math.round(this.stats().sum / MEMORY_CONFIG.TOTAL_BYTES);
  });

  protected maxValue = computed(() => {
    this.statsService.recordCalculation();
    return this.stats().max;
  });

  protected lockedCount = computed(() => {
    this.statsService.recordCalculation();
    return this.stats().lockedCount;
  });

  protected gridHealth = computed(() => {
    this.statsService.recordCalculation();
    const avgValue = this.averageValue();
    const lockedRatio = this.lockedCount() / MEMORY_CONFIG.TOTAL_BYTES;
    return Math.round((avgValue / 255) * 50 + (1 - lockedRatio) * 50);
  });

  protected gridFilter = computed(() => {
    this.statsService.recordCalculation();
    const brightness = 0.9 + (this.averageValue() / 255) * 0.2;
    return `brightness(${brightness})`;
  });
}
