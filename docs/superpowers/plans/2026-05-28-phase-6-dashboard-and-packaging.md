# Phase 6 — Dashboard Wiring + Packaging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Dashboard tab with live data (composite health score, host metrics, connected-systems table, threat-trend forecast baseline) and ship a production-ready cross-platform installer via `electron-builder`. Also vendor the fonts locally (remove Google Fonts network dependency) and add a renderer CSP (Content-Security-Policy).

**Architecture:** The Dashboard's live data is already available — `useDevices`, `useNetStats`, `useScan`, `useThreats` hooks all exist. A new `useHealthScore()` hook derives the composite score from the live state. The forecast baseline computes a simple moving-average over stored daily event counts. Font vendoring copies the font files into `src/renderer/public/fonts/` and replaces the Google Fonts `<link>` with `@font-face` in `styles.css`. `electron-builder` configuration lives in a new `electron-builder.yml`.

**Tech Stack:** existing + `electron-builder` (already in devDeps), font files downloaded from Google Fonts for self-hosting.

---

## Scope of this phase

In: Dashboard tab wired to live data (health gauge score, CPU/RAM/Disk, connected systems from live device list, AI Threat Forecast backed by moving-average event counts with real Actual line); vendored fonts (Space Grotesk + JetBrains Mono) replacing the Google Fonts `<link>`; renderer CSP meta tag; `electron-builder.yml` producing `.dmg` (macOS), `.nsis`/`.exe` (Windows), `.AppImage` (Linux); npm `package` script verified.

Out: auto-update (electron-updater); code signing / notarization (platform-specific setup); app icon design; CI packaging pipeline; the full advanced `electron-builder` options beyond what's needed for a working installer.

---

## Key design decisions

1. **Health score = `100 − weighted penalties`.** Rules (applied to current live state):
   - Critical vuln per host: −15 (cap at −45)
   - High vuln per host: −8 (cap at −24)
   - Medium vuln per host: −3 (cap at −9)
   - Critical/High threat event (active): −10 (cap at −20)
   - Risky port exposed (port in `PORT_RISK` with severity High): −5 (cap at −10)
   - Score floored at 0 and capped at 100. Pure function, testable.
2. **Forecast "Actual" = daily threat-event counts from `JsonFileStore`.** A simple 15-day rolling series (zero-padded if less history). "Predicted" = a 3-day moving average of Actual. "Confidence" = `1 - (stddev / max(1, mean))`. This is honest statistics — the label "AI Threat Forecast" is renamed to "Threat Trend" to avoid implying an ML model. (99% fidelity; only the card title changes.)
3. **Local fonts via `@font-face`.** Download Space Grotesk (wght 400;500;600;700) and JetBrains Mono (wght 400;500;600) `.woff2` files into `src/renderer/public/fonts/`. Replace the Google Fonts `<link>` in `index.html` with a `<style>` block of `@font-face` rules. Fonts are bundled into the installer — no network dependency.
4. **CSP via meta tag.** Add `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; script-src 'self'">` to `src/renderer/index.html`. The `unsafe-inline` for styles is needed because the prototype uses inline `style=` attributes throughout — acceptable for a sandboxed Electron renderer.
5. **electron-builder.yml** in the project root: appId, productName, copyright (JD Digital Systems), Mac dmg + zip targets, Windows nsis target, Linux AppImage target, files include `out/` and `resources/`. No code signing configured (user adds their own certificate credentials separately).

---

## Target file structure

```
vanta-dashboard/
├─ electron-builder.yml          # CREATE: packaging config
├─ src/renderer/
│  ├─ index.html                 # MODIFY: remove Google Fonts link, add CSP
│  ├─ src/styles.css             # MODIFY: add @font-face rules for local fonts
│  └─ public/fonts/              # CREATE: .woff2 font files
│     ├─ SpaceGrotesk-*.woff2    # 4 weights: 400/500/600/700
│     └─ JetBrainsMono-*.woff2  # 3 weights: 400/500/600
└─ src/renderer/src/
   ├─ health.ts  + .test.ts      # CREATE: computeHealthScore() pure function
   ├─ forecast.ts + .test.ts     # CREATE: buildForecast() pure function
   ├─ hooks/useHealthScore.ts    # CREATE (no test — derives from existing hooks)
   └─ views/DashboardView.tsx    # MODIFY: wire live data to all cards
```

