# Phase 1 — Electron Foundation & 99% UI Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Vite scaffold into a two-process Electron app that renders the VANTA dashboard (all six views) at 99% visual fidelity to the prototype, using the prototype's static data.

**Architecture:** Electron main process (window lifecycle) + sandboxed renderer (the React UI) + a typed `contextBridge` preload stub. Shared domain types live in `src/shared`. The UI is ported verbatim from the vendored prototype in `docs/design-prototype/`; CSS is copied byte-for-byte to guarantee fidelity. No network/agent logic in this phase.

**Tech Stack:** Electron, `electron-vite`, `electron-builder`, React 19, TypeScript, Vite, Vitest + React Testing Library (jsdom).

---

## Scope of this phase

In: Electron shell, electron-vite layout, shared types, preload bridge stub (proves IPC), port of CSS + all components/views from the prototype, render tests, runnable app.

Out (later phases): real device discovery, scanning, topology computation, threat rules, dashboard wiring, packaging installers.

## Source of truth

The prototype is vendored at `docs/design-prototype/`:
- `Security Dashboard.html` — the `<style>` block is the CSS source of truth.
- `icons.jsx`, `data.jsx`, `charts.jsx`, `views.jsx`, `app.jsx` — component sources.

 Porting rule applied throughout: remove the prototype's `window.X = …` global assignments and the in-browser `const { … } = window.Y` lookups, replace them with ES `import`/`export`, and add TypeScript types from `@shared/types`. **Do not change markup, class names, inline styles, SVG paths, or numeric constants** — those define the fidelity.

## Target file structure (this phase)

```
vanta-dashboard/
├─ package.json                 # MODIFY: deps + scripts + "main"
├─ electron.vite.config.ts      # CREATE
├─ vitest.config.ts             # CREATE
├─ vitest.setup.ts              # CREATE
├─ tsconfig.json                # MODIFY (solution)
├─ tsconfig.node.json           # MODIFY (main/preload/shared/configs)
├─ tsconfig.web.json            # CREATE (renderer/shared)
├─ src/
│  ├─ main/index.ts             # CREATE: window + app lifecycle + ping handler
│  ├─ preload/index.ts          # CREATE: contextBridge window.vanta stub
│  ├─ shared/types.ts           # CREATE: domain + IPC types
│  └─ renderer/
│     ├─ index.html             # CREATE: fonts + #root + main.tsx
│     └─ src/
│        ├─ main.tsx            # CREATE: createRoot + import styles
│        ├─ App.tsx             # CREATE: from app.jsx
│        ├─ styles.css          # CREATE: verbatim prototype CSS
│        ├─ data.ts             # CREATE: from data.jsx (typed)
│        ├─ vanta.d.ts          # CREATE: window.vanta typing
│        ├─ components/
│        │  ├─ Icon.tsx         # CREATE: from icons.jsx
│        │  └─ charts.tsx       # CREATE: from charts.jsx
│        └─ views/
│           ├─ constants.ts     # CREATE: SEV_DOT / SEV_CLASS
│           ├─ DashboardView.tsx
│           ├─ NetworkView.tsx
│           ├─ VulnerabilitiesView.tsx
│           ├─ DevicesView.tsx
│           ├─ ThreatsView.tsx
│           ├─ AlertsView.tsx
│           └─ StubView.tsx
```

The old scaffold files `src/App.tsx`, `src/App.css`, `src/index.css`, `src/main.tsx`, root `index.html`, `src/assets/` are removed/relocated in Task 2.

---

## Task 1: Install the Electron + test toolchain

**Files:**
- Modify: `package.json` (scripts + `main` field)

- [ ] **Step 1: Install runtime/build/test dependencies**

