import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import SearchPanel from "./components/SearchPanel";
import RouteResults from "./components/RouteResults";
import "./styles/global.css";

const API = "http://localhost:8000";

export default function App() {
  const [stations, setStations]                 = useState([]);
  const [suburbanStations, setSuburbanStations] = useState([]);
  const [busStops, setBusStops]                 = useState([]);
  const [busRoutes, setBusRoutes]               = useState([]);
  const [backendStatus, setBackendStatus]       = useState("connecting");
  const [searchState, setSearchState]           = useState("idle");
  const [routes, setRoutes]                     = useState([]);
  const [selectedRoute, setSelectedRoute]       = useState(null);
  const [panelOpen, setPanelOpen]               = useState(false);
  const [fromPlace, setFromPlace]               = useState(null);
  const [toPlace, setToPlace]                   = useState(null);
  const [activeMapType, setActiveMapType]       = useState("default");
  const [selectedStationNode, setSelectedStationNode] = useState(null);
  const [panelMinimized, setPanelMinimized]     = useState(false);

  // Persist search text across open/close of panel
  const [fromText, setFromText] = useState("");
  const [toText, setToText]     = useState("");

  const stationDrawerOpen = !!selectedStationNode;

  useEffect(() => {
    async function connectToBackend() {
      try {
        const [metroRes, suburbanRes, busRes, busRoutesRes] = await Promise.all([
          fetch(`${API}/stations`),
          fetch(`${API}/suburban/stations`),
          fetch(`${API}/bus/stops`),
          fetch(`${API}/bus/routes`),
        ]);
        if (!metroRes.ok) throw new Error();
        const metroData    = await metroRes.json();
        const suburbanData = suburbanRes.ok ? await suburbanRes.json() : [];
        const busData      = busRes.ok ? await busRes.json() : [];
        const busRoutesData= busRoutesRes.ok ? await busRoutesRes.json() : [];
        
        setStations(metroData);
        setSuburbanStations(suburbanData);
        setBusStops(busData);
        setBusRoutes(busRoutesData);
        setBackendStatus("online");
      } catch {
        setBackendStatus("offline");
        setTimeout(connectToBackend, 5000);
      }
    }
    connectToBackend();
  }, []);

  function handleMapTap() {
    setPanelMinimized(true);
  }

  function handleSearch(from, to, pref, activeModes) {
    if (!from || !to) return;
    // Guard: cannot route without station data
    if (!stations.length) return;
    setFromPlace(from);
    setToPlace(to);
    setSearchState("searching");
    const built = buildDemoRoutes(from, to, stations, pref, activeModes);
    setRoutes(built);
    setSelectedRoute(built[0]);
    setSearchState("results");
    setPanelMinimized(false);
  }

  function handleRouteSelect(route) {
    // Direct state update — no null reset hack needed
    setSelectedRoute(route);
  }

  function handleCloseResults() {
    // Clear route on map
    setSelectedRoute(null);
    setFromPlace(null);
    setToPlace(null);
    setRoutes([]);
    setSearchState("idle");
    setPanelOpen(false);
    setPanelMinimized(false);
    // Keep fromText/toText so the pill reopens with text still there
  }

  return (
    <div className="app">
      <MapView
        stations={stations}
        suburbanStations={suburbanStations}
        busStops={busStops}
        busRoutes={busRoutes}
        backendStatus={backendStatus}
        selectedRoute={selectedRoute}
        onMapTap={handleMapTap}
        fromPlace={fromPlace}
        toPlace={toPlace}
        activeMapType={activeMapType}
        setActiveMapType={setActiveMapType}
        selectedStationNode={selectedStationNode}
        setSelectedStationNode={setSelectedStationNode}
        isRoutingMode={searchState === "results"}
        showMapSelector={!panelOpen && searchState !== "results"}
        onUserDrag={() => setPanelMinimized(true)}
      />

      {/* Hide search pill when station drawer is open to avoid overlap */}
      {searchState !== "results" && !stationDrawerOpen && (
        <SearchPanel
          isOpen={panelOpen}
          onOpen={() => {
            setPanelOpen(true);
            setPanelMinimized(false);
          }}
          onClose={() => {
            setPanelOpen(false);
            setPanelMinimized(false);
          }}
          onSearch={handleSearch}
          isSearching={searchState === "searching"}
          backendStatus={backendStatus}
          isMinimized={panelMinimized && panelOpen}
          onExpand={() => setPanelMinimized(false)}
          persistFromText={fromText}
          persistToText={toText}
          onFromTextChange={setFromText}
          onToTextChange={setToText}
        />
      )}

      {searchState === "results" && (
        <RouteResults
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={handleRouteSelect}
          onClose={handleCloseResults}
          from={fromPlace}
          to={toPlace}
          isMinimized={panelMinimized}
          onExpand={() => setPanelMinimized(false)}
        />
      )}
    </div>
  );
}

