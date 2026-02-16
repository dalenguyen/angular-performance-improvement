import { Component, input, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { StatsService } from '../services/stats.service';

/**
 * Visual indicator component for memory cells.
 * Displays a small colored dot showing cell intensity.
 */
@Component({
  selector: 'app-cell-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="indicator"
      [style.backgroundColor]="indicatorColor()"
      [style.transform]="indicatorTransform()"
      [title]="indicatorTooltip()"
    ></div>
  `,
  styles: [`
    .indicator {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      transition: transform 0.2s ease;
      pointer-events: none;
    }
  `]
})
export class CellIndicatorComponent {
  value = input.required<number>();
  isLocked = input.required<boolean>();

  private statsService = inject(StatsService);

  /**
   * Gets the indicator color based on cell value
   */
  protected indicatorColor = computed(() => {
    this.statsService.recordCalculation();

    if (this.isLocked()) {
      return '#ff0000';
    }

    const val = this.value();
    if (val > 200) {
      return '#00ff00';
    } else if (val > 100) {
      return '#ffff00';
    } else {
      return '#ff6600';
    }
  });

  /**
   * Gets the indicator transform effect
   */
  protected indicatorTransform = computed(() => {
    this.statsService.recordCalculation();

    const val = this.value();
    return val > 200 ? 'scale(1.5)' : 'scale(1)';
  });

  /**
   * Gets the indicator tooltip
   */
  protected indicatorTooltip = computed(() => {
    this.statsService.recordCalculation();

    const val = this.value();
    if (val > 200) {
      return 'High intensity';
    } else if (val > 100) {
      return 'Medium intensity';
    } else {
      return 'Low intensity';
    }
  });
}
