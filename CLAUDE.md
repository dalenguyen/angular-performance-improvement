# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 21+ performance assessment application that visualizes 4,096 bytes of memory as a 64×64 grid with real-time updates. **The codebase intentionally contains performance bottlenecks** that need to be identified and optimized while maintaining all functionality.

## Essential Commands

### Development
```bash
npm install          # Install dependencies
npm start            # Start dev server on http://localhost:4200
npm run build        # Production build
```

### Performance Measurement
```bash
npm run grade        # Run complete performance assessment
```

The grading script:
1. Builds production bundle and measures size
2. Starts dev server and launches headless browser via Puppeteer
3. Measures rendering operations via MutationObserver over 30 seconds
4. Calculates kops (thousand operations per second) = mutations / duration / 1000
5. Generates machine and code fingerprints for reproducibility

### Testing
Currently no automated test suite exists. When adding tests, use Vitest (configured as dev dependency).

## Architecture

### Core Data Flow
1. **MemoryStreamService** generates random byte arrays (4,096 bytes) at configurable intervals
2. **MemoryGridComponent** subscribes to stream and updates 64×64 grid of **MemoryCellComponent**s
3. **StatsService** tracks computational operations by counting method calls
4. **PerformanceMonitorService** exposes performance data for measurement

### Component Structure
```
App (root)
├── MemoryGridComponent (displays 4,096 cells)
│   ├── MemoryCellComponent (×4096 - individual byte visualization)
│   └── CellIndicatorComponent (visual indicators)
└── Grid statistics (average, max, locked count, health)
```

### State Management
- Uses Angular signals (`signal()`, `computed()`) for reactive state
- All components use `ChangeDetectionStrategy.OnPush`
- Memory cells stored as `signal<MemoryCell[]>` where each cell has `value` and `isLocked`

### Key Services

**MemoryStreamService**
- Generates random memory data stream via RxJS `interval()` + `map()`
- Configurable update rate (default 100ms, minimum 10ms)
- Uses lodash for utilities (may be performance bottleneck)

**StatsService**
- Records computational operations via `recordCalculation()`
- Calculates "power draw" (kOps/sec) every second
- Uses plain number counter to avoid SSR issues

**PerformanceMonitorService**
- Exposed to window object for testing (`window.performanceMonitor`)
- Used by grading script to collect metrics

### Performance Bottlenecks (Intentional)

The codebase contains patterns that cause:
- Excessive change detection cycles
- Inefficient computations in template bindings
- Large bundle size (unnecessary dependencies)
- Long tasks blocking main thread
- Missing trackBy functions
- Inefficient array operations

### Requirements & Constraints

**Must preserve:**
- All features: cell rendering, locking mechanism, statistics display, update rate slider
- Accessibility: ARIA attributes, keyboard navigation
- Visual appearance and behavior

**Optimization targets:**
- Reduce rendering operations (measured by DOM mutations)
- Decrease bundle size (production build)
- Improve kops score
- Reduce long tasks (>50ms)
- Follow Angular best practices (signals, OnPush, trackBy, etc.)

## Technology Stack

- **Angular 21+**: Standalone components, signals API, modern control flow (@for, @if)
- **TypeScript**: Strict mode enabled
- **RxJS 7.8**: Reactive streams for data flow
- **Angular Material**: UI components (buttons, sliders, cards)
- **CSS Grid**: Responsive 64×64 layout
- **Chart.js**: Available for future charting features
- **lodash, moment**: Utility libraries (consider removing if unused)

## File Organization

```
src/app/
├── app.ts                          # Root component
├── app.config.ts                   # App configuration
├── components/
│   ├── memory-grid.component.ts    # Main grid (4,096 cells)
│   ├── memory-cell.component.ts    # Individual cell
│   └── cell-indicator.component.ts # Visual indicators
├── services/
│   ├── memory-stream.service.ts    # Data generation
│   ├── stats.service.ts            # Performance tracking
│   └── performance-monitor.service.ts
└── pipes/
    └── format-byte.pipe.ts         # Byte formatting
```

## TypeScript Configuration

- Strict mode enabled with all strict flags
- `experimentalDecorators` for Angular
- Target: ES2022
- Angular compiler options: strict templates, strict injection parameters

## Performance Measurement Details

The grading script (`test-performance-observer.mjs`):
- Uses Puppeteer to launch headless Chrome
- Injects MutationObserver to count DOM mutations in `.grid-container`
- Samples metrics every 5 seconds for 30 seconds total
- Calculates kops: `(mutations / measurementDurationMs * 1000) / 1000`
- Generates fingerprints: machine hash (CPU, platform, memory) + code hash (git commit or content hash)

**Key metrics:**
- **Rendering Operations**: Total DOM mutations (lower is better for same visual result)
- **Bundle Size**: Sum of all .js files in production build
- **kops**: Throughput metric (higher is better after optimization)

## Common Optimization Strategies

When optimizing this codebase, consider:
- Using `trackBy` functions in `@for` loops to prevent unnecessary re-renders
- Moving computations out of templates into `computed()` signals
- Removing unnecessary dependencies to reduce bundle size
- Avoiding method calls in template bindings
- Using `OnPush` change detection effectively
- Minimizing array spreading and copying operations
- Leveraging signal-based reactivity instead of observables where appropriate
