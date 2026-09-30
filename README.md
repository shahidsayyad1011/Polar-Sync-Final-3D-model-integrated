# PolarSync: Antarctic Station Management & Edge Computing System

[![Python 3.13](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite 6](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)
[![SQLite WAL](https://img.shields.io/badge/Database-SQLite_WAL-003b57.svg)](https://www.sqlite.org/)
[![Ollama AI](https://img.shields.io/badge/AI-Ollama_DeepSeek-orange.svg)](https://ollama.com/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://polarsync-dashboard.vercel.app/)

---

## PROJECT NAME

**POLAR SYNC**
Indian Antarctic Research Stations

---

## One-Line Description

> A real-time, edge-first telemetry and AI command center for India's two Antarctic research stations — runs **fully offline** and keeps life-safety data flowing even during total satellite blackouts.

---

## What Problem Does It Solve?

Antarctica is one of the most hostile engineering environments on Earth:

| Real-World Problem | Engineering Consequence |
|---|---|
| **Geomagnetic storms** cause satellite blackout | Station loses all remote contact with the outside world |
| Temperatures below **-50 degrees C** | Generators, heating, and fuel become life-critical — no reading can be missed |
| **No cloud connectivity** during outages | Cloud-first systems lose all buffered data permanently |
| Limited satellite bandwidth during storms | Cannot send all data — must triage and prioritize critical records |
| **Two separate stations** (Maitri + Bharati) | Operator needs a unified, multi-station command panel |

PolarSync solves all five by processing and storing everything **locally on-station first**, then syncing to the outside world only when connectivity allows — with life-safety alerts (P1) always transmitted first.

---

## What Does the Project Actually Do?

PolarSync is a **full-stack live simulation + management dashboard** that:

1. **Continuously simulates** sensor readings every 2 seconds for both Maitri and Bharati stations using real AWS historical weather datasets (temperature, fuel, battery, power, vibration, logistics)
2. **Classifies every alert** into `P1 Critical → P2 Moderate → P3 Normal` on-device — no cloud call required
3. **Buffers all records** crash-safely into a local SQLite WAL database — sudden power cuts lose nothing
4. **Syncs intelligently**: full batch when online, P1+P2 only during storm-degraded bandwidth, fully buffered during blackout
5. **Diagnoses anomalies** with a local LLM (Ollama / DeepSeek-R1) — no internet required
6. **Displays a live React dashboard** with 2D/3D interactive floor maps, overlay filters (Labels / Subsystems / Blizzard / Cinematic FX / Photo View), live charts, priority queues, mini metric sparkline cards, and an event log

---

## Visual Proof / Screenshot / Demo

```
+--------------------------------------------------------------------------------------------------+
| POLAR SYNC  Indian Antarctic Research Stations   MAITRI | BHARATI   Simulator Online  17:04 UTC  |
+--------------------------------------------------------------------------------------------------+
| [2D View] [3D Digital Twin] [Fullscreen]                                                         |
| [Labels] [Subsystems] [Blizzard] [Cinematic FX (active)] [Photo View]                           |
|                                                                                                  |
|  +----------------------------------------+   +------------------------------------------+     |
|  |    3D DIGITAL TWIN -- BHARATI          |   | Energy 24.11 kWh up 12%  Battery 69.86%  |     |
|  |  (interactive 3D model, blue modules)  |   | Cooking Fuel 55.64% up 1%                |     |
|  |                                        |   | Gen Health  15.29% up 3%                 |     |
|  +----------------------------------------+   |                                          |     |
|                                               | PRIORITY QUEUE             View All ->   |     |
|  +-----------------+ +------------+ +------+  | P1  Critical                          0  |     |
|  | Power Gen vs Con| | Diagnostics| | Log  |  | P2  Moderate                          0  |     |
|  | -- Gen (kW)     | | -- Load %  | | ...  |  | P3  Normal                            0  |     |
|  | -- Con (kW)     | | -- Batt %  | | ...  |  | SYNC  Sync Complete                   1  |     |
|  +-----------------+ +------------+ +------+  |                                          |     |
|                                               | EDGE HISTORY               View All ->   |     |
|  +--------------+ +--------------+            | 23:54 P3 TELEMETRY  Synced              |     |
|  | Energy & Pwr | | Environment  |            | 23:53 P3 TELEMETRY  Synced              |     |
|  | RUNNING      | | Live Weather |            |                                          |     |
|  | 85.5 kW Live | | Temp 1.9 C   |            | All Systems Nominal                      |     |
|  +--------------+ +--------------+            +------------------------------------------+     |
+--------------------------------------------------------------------------------------------------+
```

> **Live Demo:** https://polarsync-dashboard.vercel.app/

---

## How Does It Work?

### Data Flow (every 2 seconds)

```
Step 1 -- SIMULATION TICK
   SimulationCore reads real weather from ReplayEngine
   Applies physics: fuel burn, battery charge/discharge, heating, vibration
   compute_alerts() fires anomaly rules → list of alert dicts

Step 2 -- EDGE PIPELINE
   AlertTracker.diff() → finds only RAISED / CLEARED events (delta, not full list)
   classify_alert()    → maps each alert to CRITICAL / MODERATE / NORMAL
   EdgeStorage.write() → inserts into SQLite WAL (always, regardless of network)

Step 3 -- SYNC WORKER (background thread, every 3s)
   Reads NetworkState singleton:
   ONLINE   → fetch 20 PENDING records, P1 first → P2 → P3 → CentralStore
   DEGRADED → fetch 5 PENDING records, P1 + P2 only (P3 skipped to save bandwidth)
   OFFLINE  → no-op; SQLite buffer grows silently until connectivity returns

Step 4 -- FLASK API (Port 5000)
   GET /api/data?station=MAITRI  →  latest snapshot JSON

Step 5 -- REACT DASHBOARD (Port 3000)
   Polls every 2000ms → updates charts, metric cards, priority queue, alerts
   User can click AI Analyze → POST /api/alerts/analyze → Ollama job (local LLM)
```

### Sync Modes

| Network Mode | Batch Size | Priorities Synced | Trigger |
|---|---|---|---|
| `ONLINE` | 20 records/cycle | P1 + P2 + P3 | Normal satellite link |
| `DEGRADED` | 5 records/cycle | P1 + P2 only | Geomagnetic storm |
| `OFFLINE` | None — buffer grows | — | Total blackout |

---

## Architecture / System Overview

```
+----------------------------------------------------------------------+
|                    DATA SIMULATION DAEMON                            |
|   data_simulator.py  +  simulation_core.py  +  environment.py       |
|   Real Maitri 2016 hourly AWS weather  (maitri_weather_2016.json)    |
|   Real Bharati 2026 minute-sampled AWS (bharati_weather_2026.json)   |
|   Tick every 2s → power / fuel / battery / heating / logistics       |
+---------------------------+------------------------------------------+
                            |
                            v
+----------------------------------------------------------------------+
|              EDGE PIPELINE  (edge_pipeline.py)                       |
|   AlertTracker  → state-diffing: RAISED / CLEARED events only        |
|   classify_alert() → CRITICAL / MODERATE / NORMAL per-alert rules   |
+---------------------------+------------------------------------------+
                            |
                            v
+----------------------------------------------------------------------+
|              SQLite WAL BUFFER  (edge_storage.py)                    |
|   edge_buffer.db  --  PRAGMA journal_mode = WAL                      |
|   Thread-safe, crash-safe, composite priority index                  |
+------------+------------------------------------+--------------------+
             |                                    |
             v                                    v
+------------------------+      +-------------------------------------+
|  SYNC WORKER           |      |  FLASK REST API  (Port 5000)        |
|  (sync_worker.py)      |      |  GET  /api/data?station=MAITRI      |
|  ONLINE  → P1+P2+P3    |      |  GET  /api/data?station=BHARATI     |
|  DEGRADED → P1+P2      |      |  GET  /api/edge/status              |
|  OFFLINE → buffer up   |      |  GET  /api/edge/queue               |
|  Idempotent by UID     |      |  GET  /api/edge/history             |
+------------------------+      |  POST /api/alerts/analyze           |
                                +------------------+------------------+
                                                   |
                                                   v
+----------------------------------------------------------------------+
|              REACT DASHBOARD  (Vite · Port 3000)                     |
|  Header        -- POLAR SYNC brand, MAITRI/BHARATI tabs, UTC clock   |
|  Digital Twin  -- 2D hotspot map OR 3D iframe model                  |
|  3D Filters    -- Labels / Subsystems / Blizzard / Cinematic FX / Photo View|
|  Metric Cards  -- Energy, Battery SOC, Cooking Fuel, Gen Health      |
|  Priority Queue -- P1 / P2 / P3 counts + SYNC row + View All        |
|  Edge History  -- Timestamped sync log with View All                 |
|  Alert Panel   -- Active alerts + AI Analyze + Alert History modal   |
|  Bottom Charts -- Power gen/consumption + Diagnostics (Chart.js)     |
|  Detail Cards  -- Energy | Environment | Infrastructure | Logistics  |
|  Event Log     -- Live telemetry stream (clickable full-screen modal) |
+----------------------------------------------------------------------+
                                                   |
                                                   v
                                 +-----------------------------+
                                 |  LOCAL AI  (ollama_service.py)|
                                 |  Ollama / DeepSeek-R1        |
                                 |  Async job queue, no internet |
                                 +-----------------------------+
```

---

## Main Features

| # | Feature | Description |
|---|---|---|
| 1 | **Dual-Station Support** | Instant switch between Maitri (Schirmacher Oasis) and Bharati (Larsemann Hills) |
| 2 | **2D Interactive Floor Map** | Clickable rooms with live status indicators (green/amber/red) |
| 3 | **3D Digital Twin** | Three.js model in an iframe, synced via postMessage |
| 4 | **3D Overlay Filters** | Labels, Subsystems, Blizzard, Cinematic FX, Photo View |
| 5 | **Edge-First / Offline Sovereignty** | 100% local processing — no cloud dependency |
| 6 | **Priority Queue Sync** | P1 to P2 to P3 ordering; SYNC status row with live count |
| 7 | **Crash-Safe SQLite WAL** | PRAGMA journal_mode=WAL — zero data loss on power cuts |
| 8 | **Bandwidth-Adaptive Sync** | Drops P3 automatically in DEGRADED (storm) mode |
| 9 | **Mini Metric Sparkline Cards** | Energy, Battery SOC, Cooking Fuel, Gen Health with trend arrows |
| 10 | **AI Anomaly Diagnosis** | Ollama / DeepSeek-R1 local LLM, async jobs, no internet |
| 11 | **Real Historical Weather** | Maitri 2016 hourly + Bharati 2026 minute-sampled real AWS datasets |
| 12 | **Logistics Tracking** | Food / Fuel / Medicine days-remaining predictions |
| 13 | **Detail Cards Row** | Energy & Power, Environment, Infrastructure, Logistics expandable cards |
| 14 | **Full Alert History Modal** | Searchable table with AI Analyze per event and stats bar |
| 15 | **PDF Report Generator** | generate_report_pdf.py produces an executive technical report |

---

## Tech Stack

### Backend — Python 3.13

| Library | Version | Role |
|---|---|---|
| Flask | 3.1+ | REST API server |
| Flask-CORS | 6.0+ | Cross-origin requests |
| Flasgger | 0.9.7+ | Swagger UI at /apidocs |
| SQLite (built-in) | WAL mode | Crash-safe edge buffer |
| NumPy | 2.0+ | Simulation physics and seeded RNG |
| Ollama | 0.4+ | Local LLM client (DeepSeek-R1) |
| Requests | 2.32+ | HTTP utilities |

### Frontend — React / Vite

| Library | Role |
|---|---|
| React 18 | Component framework |
| Vite 6 | Build tool and dev server (Port 3000) |
| Vanilla CSS | Glassmorphic dark industrial design system |
| Chart.js | Power generation and diagnostics line charts |
| Three.js / R3F | 3D station model (served via iframe) |
| Inter + JetBrains Mono | Typography (Google Fonts) |

### Data

| File | Size | Description |
|---|---|---|
| data/maitri_weather_2016.json | 16 MB | Maitri AWS hourly historical dataset |
| data/bharati_weather_2026.json | 1.3 MB | Bharati AWS minute-sampled dataset |

---

## How to Run It

### Prerequisites
- Python 3.13+
- Node.js 18+
- Optional for AI: [Ollama](https://ollama.com) installed locally

### Step 1 — Start the Backend (Port 5000)

```bash
# From the repo root — install Python dependencies
py -3.13 -m pip install -r requirements.txt

# Launch everything: simulation engine + edge pipeline + SQLite buffer + sync worker + Flask API
py -3.13 data_simulator.py
```

API live at `http://localhost:5000` — Swagger docs at `http://localhost:5000/apidocs`

### Step 2 — Start the Frontend (Port 3000)

```bash
# Open a new terminal
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:3000`**

### Step 3 (Optional) — Enable Local AI Diagnostics

```bash
# Install Ollama from https://ollama.com, then pull the model:
ollama pull deepseek-r1

# The backend auto-connects to Ollama at localhost:11434
```

### Production Mode (60-second tick intervals)

```bash
py -3.13 data_simulator.py --prod
```

---

## Project Structure

```
Polar-Sync-Final-3D-model-integrated/
|
+-- data_simulator.py         <- ENTRY POINT: Flask API + simulation daemon
+-- simulation_core.py        <- Physics simulation math, station state, scenarios
+-- environment.py            <- Historical weather loader + replay engine
+-- edge_pipeline.py          <- Alert classify: CRITICAL / MODERATE / NORMAL
+-- edge_storage.py           <- SQLite WAL thread-safe priority buffer
+-- sync_worker.py            <- Bandwidth-adaptive priority sync engine
+-- network_state.py          <- ONLINE / DEGRADED / OFFLINE mode singleton
+-- ollama_service.py         <- Local AI (Ollama/DeepSeek) async job queue
+-- generate_report_pdf.py    <- Executive PDF report generator
+-- run_demo_measurements.py  <- CLI demo runner
|
+-- data/
|   +-- maitri_weather_2016.json      (16 MB  real Maitri AWS hourly dataset)
|   +-- bharati_weather_2026.json     (1.3 MB real Bharati AWS minute-sampled dataset)
|
+-- requirements.txt              Python dependencies
|
+-- test.py                       General integration tests
+-- test_edge_apis.py             API endpoint tests
+-- test_edge_pipeline.py         Pipeline unit tests
+-- test_edge_storage.py          SQLite WAL storage tests
+-- test_sync_worker.py           Sync worker unit tests
|
+-- frontend/
    +-- index.html
    +-- vite.config.js
    +-- src/
        +-- main.jsx
        +-- App.jsx                      Root: polling loop + full layout shell
        +-- index.css                    Dark industrial design system (~54 KB)
        +-- services/
        |   +-- api.js                   All fetch() calls to Flask API
        |   +-- weatherService.js        Weather data service
        +-- data/
        |   +-- stationRooms.js          Room definitions + alert detection rules
        +-- components/
            +-- Header.jsx               Top bar: brand, station tabs, UTC clock
            +-- EdgeComputingControl.jsx [SYNC ACTIVE] button + live popup
            +-- EdgeComputingPanel.jsx   Priority queue + Edge History sidebar
            +-- MetricCards.jsx          Mini metric sparkline cards (top-right)
            +-- LeftPanel.jsx            Station metrics (energy, fuel, power)
            +-- AlertPanel.jsx           Alerts + AI Analyze + history modal
            +-- DigitalTwin.jsx          Maitri 2D map + 3D iframe + filter buttons
            +-- BharatiDigitalTwin.jsx   Bharati 2D map + 3D iframe + filter buttons
            +-- ChartsSection.jsx        Power gen/consumption charts (Chart.js)
            +-- RoomInfoPanel.jsx        Room telemetry inspector modal
            +-- LogsView.jsx             Live event log + full-screen modal
            +-- WeatherPanel.jsx         Weather data shell
            +-- WeatherCards.jsx         Weather metric cards
            +-- WeatherCharts.jsx        Weather trend charts
            +-- WeatherSummary.jsx       Weather summary view
```

---

## API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Backend service health check |
| GET | /api/data?station=MAITRI | Latest telemetry snapshot for station |
| GET | /api/telemetry/history?station=MAITRI | Last 30 data points for charts |
| GET | /api/anomaly-events?station=MAITRI | Recent simulated anomaly events |
| GET | /api/edge/status | Network mode, sync state, buffer health |
| GET | /api/edge/queue | P1 / P2 / P3 pending record counts |
| GET | /api/edge/history?limit=20 | Recent SQLite transmission log |
| POST | /api/alerts/analyze | Start async AI analysis job (Ollama) |
| GET | /api/alerts/analyze/<job_id> | Poll AI analysis job result |

---

## Demo / Documentation / Links

| Resource | Link |
|---|---|
| Live Demo | https://polarsync-dashboard.vercel.app/ |
| GitHub Repository | https://github.com/shahidsayyad1011/Polar-Sync-Final-3D-model-integrated |
| Backend API (runtime) | http://localhost:5000/apidocs (Swagger UI) |
| Dashboard (runtime) | http://localhost:3000 |
| Modification Log | modification.md |

---

## Contributors / License

**Built for:** Antarctic Station Management and Resilient Remote Systems Engineering — India's polar research infrastructure.

**Repository maintainer:** shahidsayyad1011 (https://github.com/shahidsayyad1011)

**License:** Not explicitly specified in the repository.