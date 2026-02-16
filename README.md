# Angular Performance Assessment

A real-time memory visualization dashboard built with Angular 21+. This assessment evaluates your ability to identify and fix performance bottlenecks in a angular applications.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Measure performance
npm run grade
```

Open `http://localhost:4200` to see the application.

## The Challenge

This application visualizes 4,096 bytes of memory as a 64×64 grid with real-time updates. **The codebase contains intentional performance issues** - your task is to optimize it while maintaining all functionality.

### Symptoms

- Browser becomes sluggish at default settings (100ms update rate)
- High computational overhead from inefficient patterns
- Long tasks blocking the main thread
- Excessive change detection cycles
- Large bundle size

### Requirements

**You must:**
- ✅ Maintain all features (cell rendering, locking, statistics, slider)
- ✅ Improve performance across measured metrics
- ✅ Preserve accessibility (ARIA attributes, keyboard navigation)
- ✅ Follow Angular best practices

**You should not:**
- ❌ Remove functionality or features
- ❌ Hardcode values or cheat the metrics
- ❌ Break existing behavior

## Evaluation Criteria

Your submission will be evaluated across three dimensions, each scored 0-5:

### 1. Performance (0-5)

Optimization effectiveness measured across:
- **Rendering Operations** - Angular change detection overhead (local: `npm run grade`)
- **Bundle size** - Production build efficiency (local: `npm run grade`)
- **Core Web Vitals** - LCP, CLS, INP (GitHub Actions: Lighthouse)
- **Long tasks** - UI blocking >50ms (GitHub Actions: Lighthouse)
- **Total Blocking Time** - UI responsiveness (GitHub Actions: Lighthouse)

| Score | Impact |
|-------|--------|
| **5** | Exceptional: dramatic improvements across all metrics |
| **4** | Excellent: strong improvements in all key areas |
| **3** | Good: meaningful optimization with measurable gains |
| **2** | Basic: some improvements but significant overhead remains |
| **1** | Minimal: surface-level changes with little impact |
| **0** | None: no meaningful optimization |

### 2. Code Quality (0-5)

How well you apply Angular best practices and software engineering principles:

| Score | Description |
|-------|-------------|
| **5** | Flawless: modern patterns, perfect typing, excellent architecture |
| **4** | Strong: best practices throughout, clean structure |
| **3** | Solid: mostly good patterns, minor issues |
| **2** | Weak: mixed patterns, structural issues |
| **1** | Poor: outdated patterns, weak organization |
| **0** | Bad: anti-patterns, broken architecture |

**Evaluated:**
- Modern vs legacy Angular patterns
- TypeScript usage and type safety
- Code organization and architecture
- Separation of concerns

### 3. Craftsmanship (0-5)

Professional polish and attention to detail:

| Score | Description |
|-------|-------------|
| **5** | Exceptional: elegant, concise, professional-grade work |
| **4** | Excellent: clean, well-crafted, thoughtful implementation |
| **3** | Good: functional, maintainable, complete |
| **2** | Basic: works but rough, minimal attention to detail |
| **1** | Poor: sloppy execution, corners cut |
| **0** | Fail: broken features, degraded functionality |

**Evaluated:**
- Git commit quality and history
- Accessibility maintained (ARIA, keyboard navigation, semantics)
- Code elegance and conciseness
- Error handling and edge cases
- Documentation where appropriate

---

## Measured Metrics

Run `npm run grade` to measure your optimizations locally.

**Example output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFORMANCE RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rendering Operations: 456
Bundle Size: 245.0 KB
kops: 0.0152 (thousand operations per second)

--- Fingerprints ---
Machine: a1b2c3d4e5f6g7h8 (darwin/arm64, 10 CPUs)
Code: 3ead092c1a2b (git)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Metrics explained:**
- **Rendering Operations** - Total rendering work measured via DOM mutations over 30 seconds
- **Bundle Size** - Production build size (all JS files)
- **kops** - Throughput metric (thousand operations per second)

## Testing Your Work

### Local Testing

Run `npm run grade` for instant feedback:
- Builds production bundle and analyzes size
- Validates all features work
- Measures Web Performance Metrics using browser-native PerformanceObserver API
- Tracks Angular-specific metrics (change detection cycles, long tasks)

### Automated Testing

Notice that there is current no automated testing suite. This is intentional - we want you to focus on the performance optimization process, but you should add tests to ensure you don't break existing functionality.

## Viewing Results

### Local
```bash
npm run grade
```

## Submission

1. Push your final code to your forked repository
2. Submit by joining the follow-up Google meet, running ```bash npm run grade``` during the meeting and emailing a zip

## Tech Stack

- Angular 21+ (standalone components, signals)
- TypeScript (strict mode)
- RxJS (reactive streams)
- CSS Grid (64×64 responsive layout)

---

**Good luck!** Focus on identifying the root causes of performance issues and applying modern Angular patterns effectively.
