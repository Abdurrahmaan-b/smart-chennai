# ⚡ SMART CHENNAI : Multi-Modal Transit HUD & Intelligent Routing Engine

> Next-Generation Multi-Modal Public Transit Planner & Real-Time Environmental Console for the Chennai Metropolitan Region.

```
   _____ __  ___ ___    ____  ______   ______ __  __ ______ _   __ _   __ ___     ____
  / ___//  |/  //   |  / __ \/_  __/  / ____// / / // ____// | / // | / //   |   /  _/
  \__ \ / /|_/ // /| | / /_/ / / /   / /    / /_/ // __/  /  |/ //  |/ // /| |   / /  
 ___/ // /  / // ___ |/ _, _/ / /   / /___ / __  // /___ / /|  // /|  // ___ | _/ /   
/____//_/  /_//_/  |_/_/ |_| /_/    \____//_/ /_//_____//_/ |_//_/ |_//_/  |_|/___/   
                                                                                      
```

Smart Chennai is a high-tech, responsive Progressive Web App (PWA) transit console designed to consolidate, visualize, and optimize commuting across Chennai's complex transportation grid. It binds together Chennai Metro (CMRL), Suburban Rail, MTC Bus Networks, and Private Transport (Cabs, Autos, Bike Taxis) into a single, cohesive, neon-infused glassmorphic HUD.

---

## 🧭 System Architecture & Data Flow

```mermaid
graph TD
    User([User Client]) -->|1. Search Request / Geolocation| FE[React + MapLibre GL Frontend]
    FE -->|2. Query / Reverse Geocode| BE[FastAPI Python Backend]
    
    subgraph External APIs (Keyless & Cached)
        BE -->|3. Chennai-Restricted Lookup| Geoapify[Geoapify Geocoding API]
        BE -->|4. Current Weather Code| OpenMeteo[Open-Meteo Weather API]
    end
    
    subgraph Relational Datasets
        BE -->|5. SQL Queries| DB[(Chennai Transit SQLite DBs)]
        DB -->|Metro / Suburban / Bus stops| BE
    end

    BE -->|6. Unified Status & Suggestions| FE
    FE -->|7. Live Sweeping Clock & Weather HUD| User
```

---

## 🌟 Core Features

### 1. Multi-Modal HUD Viewport
*   **Base Map:** Customized using CartoDB Dark Matter tiles, optimized for high contrast neon routes.
*   **Metro Layer:** Neon Blue and Green lines representing Chennai Metro routes, with interactive clickable stations.
*   **Suburban Layer:** Distinct dashed rail corridors representing the major local train lines:
    *   *Beach – Chengalpattu*
    *   *Beach – Arakkonam*
    *   *Beach – Gummidipoondi*
*   **Bus Layer:** Real-time plot of MTC bus stops linked by dashed routes tracing segment sequences.

### 2. Intelligent Autocomplete & Fuzzy Geocoding
*   **Strict Boundary Restriction:** Search results are strictly limited to the Chennai Metropolitan Area using a `40km` bounding circle centered at `(13.067, 80.235)`.
*   **Parallel Typo Fallback:** Combines rapid prefix-based autocomplete with deep fuzzy geocoding. If a user inputs a spelling mistake (e.g., *"syful"*), the backend automatically resolves it to the correct coordinate-pinned location (*"Saiful Mulk Street"*).
*   **Google Maps-Style UI:** Displays suggestion items showing the primary name bolded on top, and the full address details in smaller gray text below.

### 3. GPS Pinpoint Geolocation
*   **Device Location Tracker:** Seamlessly integrates with the HTML5 Geolocation API.
*   **Reverse Geocoding:** Translates raw coordinates into readable local street names (e.g. *"Pudupet, Chennai"*).
*   **Camera Animations:** Smoothly pans and adjusts map zoom thresholds (`flyTo` & `fitBounds`) to center around selected start and end pins.

