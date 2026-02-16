import { Pipe, PipeTransform, inject } from '@angular/core';
import { StatsService } from '../services/stats.service';

/**
 * Formats byte values in different number systems (hex, binary, octal)
 */
@Pipe({
  name: 'formatByte',
})
export class FormatBytePipe implements PipeTransform {
  private statsService = inject(StatsService);

  transform(value: number, format: 'hex' | 'binary' | 'octal' = 'hex'): string {
    this.statsService.recordCalculation();

    switch (format) {
      case 'hex':
        return '0x' + this.padLeft(value.toString(16).toUpperCase(), 2, '0');

      case 'binary':
        const binary = value.toString(2).padStart(8, '0');
        return '0b' + this.formatWithSeparator(binary, 4, ' ');

      case 'octal':
        return '0o' + this.padLeft(value.toString(8), 3, '0');

      default:
        return value.toString();
    }
  }

  /**
   * Pads a string to the left with a character
   */
  private padLeft(str: string, length: number, char: string): string {
    let result = str;
    while (result.length < length) {
      result = char + result;
    }
    return result;
  }

  /**
   * Formats a string with separators at regular intervals
   */
  private formatWithSeparator(str: string, groupSize: number, separator: string): string {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      if (i > 0 && i % groupSize === 0) {
        result += separator;
      }
      result += str[i];
    }
    return result;
  }
}
