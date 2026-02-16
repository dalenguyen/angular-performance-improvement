#!/usr/bin/env node

/**
 * PERFORMANCE MEASUREMENT
 *
 * Measures current application performance by counting DOM mutations over 30 seconds.
 * Run at the start and end of the interview to compare improvements.
 *
 * Measurement Approach:
 * - Counts DOM mutations as proxy for rendering work completed
 * - More mutations = more rendering work processed in same time
 * - Optimized code (OnPush, trackBy, signals) processes updates faster
 * - kops = mutations / (measurementDuration / 1000) / 1000
 */

import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import os from 'os';

let server;
let browser;

function generateMachineFingerprint() {
  // Create a unique fingerprint for this machine
  const cpuModel = os.cpus()[0]?.model || 'unknown';
  const cpuCount = os.cpus().length;
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const totalMem = os.totalmem();

  const machineString = `${hostname}|${platform}|${arch}|${cpuModel}|${cpuCount}|${totalMem}`;
  const hash = createHash('sha256').update(machineString).digest('hex');

  return {
    hash: hash.substring(0, 16), // Short hash for display
    details: {
      platform,
      arch,
      cpus: cpuCount,
      hostname
    }
  };
}

async function generateCodeFingerprint() {
  try {
    // Try to get git commit hash first
    const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const gitShort = gitHash.substring(0, 12);

    // Check if there are uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const isDirty = status.length > 0;

    return {
      hash: gitShort + (isDirty ? '-dirty' : ''),
      type: 'git',
      dirty: isDirty
    };
  } catch (e) {
    // If git is not available, hash the src directory
    try {
      const srcPath = join(process.cwd(), 'src', 'app');
      const files = await getAllFiles(srcPath);
      const contents = await Promise.all(
        files.map(f => fs.readFile(f, 'utf8').catch(() => ''))
      );
      const combined = contents.join('\n');
      const hash = createHash('sha256').update(combined).digest('hex');

      return {
        hash: hash.substring(0, 12),
        type: 'content',
        dirty: false
      };
    } catch (err) {
      return {
        hash: 'unknown',
        type: 'error',
        dirty: false
      };
    }
  }
}

async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const res = join(dir, entry.name);
    return entry.isDirectory() ? getAllFiles(res) : res;
  }));
  return files.flat().filter(f => f.endsWith('.ts') || f.endsWith('.html'));
}

async function buildProduction() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BUILDING PRODUCTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    build.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log('[BUILD]:', output);
    });

    build.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('DeprecationWarning')) {
        console.log('[BUILD]:', output);
      }
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log('Production build complete\n');
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    setTimeout(() => reject(new Error('Build timeout')), 180000);
  });
}