// ── Route durations calculated from real station segment counts ──
function buildDemoRoutes(from, to, stations, pref = "fastest", activeModes = []) {
  const blue  = stations.filter(s => s.line === "blue").sort((a,b) => a.id - b.id);
  const green = stations.filter(s => s.line === "green").sort((a,b) => a.id - b.id);

  // Safety guard
  if (!blue.length || !green.length) return [];

  function nearest(lat, lng, list) {
    let best = list[0], bestDist = Infinity;
    list.forEach(s => {
      const d = Math.hypot(s.latitude - lat, s.longitude - lng);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    return { station: best, dist: bestDist };
  }

  function segment(list, fromS, toS) {
    const fi = list.findIndex(s => s.id === fromS.id);
    const ti = list.findIndex(s => s.id === toS.id);
    if (fi === -1 || ti === -1) return [];
    const start = Math.min(fi, ti), end = Math.max(fi, ti) + 1;
    return list.slice(start, end).map(s => [s.latitude, s.longitude]);
  }

  // Distances in rough km (1 degree lat ≈ 111km)
  function distKm(lat1, lng1, lat2, lng2) {
    return Math.round(Math.hypot((lat2 - lat1) * 111, (lng2 - lng1) * 90) * 10) / 10;
  }

  const { station: bFrom, dist: bFromDist } = nearest(from.lat, from.lng, blue);
  const { station: bTo,   dist: bToDist   } = nearest(to.lat, to.lng, blue);
  const { station: gFrom, dist: gFromDist } = nearest(from.lat, from.lng, green);
  const { station: gTo,   dist: gToDist   } = nearest(to.lat, to.lng, green);

  // Segment lengths
  const blueSegs   = segment(blue, bFrom, bTo);
  const greenSegs  = segment(green, gFrom, gTo);
  const blueStops  = blueSegs.length;
  const greenStops = greenSegs.length;

  // Real duration calc: walk 5 min/km, metro 2.5 min/stop
  const walkToBlue   = Math.max(3, Math.round(bFromDist * 111 * 12)); // approx walk min
  const walkFromBlue = Math.max(3, Math.round(bToDist   * 111 * 12));
  const walkToGreen  = Math.max(3, Math.round(gFromDist * 111 * 12));
  const walkFromGreen= Math.max(3, Math.round(gToDist   * 111 * 12));
  const blueRide     = Math.max(5, blueStops  * 2);
  const greenRide    = Math.max(5, greenStops * 2);

  const blueTotalMin  = walkToBlue + blueRide + walkFromBlue;
  const greenTotalMin = walkToGreen + greenRide + walkFromGreen;

  const blueDistKm  = distKm(from.lat, from.lng, to.lat, to.lng);
  const blueCost    = Math.max(10, Math.round(blueDistKm  * 2.5));
  const greenCost   = Math.max(10, Math.round(blueDistKm  * 2.0));

  return [
    {
      id: 1, tag: "fastest", label: "Fastest",
      duration_min: blueTotalMin,
      distance_km: blueDistKm,
      cost_inr: blueCost,
      transfers: 0,
      legs: [
        { mode: "walk",  label: "Walk to station",     duration_min: walkToBlue,   color: "#8b8cf8", points: [[from.lat, from.lng], [bFrom.latitude, bFrom.longitude]] },
        { mode: "metro", label: "Blue Line",           duration_min: blueRide,     color: "#00b4d8", points: blueSegs },
        { mode: "walk",  label: "Walk to destination", duration_min: walkFromBlue, color: "#8b8cf8", points: [[bTo.latitude, bTo.longitude], [to.lat, to.lng]] },
      ],
    },
    {
      id: 2, tag: "cheapest", label: "Cheapest",
      duration_min: greenTotalMin,
      distance_km: blueDistKm,
      cost_inr: greenCost,
      transfers: 0,
      legs: [
        { mode: "walk",  label: "Walk to station",     duration_min: walkToGreen,   color: "#8b8cf8", points: [[from.lat, from.lng], [gFrom.latitude, gFrom.longitude]] },
        { mode: "metro", label: "Green Line",          duration_min: greenRide,     color: "#06d6a0", points: greenSegs },
        { mode: "walk",  label: "Walk to destination", duration_min: walkFromGreen, color: "#8b8cf8", points: [[gTo.latitude, gTo.longitude], [to.lat, to.lng]] },
      ],
    },
    {
      id: 3, tag: "leastwalk", label: "Least Walk",
      duration_min: Math.round((blueTotalMin + greenTotalMin) / 2),
      distance_km: blueDistKm,
      cost_inr: Math.round((blueCost + greenCost) / 2),
      transfers: 0,
      legs: [
        { mode: "walk",  label: "Walk to station",     duration_min: Math.min(walkToBlue, walkToGreen),    color: "#8b8cf8", points: [[from.lat, from.lng], [bFrom.latitude, bFrom.longitude]] },
        { mode: "metro", label: "Blue Line Direct",    duration_min: blueRide,                            color: "#00b4d8", points: blueSegs },
        { mode: "walk",  label: "Walk to destination", duration_min: Math.min(walkFromBlue, walkFromGreen), color: "#8b8cf8", points: [[bTo.latitude, bTo.longitude], [to.lat, to.lng]] },
      ],
    },
  ];
}
