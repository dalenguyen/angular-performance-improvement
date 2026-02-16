import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { inject } from '@angular/core';
import { StatsService } from '../services/stats.service';
import { CellIndicatorComponent } from './cell-indicator.component';
import { FormatBytePipe } from '../pipes/format-byte.pipe';

/**
 * Represents a single memory cell in the visualization grid.
 * Displays the byte value with color-coded background.
 */
@Component({
  selector: 'app-memory-cell',
  imports: [CellIndicatorComponent, FormatBytePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="memory-cell"
      [style.backgroundColor]="hexColor()"
      [style.borderColor]="borderColor()"
      [style.borderWidth]="borderWidth()"
      [style.opacity]="opacity()"
      [style.boxShadow]="boxShadow()"
      [class.locked]="isLocked()"
      [class]="cellClass()"
      (click)="cellClicked.emit()"
      role="button"
      tabindex="0"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltip()"
    >
      <app-cell-indicator
        [value]="value()"
        [isLocked]="isLocked()"
      />
      <span
        class="cell-value"
        [style.textShadow]="textShadow()"
        [style.color]="textColor()"
      >
        {{ value() | formatByte:'hex' }}
      </span>
    </div>
  `,
  styles: [`
    .memory-cell {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.1s ease;
      border: 1px solid rgba(0, 0, 0, 0.1);
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
      padding: 2px;
      contain: layout style paint;
      content-visibility: auto;
    }

    .memory-cell:hover {
      transform: scale(1.1);
      z-index: 10;
      border: 1px solid #00ffff;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }

    .memory-cell.locked {
      background-color: #ff0000 !important;
      border: 2px solid #ff6666;
    }

    .cell-value {
      font-size: clamp(0.4rem, 0.5vw, 0.7rem);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
      font-family: 'Courier New', monospace;
      white-space: nowrap;
      line-height: 1;
    }
  `]
})
export class MemoryCellComponent {
  value = input.required<number>();
  isLocked = input.required<boolean>();
  cellClicked = output<void>();

  private statsService = inject(StatsService);

  /**
   * Formats the byte value as a hex string (helper method)
   */
  private formatValue(): string {
    return this.value().toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Converts the byte value to a hex color string.
   */
  protected hexColor = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return '#ff0000';
    }

    const val = this.value();
    const r = Math.floor((val / 255) * 100 + 50);
    const g = Math.floor(Math.sin(val * 0.1) * 50 + 100);
    const b = Math.floor((1 - val / 255) * 155 + 100);

    return `rgb(${r}, ${g}, ${b})`;
  });

  /**
   * Gets the border color based on value
   */
  protected borderColor = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return '#ff6666';
    }

    const val = this.value();
    const intensity = val / 255;
    return intensity > 0.7 ? '#00ffff' : 'rgba(0, 0, 0, 0.1)';
  });

  /**
   * Gets the border width based on value
   */
  protected borderWidth = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return '2px';
    }

    const val = this.value();
    return val > 200 ? '2px' : '1px';
  });

  /**
   * Gets the opacity based on value
   */
  protected opacity = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return 1;
    }

    const val = this.value();
    return 0.7 + (val / 255) * 0.3;
  });

  /**
   * Gets the box shadow effect
   */
  protected boxShadow = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return '0 0 8px rgba(255, 0, 0, 0.5)';
    }

    const val = this.value();
    if (val > 220) {
      return '0 0 6px rgba(0, 255, 255, 0.4)';
    }
    return 'none';
  });

  /**
   * Gets the CSS class based on value range
   */
  protected cellClass = computed(() => {
    this.statsService.recordCalculation();

    const val = this.value();

    if (val > 200) {
      return 'memory-cell high-intensity';
    } else if (val > 100) {
      return 'memory-cell medium-intensity';
    } else {
      return 'memory-cell low-intensity';
    }
  });

  /**
   * Gets the text shadow effect
   */
  protected textShadow = computed(() => {
    this.statsService.recordCalculation();

    const val = this.value();
    const shadowIntensity = val / 255;
    return `0 0 ${2 + shadowIntensity * 2}px rgba(0, 0, 0, ${0.5 + shadowIntensity * 0.3})`;
  });

  /**
   * Gets the text color for better contrast
   */
  protected textColor = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return 'rgba(255, 255, 255, 0.95)';
    }

    const val = this.value();
    return val > 150
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(255, 255, 255, 0.85)';
  });

  /**
   * Gets the ARIA label for accessibility
   */
  protected ariaLabel = computed(() => {
    this.statsService.recordCalculation();

    const hexValue = this.formatValue();
    const decValue = this.value();
    const status = this.isLocked() ? 'locked' : 'unlocked';

    return `Memory cell: hex ${hexValue}, decimal ${decValue}, ${status}`;
  });

  /**
   * Gets the tooltip text
   */
  protected tooltip = computed(() => {
    this.statsService.recordCalculation();

    const hexValue = this.formatValue();
    const decValue = this.value();

    if (this.isLocked()) {
      return `LOCKED - Hex: 0x${hexValue} | Dec: ${decValue} | Click to unlock`;
    }

    return `Hex: 0x${hexValue} | Dec: ${decValue} | Click to lock`;
  });
}