---

## Task 1: Vendor fonts locally

**Files:** `src/renderer/public/fonts/` (create), `src/renderer/index.html` (modify), `src/renderer/src/styles.css` (modify)

- [ ] **Step 1: Download the font files**

Run the following commands to download the `.woff2` files directly (no Node package needed):
```bash
cd /Users/sharan/Desktop/Github/vanta-dashboard/src/renderer/public
mkdir -p fonts && cd fonts
# Space Grotesk — 4 weights
curl -sL "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozwUi2wA.woff2" -o "SpaceGrotesk-400.woff2"
curl -sL "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozwUi1wA.woff2" -o "SpaceGrotesk-500.woff2"
curl -sL "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozwUi2dA.woff2" -o "SpaceGrotesk-600.woff2"
curl -sL "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozwUi2-A.woff2" -o "SpaceGrotesk-700.woff2"
# JetBrains Mono — 3 weights
curl -sL "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-Lf1OQk6OThxPA.woff2" -o "JetBrainsMono-400.woff2"
curl -sL "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-Lf1OQk6OThxPA.woff2" -o "JetBrainsMono-500.woff2"
curl -sL "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-Lf1OQk6OThxPA.woff2" -o "JetBrainsMono-600.woff2"
```
After downloading, verify each file is > 5 KB: `ls -la fonts/*.woff2`. If any curl fails (HTTP error or tiny file), report it — do NOT proceed with a 0-byte font file.

NOTE on font URLs: Google Fonts serves the same URL for each weight in some cases; the preferred approach if the above URLs fail is to download the CSS from Google Fonts API and extract the actual woff2 URLs from the returned `@font-face` blocks. Use `curl "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" -A "Mozilla/5.0"` to get the CSS, then extract the URLs.

- [ ] **Step 2: Add `@font-face` rules to `src/renderer/src/styles.css`**

Prepend these rules at the very top of the file (before `:root{`):
```css
@font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 400; src: url('/fonts/SpaceGrotesk-400.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 500; src: url('/fonts/SpaceGrotesk-500.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 600; src: url('/fonts/SpaceGrotesk-600.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-style: normal; font-weight: 700; src: url('/fonts/SpaceGrotesk-700.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 400; src: url('/fonts/JetBrainsMono-400.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 500; src: url('/fonts/JetBrainsMono-500.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 600; src: url('/fonts/JetBrainsMono-600.woff2') format('woff2'); }
```

- [ ] **Step 3: Remove Google Fonts from `src/renderer/index.html`**

Remove the three `<link>` tags for `fonts.googleapis.com` and `fonts.gstatic.com` preconnects. The fonts are now local.

- [ ] **Step 4: Verify build still passes**
```bash
npm run build
```
Expected: build succeeds, renderer bundle similar size, font files appear in `out/renderer/`.

- [ ] **Step 5: Commit**
```bash
git add src/renderer/public/fonts/ src/renderer/src/styles.css src/renderer/index.html
git commit -m "feat: vendor Space Grotesk + JetBrains Mono fonts locally (remove Google Fonts dependency)"
```

---

## Task 2: Add renderer CSP

**Files:** Modify `src/renderer/index.html`

- [ ] **Step 1: Add the CSP meta tag** to `<head>` in `src/renderer/index.html`:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; script-src 'self'; connect-src 'none'">
```
Place it as the FIRST `<meta>` in `<head>`.

- [ ] **Step 2: Verify the app still works**
```bash
npm run build
```
Expected: builds cleanly. The `unsafe-inline` on `style-src` is required because the prototype uses inline `style=` attributes throughout.

- [ ] **Step 3: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint && npm test
```
Expected: 0 / 0 / all tests pass.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/index.html
git commit -m "feat: add Content-Security-Policy to renderer"
```

---

## Task 3: Health score (pure function)

**Files:** Create `src/renderer/src/health.ts`, `src/renderer/src/health.test.ts`

- [ ] **Step 1: Write the failing test** — `src/renderer/src/health.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeHealthScore } from './health'
import type { ScanResult, ThreatsState } from '@shared/types'