### 4. Floating Environmental HUD (Live Clock & Weather)
*   **Chennai local clock:** Formatted to the `Asia/Kolkata` timezone. Synchronizes with backend time and runs a local high-precision interval loop for a smooth sweeping second hand.
*   **Analog clock face:** Styled as a glowing dark glassmorphic dial with major/minor tick marks, thick white hands, and a signature cyan accent second hand.
*   **Live Weather Sync:** Connects to Open-Meteo (keyless, zero rate-limit issues) to track live rain indices.
*   **HUD Badges:** Automatically indicators for **⚡ PEAK HOURS** and **🚇 NO METRO** status.

---

## 🧠 The Upcoming Core: "The Brain"

The routing intelligence (currently in discussion mode) is mapped out as follows:

```
                  ┌───────────────────────────────┐
                  │ User Inputs (From, To, Prefs) │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │ Unified Graph Routing Search  │
                  │  (Metro + Suburban + MTC Bus) │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │  Walkability Threshold Engine │
                  │  (Inject Cab/Auto if > 1.0km) │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │   Dynamic Multiplier Layer    │
                  │   (Peak Hour / Weather Surge) │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │ AI Review & Interactive Gate  │
                  │   (Gemini Dialog Clarifier)   │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │   Final Humanized Suggestions │
                  └───────────────────────────────┘
```

### 1. Scoring Formula
Every route candidate is mathematically evaluated and ranked by **The Brain** using:
$$Score = w_t \cdot T_{total} + w_c \cdot C_{total} + w_w \cdot W_{total} + w_f \cdot F_{transfers}$$
*   Where $T$, $C$, $W$, and $F$ represent Time, Cost, Walking Distance, and Transfer Count, adjusted dynamically based on weather conditions (rain doubles walking penalty) and peak hours (increases private taxi commute time).

### 2. Conversational Quality Gate
Before suggesting impractical routes (e.g., forcing a 2km walk because private cabs are toggled off), the backend packages all route options and passes them to the **Gemini API**. The AI reviews the candidates and conversationally clarifies options with the user:
> *"Cabs are disabled, but the closest bus stop is a 1.8km walk away. Should I add a Bike Taxi option for that last stretch, or show you the walking route?"*

---

## 🗂 Project Directory Structure

```
smart-chennai/
├── backend/               # FastAPI Python Server
│   ├── main.py            # API controller, database queries, and geocoding proxies
│   ├── requirements.txt   # Backend packages (fastapi, requests, uvicorn, etc.)
│   ├── chennai_metro_clean.db
│   ├── chennai_suburban.db
│   └── chennai_bus.db
│
└── frontend/              # Vite + React Client
    ├── src/
    │   ├── App.jsx         # Root app state, polling logic, and theme controller
    │   ├── components/
    │   │   ├── MapView.jsx      # Map viewport, SVG Analog Clock, layers renderer
    │   │   ├── MapView.css      # Glassmorphic HUD overlay styling
    │   │   ├── SearchPanel.jsx  # Search panel inputs & suggestions renderer
    │   │   └── SearchPanel.css  # Search dropdown & scroll-chip styling
    │   └── main.jsx
    └── index.html
```

---

## 🚀 Installation & Local Execution

### 1. Clone the Repository
```bash
git clone https://github.com/Abdurrahmaan-b/smart-chennai.git
cd smart-chennai
```

### 2. Launch the Backend Server
```bash
cd backend
pip install -r requirements.txt
py -m uvicorn main:app --reload
```
*Backend runs locally at: `http://localhost:8000`*

### 3. Launch the Frontend Dev Client
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend client loads locally at: `http://localhost:5173`*

---

## 🎨 Visual Design Token System

*   **Theme:** Glassmorphism overlay sitting above a dark map base.
*   **Colors:**
    *   `--bg-hud`: `rgba(6, 13, 26, 0.86)` (Deep space blue glass)
    *   `--cyan-accent`: `#00b4d8` (Chennai Metro Blue / Second hand glow)
    *   `--green-accent`: `#06d6a0` (Chennai Metro Green)
    *   `--orange-accent`: `#f4a261` (Suburban Rail highlight)
    *   `--border-glow`: `rgba(255, 255, 255, 0.09)`
*   **Typography:** Syne (futuristic headers), DM Sans (highly legible UI details), JetBrains Mono (tech/monospace HUD badges).