async function analyzeBundleSize() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ANALYZING BUNDLE SIZE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const distPath = join(process.cwd(), 'dist/angular-interview-2/browser');

  try {
    const files = await fs.readdir(distPath);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.map'));

    let totalSize = 0;
    for (const file of jsFiles) {
      const stats = await fs.stat(join(distPath, file));
      totalSize += stats.size;
      console.log(`  ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
    }

    const totalKB = totalSize / 1024;
    console.log(`\nTotal bundle size: ${totalKB.toFixed(1)} KB\n`);
    return totalKB;
  } catch (error) {
    console.log('Warning: Could not analyze bundle size:', error.message);
    return 0;
  }
}

async function startServer() {
  console.log('Starting development server...\n');

  return new Promise((resolve, reject) => {
    server = spawn('npm', ['start'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let resolved = false;

    const checkOutput = (data) => {
      const output = data.toString();
      // Look for successful compilation message from dev server
      if (!resolved && (output.includes('Local:') || output.includes('localhost:4200'))) {
        console.log('[SERVER] Dev server ready, waiting 10s for full startup...\n');
        resolved = true;
        // Wait for dev server to fully stabilize
        setTimeout(resolve, 10000);
      }
    };

    server.stdout.on('data', checkOutput);
    server.stderr.on('data', checkOutput);

    setTimeout(() => reject(new Error('Server start timeout')), 90000);
  });
}

async function stopServer() {
  if (server) {
    server.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

function calculateKops(changeDetectionCycles, measurementDurationMs) {
  const cyclesPerSecond = changeDetectionCycles / (measurementDurationMs / 1000);
  return cyclesPerSecond / 1000;
}

async function measureApplication() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PERFORMANCE MEASUREMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Creating new page for measurement...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Log browser console for debugging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[MONITOR]')) {
      console.log('[BROWSER]:', text);
    }
  });

  console.log('Loading application...');
  const startLoad = Date.now();

  await Promise.race([
    page.goto('http://localhost:4200', { waitUntil: 'domcontentloaded', timeout: 20000 }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), 20000))
  ]).catch(async (e) => {
    const url = await page.url();
    if (!url.includes('localhost:4200')) {
      throw e;
    }
  });
  const loadTime = Date.now() - startLoad;

  console.log('Waiting for application to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Injecting mutation observer to measure rendering throughput...');
  await page.evaluate(() => {
    window.performanceData = {
      cdCycleCount: 0,
      startTime: performance.now(),
      getMetrics: () => ({
        cdCycleCount: window.performanceData.cdCycleCount,
        duration: performance.now() - window.performanceData.startTime
      })
    };

    const setupObserver = setInterval(() => {
      const gridContainer = document.querySelector('.grid-container');
      if (gridContainer) {
        const observer = new MutationObserver((mutations) => {
          window.performanceData.cdCycleCount += mutations.length;
        });

        observer.observe(gridContainer, {
          subtree: true,
          characterData: true,
          childList: false,
          attributes: false
        });

        console.log('[MONITOR] MutationObserver started - counting rendering work');
        clearInterval(setupObserver);
      }
    }, 100);

    setTimeout(() => clearInterval(setupObserver), 10000);
  });

  console.log('Collecting metrics for 30 seconds...\n');

  const samples = [];
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      const sample = await page.evaluate(() => window.performanceData.getMetrics());
      samples.push(sample);
      const currentKops = (sample.cdCycleCount / (sample.duration / 1000) / 1000);
      console.log(`[${((i+1)*5).toString().padStart(2)}s] Mutations: ${sample.cdCycleCount}, Current kops: ${currentKops.toFixed(4)}`);
    } catch (e) {
      console.log(`Warning: Could not collect sample ${i+1}`);
    }
  }

  console.log('\nCollecting final performance data...');

  const rawMetrics = samples.length > 0
    ? {
        changeDetectionCycles: samples[samples.length - 1].cdCycleCount,
        measurementDuration: samples[samples.length - 1].duration
      }
    : {
        changeDetectionCycles: 0,
        measurementDuration: 30000
      };

  await page.close();

  return { ...rawMetrics, loadTime };
}

function displayResults(metrics, bundleSize, machineFingerprint, codeFingerprint) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PERFORMANCE RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Rendering Operations: ' + metrics.changeDetectionCycles);
  console.log('Bundle Size: ' + bundleSize.toFixed(1) + ' KB');

  const measurementDuration = metrics.measurementDuration || 30000;
  const kops = calculateKops(metrics.changeDetectionCycles, measurementDuration);
  console.log('kops: ' + kops.toFixed(4) + ' (thousand operations per second)');

  console.log('\n--- Fingerprints ---');
  console.log('Machine: ' + machineFingerprint.hash + ' (' + machineFingerprint.details.platform + '/' + machineFingerprint.details.arch + ', ' + machineFingerprint.details.cpus + ' CPUs)');
  console.log('Code: ' + codeFingerprint.hash + (codeFingerprint.dirty ? ' [UNCOMMITTED CHANGES]' : '') + ' (' + codeFingerprint.type + ')');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return kops;
}

async function run() {
  try {
    // Generate fingerprints
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('GENERATING FINGERPRINTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const machineFingerprint = generateMachineFingerprint();
    const codeFingerprint = await generateCodeFingerprint();

    console.log('Machine fingerprint: ' + machineFingerprint.hash);
    console.log('Code fingerprint: ' + codeFingerprint.hash + (codeFingerprint.dirty ? ' [UNCOMMITTED CHANGES]' : ''));
    console.log('');

    // Start development server
    await startServer();

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 300000
    });

    // Measure performance
    const metrics = await measureApplication();

    await browser.close();
    await stopServer();

    // Build production and measure bundle size
    await buildProduction();
    const bundleSize = await analyzeBundleSize();

    // Display results
    const kops = displayResults(metrics, bundleSize, machineFingerprint, codeFingerprint);

    console.log('✓ Measurement complete');
    console.log(`\nRecord this score: ${kops.toFixed(4)} kops`);
    console.log(`Machine: ${machineFingerprint.hash} | Code: ${codeFingerprint.hash}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\nError:', error.message);

    if (browser) await browser.close();
    await stopServer();
    process.exit(1);
  }
}

run();
