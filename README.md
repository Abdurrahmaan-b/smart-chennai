# Smart Chennai — Multi-Modal Transit HUD

A real-time, multi-modal public transport planner and explorer for Chennai. Built with React + MapLibre GL (frontend) and FastAPI + SQLite (backend).

---

## 🗂 Project Structure

```
smart chennai/
├── backend/               # FastAPI Python server
│   ├── main.py            # API endpoints
│   ├── requirements.txt   # Python dependencies
│   ├── chennai_metro_clean.db
│   ├── chennai_suburban.db
│   └── chennai_bus.db
│
└── frontend/              # React + Vite app
    ├── src/
    │   ├── App.jsx         # Root state & routing logic
    │   ├── components/
    │   │   ├── MapView.jsx      # MapLibre map, transit layers
    │   │   ├── SearchPanel.jsx  # Search input bottom-sheet
    │   │   └── RouteResults.jsx # Route cards + step breakdown
    │   └── styles/
    │       └── global.css  # Design tokens & reset
    └── index.html
```

---

## 🚀 Running Locally

### 1. Backend (FastAPI)

```bash
cd "smart chennai/backend"
pip install -r requirements.txt
py -m uvicorn main:app --reload
```

Server runs at **http://localhost:8000**

### 2. Frontend (Vite + React)

```bash
cd "smart chennai/frontend"
npm install
npm run dev
```

App runs at **http://localhost:5173**

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/stations` | All metro stations |
| GET | `/stations/{line}` | Metro stations by line (blue/green) |
| GET | `/connections` | Metro connections |
| GET | `/schedules` | Metro schedules |
| GET | `/suburban/stations` | All suburban stations |
| GET | `/suburban/connections` | Suburban connections |
| GET | `/suburban/schedules` | Suburban schedules |
| GET | `/bus/stops` | All bus stops |
| GET | `/bus/routes` | All bus routes |
| GET | `/bus/schedules` | Bus schedules |

---

## 🗺 Map Features

- **Normal Map** — base dark CartoDB map
- **Metro** — Blue & Green neon lines with clickable stations
- **Suburban** — Dashed rail lines (Beach–Chengalpattu, Beach–Arakkonam, Beach–Gummidipoondi)
- **Bus** — MTC bus stop nodes
- **All Transit** — All layers combined

---

## 📋 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend framework | React 18 + Vite |
| Map engine | MapLibre GL JS |
| Map tiles | CartoDB Dark Matter |
| Backend | FastAPI (Python) |
| Database | SQLite (3 separate DBs) |
| Geocoding | OSM Nominatim |
| Fonts | Syne, DM Sans, JetBrains Mono |