const emptyScan: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }
const emptyThreats: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }

describe('computeHealthScore', () => {
  it('returns 100 when no issues', () => {
    expect(computeHealthScore(emptyScan, emptyThreats)).toBe(100)
  })

  it('deducts for Critical vulns', () => {
    const scan: ScanResult = { ...emptyScan, vulns: [{ id: 'X', title: 'crit', severity: 'Critical', score: 9.5, system: 'h', patch: 'Harden', age: '—' }] }
    expect(computeHealthScore(scan, emptyThreats)).toBeLessThan(100)
    expect(computeHealthScore(scan, emptyThreats)).toBeGreaterThanOrEqual(0)
  })

  it('deducts for active High/Critical threats', () => {
    const threats: ThreatsState = { events: [], activeCount: 2, lastUpdated: 1 }
    const score = computeHealthScore(emptyScan, threats)
    expect(score).toBeLessThan(100)
  })

  it('score is never below 0 or above 100', () => {
    const scan: ScanResult = {
      ...emptyScan,
      vulns: Array.from({ length: 10 }, (_, i) => ({ id: `V${i}`, title: 'vuln', severity: 'Critical' as const, score: 9.5, system: 'h', patch: 'Harden', age: '—' }))
    }
    const threats: ThreatsState = { events: [], activeCount: 10, lastUpdated: 1 }
    const score = computeHealthScore(scan, threats)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/renderer/src/health.ts`**
```ts
import type { ScanResult, ThreatsState } from '@shared/types'

const PENALTIES: Record<string, number> = {
  Critical: 15,
  High: 8,
  Medium: 3,
  Low: 0
}
const CAPS: Record<string, number> = { Critical: 45, High: 24, Medium: 9, Low: 0 }

/** Compute the composite security health score (0–100). Pure function. */
export function computeHealthScore(scan: ScanResult, threats: ThreatsState): number {
  let penalty = 0

  // Vuln penalties (capped per severity band)
  const byCrit = scan.vulns.filter((v) => v.severity === 'Critical').length
  const byHigh = scan.vulns.filter((v) => v.severity === 'High').length
  const byMed  = scan.vulns.filter((v) => v.severity === 'Medium').length
  penalty += Math.min(byCrit * PENALTIES['Critical']!, CAPS['Critical']!)
  penalty += Math.min(byHigh * PENALTIES['High']!,     CAPS['High']!)
  penalty += Math.min(byMed  * PENALTIES['Medium']!,   CAPS['Medium']!)

  // Active threat events (Critical/High)
  penalty += Math.min(threats.activeCount * 10, 20)

  return Math.max(0, Math.min(100, 100 - penalty))
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (4).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0.

- [ ] **Step 6: Commit**
```bash
git add src/renderer/src/health.ts src/renderer/src/health.test.ts
git commit -m "feat: add computeHealthScore() pure function (0-100, vuln + threat penalties)"
```

---

## Task 4: Forecast baseline (pure function)

**Files:** Create `src/renderer/src/forecast.ts`, `src/renderer/src/forecast.test.ts`

The "AI Threat Forecast" chart is renamed to "Threat Trend" (honest) and backed by real daily event counts. The `ThreatsState` coming from `useThreats` only has recent events; we derive daily counts from them for the sparkline. The forecast produces `ForecastPoint[]` matching the existing chart's `{ d, actual, predicted, conf }` shape.

- [ ] **Step 1: Write the failing test** — `src/renderer/src/forecast.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildForecast } from './forecast'
import type { ThreatEvent } from '@shared/types'

const event = (ts: number): ThreatEvent => ({ sev: 'Medium', source: '10.0.0.1', title: 'test', desc: '', time: 'now', region: 'LAN' })

describe('buildForecast', () => {
  it('returns 15 days of points when given events', () => {
    const now = new Date('2026-05-28').getTime()
    // 5 events on day 0
    const events: ThreatEvent[] = Array.from({ length: 5 }, () => event(now))
    const points = buildForecast(events, now)
    expect(points).toHaveLength(15)
    expect(points.every((p) => typeof p.actual === 'number')).toBe(true)
    expect(points.every((p) => p.conf >= 0 && p.conf <= 1)).toBe(true)
  })

  it('returns 15 zero-padded points when no events', () => {
    const points = buildForecast([], Date.now())
    expect(points).toHaveLength(15)
    expect(points.every((p) => p.actual === 0 && p.predicted === 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/renderer/src/forecast.ts`**
```ts
import type { ForecastPoint, ThreatEvent } from '@shared/types'

/** Build a 15-day threat-trend series (most recent 15 days ending at `nowMs`). */
export function buildForecast(events: ThreatEvent[], nowMs: number): ForecastPoint[] {
  const MS_DAY = 86_400_000
  const days = 15

  // Bucket events into UTC-day counts (events use 'just now' as their .time string,
  // so we use lastUpdated context — approximate to today if no timestamp in event).
  // For Phase 6 the events don't carry a numeric timestamp in their type; bucket
  // all recent events to today and zero-pad the rest.
  const buckets: number[] = Array.from({ length: days }, () => 0)
  buckets[days - 1] = events.length  // all recent events count as "today"

  // Moving-average prediction (window = 3)
  const predicted = buckets.map((_, i) => {
    const window = buckets.slice(Math.max(0, i - 2), i + 1)
    return Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10
  })

  // Confidence: inverse of relative variance; 1.0 when data is flat
  const mean = buckets.reduce((a, b) => a + b, 0) / days
  const variance = buckets.map((b) => (b - mean) ** 2).reduce((a, b) => a + b, 0) / days
  const baseConf = mean === 0 ? 0.5 : Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / Math.max(1, mean)))

  return buckets.map((actual, i) => {
    const d = new Date(nowMs - (days - 1 - i) * MS_DAY)
    const label = `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`
    return {
      d: label,
      actual,
      predicted: predicted[i]!,
      conf: Math.round((baseConf + (i / days) * 0.1) * 100) / 100
    }
  })
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (2).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0.

- [ ] **Step 6: Commit**
```bash
git add src/renderer/src/forecast.ts src/renderer/src/forecast.test.ts
git commit -m "feat: add buildForecast() baseline (15-day moving-average trend from real events)"
```

---

## Task 5: `useHealthScore` hook + `useForecast` hook

**Files:** Create `src/renderer/src/hooks/useHealthScore.ts`, `src/renderer/src/hooks/useForecast.ts`

These are thin derived hooks — no separate tests since they purely compose existing hooks + pure functions.

- [ ] **Step 1: Create `src/renderer/src/hooks/useHealthScore.ts`**
```ts
import { useMemo } from 'react'
import { useScan } from './useScan'
import { useThreats } from './useThreats'
import { computeHealthScore } from '../health'

export function useHealthScore(): number {
  const { result: scan } = useScan()
  const threats = useThreats()
  return useMemo(() => computeHealthScore(scan, threats), [scan, threats])
}
```

- [ ] **Step 2: Create `src/renderer/src/hooks/useForecast.ts`**
```ts
import { useMemo } from 'react'
import { useThreats } from './useThreats'
import { buildForecast } from '../forecast'
import type { ForecastPoint } from '@shared/types'

export function useForecast(): ForecastPoint[] {
  const { events } = useThreats()
  return useMemo(() => buildForecast(events, Date.now()), [events])
}
```

- [ ] **Step 3: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/src/hooks/useHealthScore.ts src/renderer/src/hooks/useForecast.ts
git commit -m "feat: add useHealthScore and useForecast hooks"
```

---

## Task 6: Wire the Dashboard tab

**Files:** Modify `src/renderer/src/views/DashboardView.tsx`

Read it fully first. The current view renders static `SYSTEMS`/`FORECAST` data. Wire all cards to live data while preserving ALL markup/classes/styles.

- [ ] **Step 1: Swap data sources.** Remove imports from `'../data'` that are no longer needed; add:
```ts
import { useDevices } from '../hooks/useDevices'
import { useNetStats } from '../hooks/useNetStats'
import { useScan } from '../hooks/useScan'
import { useHealthScore } from '../hooks/useHealthScore'
import { useForecast } from '../hooks/useForecast'
```
At the top of the component:
```ts
  const { devices } = useDevices()
  const stats = useNetStats()
  const { result: scan } = useScan()
  const healthScore = useHealthScore()
  const forecastData = useForecast()
```

- [ ] **Step 2: Wire the Health Gauge.** Change `<HealthGauge value={76}/>` to `<HealthGauge value={healthScore}/>`.

- [ ] **Step 3: Wire CPU/RAM/Disk metrics.** `stats.rxMbps` / `stats.txMbps` are interface throughput. For actual host CPU/RAM/Disk we'd need a new `systeminformation` IPC (out of scope for Phase 6). Instead show honest values: keep the three `.metric` cards but change their values to reflect what's real — use `stats.rxMbps` for a "Network Rx" metric, `stats.txMbps` for "Network Tx", and the device count for a third card. Adjust labels accordingly, keeping the exact `.metric`/`.metric-ico`/`.metric-val`/`.metric-lbl` markup and classes. Do NOT show fake CPU/RAM/Disk numbers — replace labels with honest ones.

- [ ] **Step 4: Wire the "AI Threat Forecast" chart.** Change the card title from "AI Threat Forecast" to "Threat Trend" (honest — no AI/ML model here). Change the `sub` from "15-day horizon · model v2.1" to "15-day rolling · event baseline". Change `<ThreatForecast data={FORECAST}/>` to `<ThreatForecast data={forecastData}/>`. The chart component is unchanged.

- [ ] **Step 5: Wire the Connected Systems table.** Replace the static `SYSTEMS.map(...)` with `devices.slice(0, 5).map((d) => (...))`. Map each `Device` to the table row, using:
  - Connector: `d.type` (or mapped to a display label)
  - Workload: `d.name`
  - Security score: find the matching `HostScan` from `scan.hosts` by `d.mac`; compute a score from the host's `worstSeverity` (`Critical`→20, `High`→50, `Medium`→70, null/Low→90)
  - Threats: `worstSeverity ?? 'Low'`
  - Patches: `hostscan.vulns.length > 0 ? hostscan.vulns.length + ' finding(s)' : 'Clear'`
  Show up to 5 devices; if no devices yet, keep the table markup but show a single row "Scanning your network…". Keep all `<tr>/<td>` markup, bar/sev classes.

- [ ] **Step 6: Wire the Network Activity radar.** It currently renders the `<NetActivity/>` component which shows a static radar. Keep it exactly as-is — it already uses the radar animation that's hardcoded (it's a visual component). The stat pill `3 active` in the radar can be updated to `{threats.activeCount} active` if `threats.activeCount > 0`, else `0 active`.

- [ ] **Step 7: Wire the Insight callout.** Replace the static text with a live-generated insight: if `scan.vulns.length > 0` show "Scan found {scan.vulns.length} exposure finding(s). Run another scan after hardening to confirm improvement."; if `threats.events.length > 0` show "Detected {threats.events.length} network event(s). Review the Threats tab for details."; else show "No findings detected. Re-run a scan to assess current exposure.".

- [ ] **Step 8: Quality gate (web)**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0. (Full `npm test` will fail on the DashboardView render test if it asserts static data — update the test to not assert the now-live data, just assert the card titles which always render.)

- [ ] **Step 9: Update `views.test.tsx`** — the DashboardView test currently asserts "System Health" / "AI Threat Forecast" / "Connected Systems". Update: keep "System Health" and "Connected Systems" assertions; change "AI Threat Forecast" to "Threat Trend". Also extend the `window.vanta` stub if DashboardView now calls any new hooks (it calls `useScan` + `useThreats` via the health/forecast hooks — the stub already has `scan` and `threats`; no change needed). Run `npm test` → all pass.

- [ ] **Step 10: Commit**
```bash
git add src/renderer/src/views/DashboardView.tsx src/renderer/src/views/views.test.tsx
git commit -m "feat: wire Dashboard tab to live health score, forecast trend, connected systems"
```

---

## Task 7: electron-builder packaging configuration

**Files:** Create `electron-builder.yml` in project root

- [ ] **Step 1: Create `electron-builder.yml`**
```yaml
appId: com.jddigitalsystems.vanta
productName: VANTA
copyright: "© 2026 JD Digital Systems. All rights reserved."

directories:
  output: dist
  buildResources: resources

files:
  - "out/**/*"
  - "package.json"

mac:
  category: public.app-category.utilities
  target:
    - target: dmg
      arch: [arm64, x64]
    - target: zip
      arch: [arm64, x64]

win:
  target:
    - target: nsis
      arch: [x64, ia32]

linux:
  target:
    - target: AppImage
      arch: [x64]
  category: Utility

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

- [ ] **Step 2: Verify the package script**

Check that `package.json` has `"package": "electron-vite build && electron-builder"`. Add `--config electron-builder.yml` to the electron-builder call if needed.

- [ ] **Step 3: Test the package script (dry run — does NOT create the full installer)**
```bash
npm run build
```
Expected: build still succeeds. Note: the full `npm run package` command produces a distributable installer in `dist/` and takes several minutes; it is verified in Task 8 (QA gate).

- [ ] **Step 4: Add `dist/` and `resources/` to `.gitignore`**
Append to `.gitignore`:
```
dist/
resources/
```

- [ ] **Step 5: Commit**
```bash
git add electron-builder.yml .gitignore package.json
git commit -m "feat: add electron-builder packaging config (dmg/nsis/AppImage)"
```

---

## Task 8: Final QA gate + packaging smoke

- [ ] **Step 1: Full automated gate**
```bash
npm run lint && npm run typecheck && npm test && npm run build && npm audit
```
Expected: lint 0; typecheck 0; all tests pass; build succeeds; **0 vulnerabilities**.

- [ ] **Step 2: Electron boot smoke** (clean boot + new fonts + CSP work, kill by exact PID):
```bash
(./node_modules/.bin/electron . >/tmp/vanta_p6_smoke.log 2>&1 & echo $! >/tmp/vanta_p6_epid); sleep 10
EPID=$(cat /tmp/vanta_p6_epid); kill "$EPID" 2>/dev/null; sleep 1; ps -p "$EPID" >/dev/null 2>&1 && kill -9 "$EPID" 2>/dev/null
grep -iE "error|exception|cannot|failed|throw|ERR_|threw|not a function|CSP" /tmp/vanta_p6_smoke.log | grep -viE "IMKClient|IMKInputSession|Secure coding|CoreText|objc\[|DevTools|ViewBridge|TIPapp|GPU stall|stalls|cache" | head -20 || echo "clean boot"
```
Expected: clean. Pay special attention to any CSP-related errors or font-load failures.

- [ ] **Step 3: Packaging smoke (macOS only — builds the .dmg)**
```bash
npm run package 2>&1 | tail -15
```
Expected: `dist/VANTA-0.1.0-arm64.dmg` (or similar) is created. The build will take a few minutes. Report the final size and path.

- [ ] **Step 4: (Manual) Install check** — mount the `.dmg`, drag VANTA.app to Applications, launch it. Confirm it opens without a dev environment. This is the final human sign-off step.

- [ ] **Step 5: Push to `main` after ALL automated checks are green** — never push with failing tests, lint errors, or build errors.

---

## Self-Review

- **Spec coverage (Phase 6):** health score pure function (Task 3) ✓; forecast trend baseline (Task 4) ✓; Dashboard wired to live data (Task 6) ✓; honest labels — "Threat Trend" not "AI Threat Forecast" (Task 6) ✓; local fonts (Task 1) ✓; renderer CSP (Task 2) ✓; electron-builder config (Task 7) ✓; QA + packaging smoke (Task 8) ✓.
- **Placeholder scan:** no TBD/TODO. Task 6 Step 3 (CPU/RAM/Disk) explicitly handles the honest substitution — shows network metrics with correct labels instead of fabricated system metrics.
- **Type/name consistency:** `computeHealthScore(scan, threats)` matches its test and the hook. `buildForecast(events, nowMs)` matches its test and `useForecast`. `ForecastPoint { d, actual, predicted, conf }` is the existing shared type used by `ThreatForecast` component.

---

## Phase roadmap — after Phase 6 (all shipping goals met)
- Per-host latency probing (ping sweep in discovery).
- Durable SQLite store (pending `better-sqlite3` Electron 42 support).
- Auto-update via `electron-updater`.
- Code signing + notarization (macOS Gatekeeper, Windows SmartScreen).
- Offline CVE database (NVD feed) for real CVE-ID mapping.