```bash
cd ~/Desktop/Github/vanta-dashboard
npm install -D electron electron-vite electron-builder \
  vitest @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Set scripts and the Electron entry in `package.json`**

Replace the `"scripts"` block and add `"main"` (keep `name`, `version`, `type: "module"`, and the dependency blocks npm just wrote):

```json
{
  "name": "vanta-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-vite build && electron-builder",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Verify the toolchain resolves**

Run: `npx electron-vite --help && npx vitest --version`
Expected: electron-vite help text prints, and a vitest version number prints.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add electron, electron-vite, electron-builder, and vitest"
```

---

## Task 2: Restructure into the electron-vite layout

**Files:**
- Create dirs: `src/main`, `src/preload`, `src/shared`, `src/renderer/src/{components,views}`
- Delete: `src/App.tsx`, `src/App.css`, `src/index.css`, `src/main.tsx`, `src/assets/`, root `index.html`

- [ ] **Step 1: Create the new directory tree and remove scaffold cruft**

```bash
cd ~/Desktop/Github/vanta-dashboard
mkdir -p src/main src/preload src/shared src/renderer/src/components src/renderer/src/views
git rm -q index.html src/main.tsx src/App.tsx src/App.css src/index.css
git rm -qr src/assets
```

- [ ] **Step 2: Verify the tree**

Run: `find src -type d | sort`
Expected: lists `src/main`, `src/preload`, `src/renderer`, `src/renderer/src`, `src/renderer/src/components`, `src/renderer/src/views`, `src/shared`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: restructure into electron-vite layout"
```

---

## Task 3: Configure electron-vite, TypeScript, and Vitest

**Files:**
- Create: `electron.vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.web.json`
- Modify: `tsconfig.json`, `tsconfig.node.json`

- [ ] **Step 1: Create `electron.vite.config.ts`**

```ts
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: { outDir: 'out/main' }
  },
  preload: {
    build: { outDir: 'out/preload' }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: { input: { index: resolve('src/renderer/index.html') } }
    },
    plugins: [react()]
  }
})
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create `tsconfig.web.json` (renderer + shared)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/renderer/src", "src/shared", "vitest.setup.ts"]
}
```

- [ ] **Step 5: Replace `tsconfig.node.json` (main/preload/shared/config files)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src/main", "src/preload", "src/shared", "electron.vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 6: Replace `tsconfig.json` with a solution file**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 7: Verify configs parse**

Run: `npx tsc -p tsconfig.web.json --noEmit`
Expected: no output and exit code 0 (no source files yet, so nothing to error on).

- [ ] **Step 8: Commit**

```bash
git add electron.vite.config.ts vitest.config.ts vitest.setup.ts tsconfig.json tsconfig.node.json tsconfig.web.json
rm -f tsconfig.app.json && git add -A
git commit -m "chore: configure electron-vite, tsconfig projects, and vitest"
```

---

## Task 4: Shared domain types

**Files:**
- Create: `src/shared/types.ts`
- Test: `src/shared/types.test.ts`

- [ ] **Step 1: Write the failing test**

`src/shared/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Severity, Device, ThreatEvent } from '@shared/types'
import { SEVERITIES } from '@shared/types'

describe('shared types', () => {
  it('exposes the four severities in order', () => {
    expect(SEVERITIES).toEqual(['Critical', 'High', 'Medium', 'Low'])
  })

  it('lets values be assigned to the domain types', () => {
    const sev: Severity = 'High'
    const device: Device = {
      name: 'x', type: 'Router', ico: 'router', mac: '00:00', ip: '10.0.0.1',
      online: true, signal: 90, role: 'Gateway'
    }
    const event: ThreatEvent = {
      sev, source: 'gw', title: 't', desc: 'd', time: 'now', region: 'LAN'
    }
    expect(device.online && event.sev === 'High').toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shared/types.test.ts`
Expected: FAIL — cannot find module `@shared/types`.

- [ ] **Step 3: Create `src/shared/types.ts`**

```ts
export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Severity = (typeof SEVERITIES)[number]

export type NodeState = 'ok' | 'warn' | 'red' | 'blue'

export interface ForecastPoint {
  d: string
  actual: number
  predicted: number
  conf: number
}

export interface SystemRow {
  connector: string
  ico: string
  workload: string
  score: number
  threats: 'Low' | 'Med' | 'High'
  patches: string
  state: 'low' | 'med' | 'high'
}

export interface Device {
  name: string
  type: string
  ico: string
  mac: string
  ip: string
  online: boolean
  signal: number
  role: string
}

export interface Vuln {
  id: string
  title: string
  severity: Severity
  score: number
  system: string
  patch: string
  age: string
}

export interface ThreatEvent {
  sev: Severity
  source: string
  title: string
  desc: string
  time: string
  region: string
}

export interface NetworkNode {
  id: string
  x: number
  y: number
  label: string
  ico: string
  state: NodeState
  meta: string
}

export type NetworkEdge = [string, string]

export interface TopologyGraph {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

// IPC contract (stub for Phase 1; expanded when the agent lands)
export interface VantaBridge {
  ping(): Promise<'pong'>
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/shared/types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/shared/types.test.ts
git commit -m "feat: add shared domain and IPC types"
```

---

## Task 5: Electron main process

**Files:**
- Create: `src/main/index.ts`

- [ ] **Step 1: Create `src/main/index.ts`**

```ts
import { join } from 'path'
import { app, BrowserWindow, ipcMain } from 'electron'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0c1320',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => win.show())

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('vanta:ping', () => 'pong' as const)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 2: Type-check the node project**

Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: exit code 0 (preload not created yet, but it is only referenced by a runtime path string, so no type error).

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add electron main process and window lifecycle"
```

---

## Task 6: Preload bridge stub + renderer window typing

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/renderer/src/vanta.d.ts`

- [ ] **Step 1: Create `src/preload/index.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron'
import type { VantaBridge } from '@shared/types'

const api: VantaBridge = {
  ping: () => ipcRenderer.invoke('vanta:ping')
}

contextBridge.exposeInMainWorld('vanta', api)
```

- [ ] **Step 2: Create `src/renderer/src/vanta.d.ts`**

```ts
import type { VantaBridge } from '@shared/types'

declare global {
  interface Window {
    vanta: VantaBridge
  }
}

export {}
```

- [ ] **Step 3: Type-check both projects**

Run: `npx tsc -p tsconfig.node.json --noEmit && npx tsc -p tsconfig.web.json --noEmit`
Expected: exit code 0 for both.

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/renderer/src/vanta.d.ts
git commit -m "feat: add typed contextBridge preload stub"
```

---

## Task 7: Port the global CSS verbatim

**Files:**
- Create: `src/renderer/src/styles.css`
- Source: `docs/design-prototype/Security Dashboard.html` (the `<style>…</style>` block)

- [ ] **Step 1: Copy the CSS byte-for-byte**

Open `docs/design-prototype/Security Dashboard.html`, copy everything **between** `<style>` and `</style>` (the prototype's lines 11–357), and write it as the entire contents of `src/renderer/src/styles.css`. Do not edit any value — every `oklch(...)`, radius, and size is part of the fidelity contract.

- [ ] **Step 2: Verify it matches the source**

Run:
```bash
cd ~/Desktop/Github/vanta-dashboard
grep -c 'oklch' src/renderer/src/styles.css
grep -c 'oklch' "docs/design-prototype/Security Dashboard.html"
```
Expected: the first count is ≤ the second (the HTML also has inline `oklch` in markup); confirm `src/renderer/src/styles.css` is non-empty and contains `--lime: oklch(0.88 0.22 135);` and `.gauge-num{font-size:34px`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/styles.css
git commit -m "feat: port prototype global stylesheet verbatim"
```

---

## Task 8: Port the Icon component

**Files:**
- Create: `src/renderer/src/components/Icon.tsx`
- Test: `src/renderer/src/components/Icon.test.tsx`
- Source: `docs/design-prototype/icons.jsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/components/Icon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from './Icon'

describe('Icon', () => {
  it('renders an svg for a known name', () => {
    const { container } = render(<Icon name="shield" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('falls back to the default svg for an unknown name', () => {
    const { container } = render(<Icon name="not-a-real-icon" />)
    expect(container.querySelector('svg circle')).not.toBeNull()
  })

  it('applies the size prop', () => {
    const { container } = render(<Icon name="grid" size={32} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('32')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/components/Icon.test.tsx`
Expected: FAIL — cannot find `./Icon`.

- [ ] **Step 3: Create `Icon.tsx` from `docs/design-prototype/icons.jsx`**

Copy the `Icon` arrow function and **all** its `case` branches verbatim (do not alter any SVG path data). Apply exactly these transforms:
- Replace the leading comment with a typed signature.
- Type the props as shown below.
- Delete the trailing `window.Icon = Icon;` line.
- Add `export { Icon }`.

The wrapper to use (the `switch (name) { … }` body is copied unchanged from the source):

```tsx
import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
  stroke?: number
}

export const Icon = ({ name, size = 16, stroke = 1.6, ...rest }: IconProps) => {
  const sw = stroke
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest
  }
  switch (name) {
    // … paste every `case "…": return <svg {...props}>…</svg>;` line
    // from docs/design-prototype/icons.jsx UNCHANGED, including the
    // `default:` branch.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/renderer/src/components/Icon.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/Icon.tsx src/renderer/src/components/Icon.test.tsx
git commit -m "feat: port Icon component to typed tsx"
```

---

## Task 9: Port the static data module

**Files:**
- Create: `src/renderer/src/data.ts`
- Test: `src/renderer/src/data.test.ts`
- Source: `docs/design-prototype/data.jsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { FORECAST, SYSTEMS, DEVICES, VULNS, THREATS_FEED, NETWORK_NODES, NETWORK_EDGES } from './data'

describe('static data', () => {
  it('has the expected row counts from the prototype', () => {
    expect(FORECAST).toHaveLength(15)
    expect(SYSTEMS).toHaveLength(5)
    expect(DEVICES).toHaveLength(6)
    expect(VULNS).toHaveLength(7)
    expect(THREATS_FEED).toHaveLength(6)
    expect(NETWORK_NODES).toHaveLength(8)
    expect(NETWORK_EDGES).toHaveLength(9)
  })

  it('every network edge references real nodes', () => {
    const ids = new Set(NETWORK_NODES.map((n) => n.id))
    for (const [a, b] of NETWORK_EDGES) {
      expect(ids.has(a)).toBe(true)
      expect(ids.has(b)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/data.test.ts`
Expected: FAIL — cannot find `./data`.

- [ ] **Step 3: Create `data.ts` from `docs/design-prototype/data.jsx`**

Copy the six array literals (`FORECAST`, `SYSTEMS`, `DEVICES`, `VULNS`, `THREATS_FEED`, `NETWORK_NODES`, `NETWORK_EDGES`) **unchanged**. Apply these transforms:
- Add the import: `import type { ForecastPoint, SystemRow, Device, Vuln, ThreatEvent, NetworkNode, NetworkEdge } from '@shared/types'`.
- Annotate each const: `export const FORECAST: ForecastPoint[] = [ … ]`, `export const SYSTEMS: SystemRow[] = [ … ]`, `export const DEVICES: Device[] = [ … ]`, `export const VULNS: Vuln[] = [ … ]`, `export const THREATS_FEED: ThreatEvent[] = [ … ]`, `export const NETWORK_NODES: NetworkNode[] = [ … ]`, `export const NETWORK_EDGES: NetworkEdge[] = [ … ]`.
- Delete the trailing `window.DATA = { … };` line.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/renderer/src/data.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/data.ts src/renderer/src/data.test.ts
git commit -m "feat: port static prototype data as typed module"
```

---

## Task 10: Port the charts module

**Files:**
- Create: `src/renderer/src/components/charts.tsx`
- Test: `src/renderer/src/components/charts.test.tsx`
- Source: `docs/design-prototype/charts.jsx`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/components/charts.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HealthGauge, ThreatForecast, Sparkline, NetActivity } from './charts'
import { FORECAST } from '../data'

describe('charts', () => {
  it('Sparkline draws a polyline', () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8, 5]} />)
    expect(container.querySelector('polyline')).not.toBeNull()
  })

  it('HealthGauge renders an svg', () => {
    const { container } = render(<HealthGauge value={76} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('ThreatForecast renders the actual + predicted paths', () => {
    const { container } = render(<ThreatForecast data={FORECAST} />)
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2)
  })

  it('NetActivity renders without crashing', () => {
    const { container } = render(<NetActivity />)
    expect(container.querySelector('.map')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/components/charts.test.tsx`
Expected: FAIL — cannot find `./charts`.

- [ ] **Step 3: Create `charts.tsx` from `docs/design-prototype/charts.jsx`**

Copy the bodies of `useAnimatedNumber`, `HealthGauge`, `ThreatForecast`, `Sparkline`, and `NetActivity` **unchanged** (all numeric constants, JSX, SVG, and `<animateTransform>` stay identical). Apply these transforms:
- Replace `const { useState, useEffect, useRef, useMemo } = React` with `import { useState, useEffect } from 'react'` (only these two are used).
- Add `import { Icon } from './Icon'` (used by `NetActivity`) and `import type { ForecastPoint } from '@shared/types'`.
- Type the signatures:
  - `function useAnimatedNumber(target: number, duration = 900)`
  - `function HealthGauge({ value = 76, size = 260 }: { value?: number; size?: number })`
  - `function ThreatForecast({ data }: { data: ForecastPoint[] })`
  - `function Sparkline({ data, color = 'var(--lime)', w = 70, h = 24 }: { data: number[]; color?: string; w?: number; h?: number })`
  - `function NetActivity()`
- In `useAnimatedNumber`, type the ref/raf locals as needed: `let raf = 0` and `const tick = (t: number) => { … }`.
- Delete the trailing `window.CHARTS = { … };` line.
- Add `export { HealthGauge, ThreatForecast, Sparkline, NetActivity }`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/renderer/src/components/charts.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/charts.tsx src/renderer/src/components/charts.test.tsx
git commit -m "feat: port charts (gauge, forecast, sparkline, radar) to tsx"
```

---

## Task 11: Port shared view constants

**Files:**
- Create: `src/renderer/src/views/constants.ts`
- Source: `docs/design-prototype/views.jsx` (lines 5–6)

- [ ] **Step 1: Create `constants.ts`**

```ts
import type { Severity } from '@shared/types'

export const SEV_DOT: Record<Severity, string> = {
  Critical: 'red',
  High: 'red',
  Medium: 'amber',
  Low: ''
}

export const SEV_CLASS: Record<string, string> = {
  Critical: 'crit',
  High: 'high',
  Medium: 'med',
  Low: 'low'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/views/constants.ts
git commit -m "feat: add shared severity-to-class maps for views"
```

---

## Task 12: Port the six views (+ stub)

**Files:**
- Create: `src/renderer/src/views/DashboardView.tsx`, `NetworkView.tsx`, `VulnerabilitiesView.tsx`, `DevicesView.tsx`, `ThreatsView.tsx`, `AlertsView.tsx`, `StubView.tsx`
- Test: `src/renderer/src/views/views.test.tsx`
- Source: `docs/design-prototype/views.jsx`

Each view's JSX body is copied **unchanged** from the matching function in `views.jsx`. The only edits per file are the imports at the top, the `export` keyword on the function, and TypeScript prop types where a view takes props (`StubView`). Shared transforms for every view file:
- Remove the prototype's top-of-file lines `const { … } = window.CHARTS` and `const { … } = window.DATA` and `const SEV_DOT … / const SEV_CLASS …`.
- Add, per file, only the imports that file actually uses, drawn from:
  - `import { useState } from 'react'`
  - `import { Icon } from '../components/Icon'`
  - `import { HealthGauge, ThreatForecast, Sparkline, NetActivity } from '../components/charts'`
  - `import { FORECAST, SYSTEMS, DEVICES, VULNS, THREATS_FEED, NETWORK_NODES, NETWORK_EDGES } from '../data'`
  - `import { SEV_DOT, SEV_CLASS } from './constants'`
- Change each `function XView() {` to `export function XView() {`.
- Delete the trailing `window.VIEWS = { … };` line (it lives only in the last source file).

- [ ] **Step 1: Write the failing test**

`src/renderer/src/views/views.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardView } from './DashboardView'
import { NetworkView } from './NetworkView'
import { VulnerabilitiesView } from './VulnerabilitiesView'
import { DevicesView } from './DevicesView'
import { ThreatsView } from './ThreatsView'
import { AlertsView } from './AlertsView'
import { StubView } from './StubView'

describe('views render with prototype data', () => {
  it('Dashboard shows its cards', () => {
    render(<DashboardView />)
    expect(screen.getByText('System Health')).toBeInTheDocument()
    expect(screen.getByText('AI Threat Forecast')).toBeInTheDocument()
    expect(screen.getByText('Connected Systems')).toBeInTheDocument()
  })
  it('Network shows the topology card', () => {
    render(<NetworkView />)
    expect(screen.getByText('Network Topology')).toBeInTheDocument()
  })
  it('Vulnerabilities shows the active table', () => {
    render(<VulnerabilitiesView />)
    expect(screen.getByText('Active Vulnerabilities')).toBeInTheDocument()
    expect(screen.getByText('CVE-2026-1042')).toBeInTheDocument()
  })
  it('Devices lists connected devices', () => {
    render(<DevicesView />)
    expect(screen.getByText('Connected Devices')).toBeInTheDocument()
    expect(screen.getByText('Aurora Hub')).toBeInTheDocument()
  })
  it('Threats shows the live feed', () => {
    render(<ThreatsView />)
    expect(screen.getByText('Live Threat Feed')).toBeInTheDocument()
  })
  it('Alerts shows the incidents card', () => {
    render(<AlertsView />)
    expect(screen.getByText('Alerts & Incidents')).toBeInTheDocument()
  })
  it('Stub shows its title and message', () => {
    render(<StubView title="Settings" msg="hello" />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/views/views.test.tsx`
Expected: FAIL — cannot find `./DashboardView`.

- [ ] **Step 3: Create `DashboardView.tsx`**

Copy the `DashboardView` function body (views.jsx lines 9–152) unchanged. Header:

```tsx
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { HealthGauge, ThreatForecast, NetActivity } from '../components/charts'
import { FORECAST, SYSTEMS } from '../data'
import { SEV_CLASS } from './constants'

export function DashboardView() {
  // … body copied verbatim from views.jsx
}
```

- [ ] **Step 4: Create `NetworkView.tsx`**

Copy `NetworkView` (views.jsx lines 155–248) unchanged. Header:

```tsx
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sparkline } from '../components/charts'
import { NETWORK_NODES, NETWORK_EDGES } from '../data'

export function NetworkView() {
  // … body copied verbatim
}
```

- [ ] **Step 5: Create `VulnerabilitiesView.tsx`**

Copy `VulnerabilitiesView` (views.jsx lines 251–329) unchanged. Header:

```tsx
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sparkline } from '../components/charts'
import { VULNS } from '../data'
import { SEV_CLASS } from './constants'

export function VulnerabilitiesView() {
  // … body copied verbatim
}
```

- [ ] **Step 6: Create `DevicesView.tsx`**

Copy `DevicesView` (views.jsx lines 332–392) unchanged. Header:

```tsx
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { DEVICES } from '../data'

export function DevicesView() {
  // … body copied verbatim
}
```

- [ ] **Step 7: Create `ThreatsView.tsx`**

Copy `ThreatsView` (views.jsx lines 395–438) unchanged. Header:

```tsx
import { useState } from 'react'
import { THREATS_FEED } from '../data'
import { SEV_DOT, SEV_CLASS } from './constants'

export function ThreatsView() {
  // … body copied verbatim
}
```

- [ ] **Step 8: Create `AlertsView.tsx`**

Copy `AlertsView` (views.jsx lines 441–469) unchanged. Header:

```tsx
import { Icon } from '../components/Icon'
import { THREATS_FEED } from '../data'
import { SEV_DOT, SEV_CLASS } from './constants'

export function AlertsView() {
  // … body copied verbatim
}
```

> Note: `AlertsView` in the prototype references `Icon` only via the buttons it renders; keep the `Icon` import only if the copied body uses it. If the copied body has no `<Icon`, drop that import to satisfy `noUnusedLocals`.

- [ ] **Step 9: Create `StubView.tsx`**

Copy `StubView` (views.jsx lines 472–483) unchanged except typed props:

```tsx
export function StubView({ title, msg }: { title: string; msg: string }) {
  // … body copied verbatim
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npx vitest run src/renderer/src/views/views.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 11: Commit**

```bash
git add src/renderer/src/views
git commit -m "feat: port all six dashboard views to tsx"
```

---

## Task 13: App shell, renderer entry, and index.html

**Files:**
- Create: `src/renderer/src/App.tsx`, `src/renderer/src/main.tsx`, `src/renderer/index.html`
- Test: `src/renderer/src/App.test.tsx`
- Source: `docs/design-prototype/app.jsx` and the `<head>` of `Security Dashboard.html`

- [ ] **Step 1: Write the failing test**

`src/renderer/src/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the brand and the dashboard by default', () => {
    render(<App />)
    expect(screen.getByText('VANTA')).toBeInTheDocument()
    expect(screen.getByText('System Health')).toBeInTheDocument()
  })

  it('switches to the Network view when its nav item is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Network'))
    expect(screen.getByText('Network Topology')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/App.test.tsx`
Expected: FAIL — cannot find `./App`.

- [ ] **Step 3: Create `App.tsx` from `docs/design-prototype/app.jsx`**

Copy the `NAV` array and the `App` function body (app.jsx lines 4–90) **unchanged**. Apply these transforms:
- Remove `const { … } = window.VIEWS;` and replace with named imports.
- Replace the prototype's bare `useState` with an import.
- Remove the final `ReactDOM.createRoot(...).render(<App/>)` line (it moves to `main.tsx`).
- Add `export default App`.

Header:

```tsx
import { useState } from 'react'
import { Icon } from './components/Icon'
import { DashboardView } from './views/DashboardView'
import { NetworkView } from './views/NetworkView'
import { VulnerabilitiesView } from './views/VulnerabilitiesView'
import { DevicesView } from './views/DevicesView'
import { ThreatsView } from './views/ThreatsView'
import { AlertsView } from './views/AlertsView'
import { StubView } from './views/StubView'

const NAV = [
  // … copied verbatim from app.jsx
]

function App() {
  // … body copied verbatim from app.jsx
}

export default App
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/renderer/src/App.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/renderer/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 6: Create `src/renderer/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>VANTA — Security Operations</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/App.test.tsx src/renderer/src/main.tsx src/renderer/index.html
git commit -m "feat: wire app shell, renderer entry, and html"
```

---

## Task 14: Full verification — tests, types, build, and run

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites pass (types, data, Icon, charts, views, App) — 0 failures.

- [ ] **Step 2: Type-check both projects**

Run: `npm run typecheck`
Expected: exit code 0, no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: electron-vite builds `out/main`, `out/preload`, `out/renderer` with no errors.

- [ ] **Step 4: Launch the app and verify fidelity by eye**

Run: `npm run dev`
Expected: the Electron window opens showing the VANTA dashboard. Manually verify:
- Sidebar brand "VANTA / SEC · OPS", lime accent, dark navy background.
- Clicking each nav item (Dashboard, Threats, Alerts & Incidents, Devices, Network, Vulnerabilities) swaps the view.
- Dashboard: animated half-arc gauge, hover the forecast chart → tooltip with Actual/Predicted/Deviation/Confidence; Connected Systems table renders.
- Network: clicking a node highlights it and updates the right-hand detail panel; red nodes pulse.
- Vulnerabilities: severity filter chips filter the CVE table.
- Devices: Disconnect/Reconnect toggles a card's state.
- Compare side-by-side against `docs/design-prototype/Security Dashboard.html` opened in a browser; they should be visually identical.

- [ ] **Step 5: Commit any fixes found during verification**

```bash
git add -A
git commit -m "fix: address fidelity/runtime issues found in phase-1 verification"
```

(If nothing needed fixing, skip this commit.)

---

## Self-Review

- **Spec coverage (Phase 1 scope):** Electron two-process shell (Tasks 5–6) ✓; electron-vite layout/build (Tasks 2–3, 14) ✓; renderer sandbox + typed bridge (Tasks 5–6) ✓; shared types in `src/shared` (Task 4) ✓; verbatim CSS port for fidelity (Task 7) ✓; all six views + charts + icons + data ported (Tasks 8–13) ✓; runnable, visually verified app (Task 14) ✓. Agent/discovery/scan/threat-rules/topology-compute/packaging are explicitly **out of Phase 1** and tracked for later plans.
- **Placeholder scan:** No "TBD/TODO". The "copied verbatim" instructions reference exact vendored files and line ranges with explicit, enumerated transforms and full headers/types — these are concrete, not placeholders.
- **Type consistency:** `VantaBridge` is defined in Task 4 and consumed identically in Tasks 5 (`ipcMain.handle('vanta:ping')` returns `'pong'`) and 6 (`ping(): Promise<'pong'>`, `window.vanta`). Domain types (`Device`, `Vuln`, `ThreatEvent`, `SystemRow`, `ForecastPoint`, `NetworkNode`, `NetworkEdge`) are defined in Task 4 and used by `data.ts` (Task 9) and the views/charts. `SEV_DOT`/`SEV_CLASS` defined once (Task 11) and imported by the views (Task 12).

---

## Next phases (separate plans)

2. **Agent core** — `discovery` + `store` + `ipc` + `scheduler`; replace static `data.ts` for the Devices tab with live IPC data.
3. **Topology** — gateway-rooted radial layout from discovered hosts.
4. **Vulnerabilities** — `portscan` + progressive `nmap`/`vulners` → real CVEs.
5. **Threats** — rule engine over scan deltas/findings (priority feature).
6. **Dashboard wiring + packaging** — health score, host metrics, forecast baseline; `electron-builder` installers.
