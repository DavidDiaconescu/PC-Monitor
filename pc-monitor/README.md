# PC Monitor

A cross-platform desktop application for real-time hardware monitoring, built with Electron, React, and TypeScript.

Monitor your CPU, RAM, GPU, storage, network, temperature, battery, and running processes — all from a clean, dark-themed dashboard. Includes a built-in speed test that uses the same multi-stream methodology as Ookla.

---

## Features

| Page | What it shows |
|---|---|
| **Dashboard** | Overview of all key metrics at a glance |
| **CPU** | Usage per core, clock speed, temperature history |
| **RAM** | Used / free / available memory, swap, usage chart |
| **GPU** | Usage, VRAM, temperature, fan speed, power draw |
| **Storage** | Disk usage per volume, free space, I/O ops/sec |
| **Network** | Live download/upload speed, per-interface stats, built-in speed test |
| **Temperature** | CPU package, GPU, motherboard, NVMe, per-core temps (macOS / Linux) |
| **Processes** | Top 150 processes sorted by CPU and memory |
| **Battery** | Charge level, health, charge/discharge rate |
| **Alerts** | History of threshold-based hardware alerts |
| **History** | Charts of recorded metrics over time |
| **Settings** | Polling interval and alert thresholds |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Electron](https://www.electronjs.org/) 39 |
| Build tool | [electron-vite](https://electron-vite.org/) 5 |
| UI | [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 |
| Charts | [Recharts](https://recharts.org/) 3 |
| Icons | [Lucide React](https://lucide.dev/) |
| Hardware | [systeminformation](https://systeminformation.io/) 5 |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (local SQLite) |
| Routing | [React Router](https://reactrouter.com/) 7 (HashRouter) |

---

## Architecture

```
src/
├── main/                     # Electron main process (Node.js)
│   ├── collectors/           # Hardware data collectors
│   │   ├── cpu.collector.ts
│   │   ├── ram.collector.ts
│   │   ├── gpu.collector.ts       # nvidia-smi (primary) + systeminformation fallback
│   │   ├── disk.collector.ts      # Includes 3s timeout guard for WMI hangs on Windows
│   │   ├── network.collector.ts   # Rolling-average smoothing, loopback filtering
│   │   ├── processes.collector.ts
│   │   ├── battery.collector.ts
│   │   └── temperature.collector.ts
│   ├── database/
│   │   ├── models/           # Metric, Alert, Settings schemas
│   │   └── repositories/     # SQLite CRUD via better-sqlite3
│   ├── ipc/
│   │   ├── events.ts         # IPC channel name constants
│   │   └── handlers.ts       # ipcMain.handle registrations
│   └── services/
│       ├── metrics.service.ts     # Orchestrates all collectors, saves to DB
│       ├── alerts.service.ts      # Threshold checks and alert persistence
│       ├── analysis.service.ts
│       └── speedtest.service.ts   # Cloudflare-based Ookla-style speed test
├── preload/
│   ├── index.ts              # contextBridge API exposed to renderer
│   └── index.d.ts            # TypeScript declarations for window.electron
└── renderer/
    └── src/
        ├── pages/            # One React component per route
        ├── components/       # Shared UI (Chart, Layout, LoadingSpinner, …)
        ├── hooks/            # useMetrics, useHistory, …
        └── utils/            # formatters, color helpers
```

Metrics are collected on a configurable polling interval (default: 2 seconds) and pushed to the renderer via `ipcMain` → `webContents.send`. A local SQLite database persists history for the History page and alert log.

---

## Speed Test

The built-in speed test (Network page) replicates Ookla's methodology using Cloudflare's public `speed.cloudflare.com` endpoints:

1. **Latency** — 5 sequential HTTPS pings → median reported
2. **Download** — 4 parallel GET requests, 25 MB each (100 MB total) → combined throughput
3. **Upload** — 4 parallel POST requests, 10 MB each (40 MB total) → combined throughput

Results are reported in Mbps. No third-party speed test account or API key is needed.

---

## Platform Notes

### GPU
- **NVIDIA (Windows / Linux):** `nvidia-smi` is queried directly for usage, VRAM, temperature, fan speed, and power draw — more accurate than WMI.
- **Other GPUs / macOS:** `systeminformation` provides available data. Fields unsupported by the driver are shown as `N/A`.

### Temperature
- **macOS / Linux:** Full sensor data (CPU package, per-core, GPU, motherboard, NVMe).
- **Windows:** Thermal sensors require kernel-level driver access not available without elevation. The Temperature page is hidden on Windows. Use [HWiNFO64](https://www.hwinfo.com/), [Core Temp](https://www.alcpu.com/CoreTemp/), or [MSI Afterburner](https://www.msi.com/Landing/afterburner) instead.

### Disk I/O
On Windows, the WMI call for disk I/O statistics (`disksIO`) can occasionally freeze. The collector races it against a 3-second timeout and falls back to zero I/O values so the rest of the UI is never blocked.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm 10 or later
- On Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (needed to compile `better-sqlite3`)

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app in development mode with hot-reload for the renderer and automatic restart for the main process.

### Type Check

```bash
npm run typecheck
```

### Build

```bash
# Windows (produces release/PC Monitor Setup 1.0.0.exe)
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Built installers are placed in the `release/` directory.

> **Note:** After running `build:win` on macOS, the native `better-sqlite3` binary is replaced with the Windows x64 version. Run `npm run postinstall` to rebuild it for macOS ARM64 before continuing local development.

---

## Project Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in development mode |
| `npm run build` | Type-check then bundle all processes |
| `npm run build:win` | Build + package Windows x64 installer |
| `npm run build:mac` | Build + package macOS app |
| `npm run build:linux` | Build + package Linux app |
| `npm run typecheck` | Run TypeScript checks for main and renderer |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run postinstall` | Rebuild native modules for the current platform |

---

## License

MIT