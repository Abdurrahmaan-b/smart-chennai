import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapView.css";

const CHENNAI_CENTER = [80.235, 13.067]; // [lng, lat]

export default function MapView({
  stations = [],
  suburbanStations = [],
  busStops = [],
  busRoutes = [],
  backendStatus,
  selectedRoute,
  onMapTap,
  fromPlace,
  toPlace,
  activeMapType,
  setActiveMapType,
  selectedStationNode,
  setSelectedStationNode,
  isRoutingMode = false,
  showMapSelector = true,
  onUserDrag,
}) {
  const mapContainerRef = useRef(null);
  const mapInst = useRef(null);

  // Keep stable refs to handlers to avoid rebuilding map listeners when they change
  const interactionRef = useRef(onUserDrag);
  useEffect(() => {
    interactionRef.current = onUserDrag;
  }, [onUserDrag]);

  const mapTapRef = useRef(onMapTap);
  useEffect(() => {
    mapTapRef.current = onMapTap;
  }, [onMapTap]);

  const selectNodeRef = useRef(setSelectedStationNode);
  useEffect(() => {
    selectNodeRef.current = setSelectedStationNode;
  }, [setSelectedStationNode]);

  // ── Node details trigger bindings ──
  const setupMarkerInteractions = useCallback((map) => {
    // Metro Click
    map.on("click", "metro-stations", (e) => {
      if (e.features.length) {
        const p = e.features[0].properties;
        selectNodeRef.current({
          name: p.name,
          type: "metro",
          line: p.line,
          isInterchange: p.is_interchange,
          contact: "1860-425-1515 (CMRL Metro Helpline)",
        });
        map.flyTo({ center: e.features[0].geometry.coordinates, zoom: 14, pitch: 45 });
      }
    });

    // Suburban Click
    map.on("click", "suburban-stations", (e) => {
      if (e.features.length) {
        const p = e.features[0].properties;
        selectNodeRef.current({
          name: p.name,
          type: "suburban",
          line: p.line,
          contact: "139 (Railway Enquiry)",
        });
        map.flyTo({ center: e.features[0].geometry.coordinates, zoom: 14, pitch: 45 });
      }
    });

    // Bus Stop Click
    map.on("click", "bus-stops-layer", (e) => {
      if (e.features.length) {
        const p = e.features[0].properties;
        selectNodeRef.current({
          name: p.name,
          type: "bus",
          area: p.area,
          contact: "044-25363412 (MTC Broadway Terminus)",
        });
        map.flyTo({ center: e.features[0].geometry.coordinates, zoom: 14.5, pitch: 45 });
      }
    });

    // Pointer feedback
    const interactiveLayers = ["metro-stations", "suburban-stations", "bus-stops-layer"];
    interactiveLayers.forEach((layer) => {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    });
  }, []);

  // ── Setup Sources & WebGL Styles ──
  const setupTransitSourcesAndLayers = useCallback((map) => {
    // Add Sources if not present
    if (!map.getSource("metro-lines-source")) {
      map.addSource("metro-lines-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("metro-stations-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("suburban-lines-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("suburban-stations-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("bus-stops-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("bus-routes-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("route-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("pins-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }

    // ── METRO STYLING (Neon Glow Layer + Core Solid Layer) ──
    if (!map.getLayer("metro-lines-glow")) {
      map.addLayer({
        id: "metro-lines-glow",
        type: "line",
        source: "metro-lines-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 9,
          "line-opacity": 0.35,
          "line-blur": 5,
        },
      });

      map.addLayer({
        id: "metro-lines-core",
        type: "line",
        source: "metro-lines-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "metro-stations",
        type: "circle",
        source: "metro-stations-source",
        paint: {
          "circle-radius": ["case", ["==", ["get", "is_interchange"], "yes"], 6.5, 4.5],
          "circle-color": ["case", ["==", ["get", "line"], "blue"], "#00b4d8", "#06d6a0"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
          "circle-stroke-opacity": 0.8,
        },
      });
    }

    // ── SUBURBAN TRAIN STYLING (Solid Rail base + Dashed Track Overlay) ──
    if (!map.getLayer("suburban-lines-base")) {
      map.addLayer({
        id: "suburban-lines-base",
        type: "line",
        source: "suburban-lines-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#1a2540",
          "line-width": 4.5,
          "line-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "suburban-lines-track",
        type: "line",
        source: "suburban-lines-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-dasharray": [3, 4],
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "suburban-stations",
        type: "circle",
        source: "suburban-stations-source",
        paint: {
          "circle-radius": 4.5,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.7,
        },
      });
    }

    // ── BUS STOPS STYLING (Obsidian-glow Red Circular nodes) ──
    if (!map.getLayer("bus-stops-layer")) {
      map.addLayer({
        id: "bus-stops-layer",
        type: "circle",
        source: "bus-stops-source",
        paint: {
          "circle-radius": 4,
          "circle-color": "#ef4444",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.7,
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "bus-routes-layer",
        type: "line",
        source: "bus-routes-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ef4444",
          "line-width": 1.5,
          "line-opacity": 0.45,
          "line-dasharray": [1, 2],
        },
      }, "bus-stops-layer"); // ensure route lines are drawn below the stop circles
    }

    // ── ROUTE LINES STYLING (WebGL Arc path rendering style) ──
    if (!map.getLayer("route-glow-layer")) {
      map.addLayer({
        id: "route-glow-layer",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 10,
          "line-opacity": 0.3,
          "line-blur": 6,
        },
      });

      map.addLayer({
        id: "route-core-layer",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3.5,
          "line-opacity": 0.95,
          "line-dasharray": ["case", ["==", ["get", "mode"], "walk"], [2, 3], [1, 0]],
        },
      });

      map.addLayer({
        id: "route-pins",
        type: "circle",
        source: "pins-source",
        paint: {
          "circle-radius": 7,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    }

    // ── Hover/Click interaction bindings ──
    setupMarkerInteractions(map);
  }, [setupMarkerInteractions]);

  // ── Load data array properties into GeoJSON structures ──
  const updateTransitData = useCallback((map) => {
    // 1. Metro Lines
    const metroFeatures = [];
    const blueCoords = stations.filter((s) => s.line === "blue").sort((a, b) => a.id - b.id).map((s) => [s.longitude, s.latitude]);
    const greenCoords = stations.filter((s) => s.line === "green").sort((a, b) => a.id - b.id).map((s) => [s.longitude, s.latitude]);

    if (blueCoords.length > 1) {
      metroFeatures.push({ type: "Feature", properties: { line: "blue", color: "#00b4d8" }, geometry: { type: "LineString", coordinates: blueCoords } });
    }
    if (greenCoords.length > 1) {
      metroFeatures.push({ type: "Feature", properties: { line: "green", color: "#06d6a0" }, geometry: { type: "LineString", coordinates: greenCoords } });
    }
    map.getSource("metro-lines-source").setData({ type: "FeatureCollection", features: metroFeatures });

    // 2. Metro Stations
    map.getSource("metro-stations-source").setData({
      type: "FeatureCollection",
      features: stations.map((s) => ({
        type: "Feature",
        properties: { name: s.name, line: s.line, is_interchange: s.is_interchange },
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      })),
    });

    // 3. Suburban Lines
    const suburbanFeatures = [];
    const suburbanLines = ["beach-chengalpattu", "beach-arakkonam", "beach-gummidipoondi"];
    const suburbanColors = { "beach-chengalpattu": "#F5A623", "beach-arakkonam": "#c084fc", "beach-gummidipoondi": "#E8D44D" };

    suburbanLines.forEach((lineName) => {
      const coords = suburbanStations.filter((s) => s.line === lineName).sort((a, b) => a.id - b.id).map((s) => [s.longitude, s.latitude]);
      if (coords.length > 1) {
        suburbanFeatures.push({
          type: "Feature",
          properties: { line: lineName, color: suburbanColors[lineName] || "#ffffff" },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    });
    map.getSource("suburban-lines-source").setData({ type: "FeatureCollection", features: suburbanFeatures });

    // 4. Suburban Stations
    map.getSource("suburban-stations-source").setData({
      type: "FeatureCollection",
      features: suburbanStations.map((s) => ({
        type: "Feature",
        properties: { name: s.name, line: s.line, color: suburbanColors[s.line] || "#ffffff" },
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      })),
    });

    // 5. Bus Stops & Routes
    const busStopDict = {};
    const busStopFeatures = busStops.map((b) => {
      const coord = [b.longitude, b.latitude];
      busStopDict[b.name.toLowerCase()] = coord;
      return {
        type: "Feature",
        properties: { name: b.name, area: b.area },
        geometry: { type: "Point", coordinates: coord },
      };
    });
    
    map.getSource("bus-stops-source").setData({
      type: "FeatureCollection",
      features: busStopFeatures,
    });

    const busRouteFeatures = busRoutes.map((r) => {
      const stops = r.stop_sequence.split(",").map(s => s.trim().toLowerCase());
      const coords = stops.map(sName => busStopDict[sName]).filter(c => c);
      if (coords.length > 1) {
        return {
          type: "Feature",
          properties: { route: r.route_number, name: r.route_name },
          geometry: { type: "LineString", coordinates: coords },
        };
      }
      return null;
    }).filter(Boolean);

    map.getSource("bus-routes-source").setData({
      type: "FeatureCollection",
      features: busRouteFeatures,
    });
  }, [stations, suburbanStations, busStops, busRoutes]);

  // ── Apply layer visibility according to morph state ──
  const applyLayerVisibility = useCallback((map) => {
    const showMetro = activeMapType === "metro" || activeMapType === "all";
    const showSuburban = activeMapType === "suburban" || activeMapType === "all";
    const showBus = activeMapType === "bus" || activeMapType === "all";

    // Metro layers
    ["metro-lines-glow", "metro-lines-core", "metro-stations"].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", showMetro ? "visible" : "none");
      }
    });

    // Suburban layers
    ["suburban-lines-base", "suburban-lines-track", "suburban-stations"].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", showSuburban ? "visible" : "none");
      }
    });

    // Bus stops and routes
    if (map.getLayer("bus-stops-layer")) {
      map.setLayoutProperty("bus-stops-layer", "visibility", showBus ? "visible" : "none");
      map.setLayoutProperty("bus-routes-layer", "visibility", showBus ? "visible" : "none");
      if (showBus) {
        const isAllMode = activeMapType === "all";
        map.setPaintProperty("bus-stops-layer", "circle-radius", isAllMode ? 2.5 : 4);
        map.setPaintProperty("bus-stops-layer", "circle-opacity", isAllMode ? 0.35 : 0.9);
        map.setPaintProperty("bus-stops-layer", "circle-stroke-opacity", isAllMode ? 0.2 : 0.7);
        map.setPaintProperty("bus-routes-layer", "line-opacity", isAllMode ? 0.15 : 0.45);
      }
    }
  }, [activeMapType]);

  // ── Initialize MapLibre GL JS Map ONCE ──
  useEffect(() => {
    if (mapInst.current) return;

    // CartoDB Dark Matter GL style - free vector tiles, 3D buildings, dark obsidian style
    const styleUrl = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    mapInst.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: CHENNAI_CENTER,
      zoom: 11.5,
      pitch: 45,       // Default 3D tilted camera
      bearing: -15,    // Default rotated camera angle
      attributionControl: false,
    });

    mapInst.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    const handleMapClick = (e) => {
      // If we clicked on an active layer, event handles it. Otherwise close drawer/trigger onMapTap
      const features = mapInst.current.queryRenderedFeatures(e.point, {
        layers: ["metro-stations", "suburban-stations", "bus-stops-layer"],
      });
      if (!features.length) {
        if (mapTapRef.current) mapTapRef.current();
        selectNodeRef.current(null);
      }
    };

    const handleInteraction = () => {
      if (interactionRef.current) interactionRef.current();
    };

    mapInst.current.on("click", handleMapClick);
    // Only minimize on ACTUAL user drag, not programmatic flyTo/fitBounds
    mapInst.current.on("dragstart", handleInteraction);

    // Clean up on unmount
    return () => {
      if (mapInst.current) {
        mapInst.current.off("click", handleMapClick);
        mapInst.current.off("dragstart", handleInteraction);
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, []);

  // ── Setup GeoJSON layers once data is loaded ──
  useEffect(() => {
    if (!mapInst.current) return;
    const map = mapInst.current;

    const onMapLoad = () => {
      setupTransitSourcesAndLayers(map);
      updateTransitData(map);
      applyLayerVisibility(map);
    };

    map.on("load", onMapLoad);

    // If style is already loaded (for updates after initial mount)
    if (map.isStyleLoaded()) {
      setupTransitSourcesAndLayers(map);
      updateTransitData(map);
      applyLayerVisibility(map);
    }

    return () => {
      map.off("load", onMapLoad);
    };
  }, [stations, suburbanStations, busStops, setupTransitSourcesAndLayers, updateTransitData, applyLayerVisibility]);

  // ── Handle Map Mode Layer Morphing (Opacity) ──
  useEffect(() => {
    if (!mapInst.current) return;
    const map = mapInst.current;
    if (map.isStyleLoaded()) {
      applyLayerVisibility(map);
    }
  }, [activeMapType, applyLayerVisibility]);

  // ── Handle Tapped Route Layering ──
  useEffect(() => {
    if (!mapInst.current) return;
    const map = mapInst.current;

    function drawRoute() {
      if (!map.getSource("route-source")) return;

      // Clear when no route selected
      if (!selectedRoute) {
        map.getSource("route-source").setData({ type: "FeatureCollection", features: [] });
        map.getSource("pins-source").setData({ type: "FeatureCollection", features: [] });
        ["route-glow-layer", "route-core-layer"].forEach((id) => {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        });
        return;
      }

      // Draw Selected Route Path
      const features = selectedRoute.legs
        .filter(leg => leg.points && leg.points.length > 1)
        .map((leg) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: leg.points.map((pt) => [pt[1], pt[0]]), // [lat,lng] -> [lng,lat]
          },
          properties: { mode: leg.mode, color: leg.color || "#8b8cf8" },
        }));

      map.getSource("route-source").setData({ type: "FeatureCollection", features });

      // Draw Pins
      const pinFeatures = [];
      if (fromPlace) {
        pinFeatures.push({ type: "Feature", geometry: { type: "Point", coordinates: [fromPlace.lng, fromPlace.lat] }, properties: { label: "FROM", color: "#f4a261" } });
      }
      if (toPlace) {
        pinFeatures.push({ type: "Feature", geometry: { type: "Point", coordinates: [toPlace.lng, toPlace.lat] }, properties: { label: "DEST", color: "#e63946" } });
      }
      map.getSource("pins-source").setData({ type: "FeatureCollection", features: pinFeatures });

      // Show route layers
      ["route-glow-layer", "route-core-layer"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
      });

      // Fit bounds to show the full route
      const allCoords = selectedRoute.legs
        .filter(leg => leg.points && leg.points.length > 0)
        .flatMap(leg => leg.points.map(pt => [pt[1], pt[0]]));
      if (allCoords.length > 1) {
        const bounds = allCoords.reduce(
          (acc, coord) => acc.extend(coord),
          new maplibregl.LngLatBounds(allCoords[0], allCoords[0])
        );
        map.fitBounds(bounds, { padding: { top: 80, bottom: 220, left: 60, right: 60 }, duration: 1000, pitch: 30 });
      }
    }

    if (map.isStyleLoaded()) {
      drawRoute();
    } else {
      map.once("idle", drawRoute);
    }
  }, [selectedRoute, fromPlace, toPlace]);


  const stationsCount = stations.length;
  const suburbanCount = suburbanStations.length;
  const busCount = busStops.length;

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-container" />

      {/* Modern High-Tech Brand HUD overlay */}
      <div className="brand-header">
        <div className="brand-logo-glow" />
        <div className="brand-text-wrapper">
          <div className="brand-title">SMART // CHENNAI</div>
          <div className="brand-subtitle">[ TRANSIT HUD // V1.0 ]</div>
        </div>
      </div>

      {/* Horizontal Floating Map Selection HUD — hidden when search panel or route details are active */}
      {showMapSelector && (
        <div className="map-view-selector-hud">
          <button
            className={`hud-chip ${activeMapType === "default" ? "active" : ""}`}
            onClick={() => setActiveMapType("default")}
          >
            Normal Map
          </button>
          <button
            className={`hud-chip metro ${activeMapType === "metro" ? "active" : ""}`}
            onClick={() => setActiveMapType("metro")}
          >
            Metro
          </button>
          <button
            className={`hud-chip suburban ${activeMapType === "suburban" ? "active" : ""}`}
            onClick={() => setActiveMapType("suburban")}
          >
            Suburban
          </button>
          <button
            className={`hud-chip bus ${activeMapType === "bus" ? "active" : ""}`}
            onClick={() => setActiveMapType("bus")}
          >
            Bus
          </button>
          <button
            className={`hud-chip all ${activeMapType === "all" ? "active" : ""}`}
            onClick={() => setActiveMapType("all")}
          >
            All Transit
          </button>
        </div>
      )}

      {/* Map Legend — hidden when search panel or route details are active */}
      {showMapSelector && (stationsCount > 0 || suburbanCount > 0 || busCount > 0) && (
        <div className="map-legend">
          <div className="legend-title">TRANSPORT</div>
          {stationsCount > 0 && (
            <>
              <div className="legend-row">
                <div className="legend-line" style={{ background: "#00b4d8", boxShadow: "0 0 6px rgba(0,180,216,0.6)" }} />
                <span>Metro Blue</span>
              </div>
              <div className="legend-row">
                <div className="legend-line" style={{ background: "#06d6a0", boxShadow: "0 0 6px rgba(6,214,160,0.6)" }} />
                <span>Metro Green</span>
              </div>
            </>
          )}
          {suburbanCount > 0 && (
            <>
              <div className="legend-divider" />
              <div className="legend-row">
                <div className="legend-rail" style={{ borderColor: "#F5A623", color: "#F5A623" }} />
                <span>Beach–Chengalpattu</span>
              </div>
              <div className="legend-row">
                <div className="legend-rail" style={{ borderColor: "#c084fc", color: "#c084fc" }} />
                <span>Beach–Arakkonam</span>
              </div>
              <div className="legend-row">
                <div className="legend-rail" style={{ borderColor: "#E8D44D", color: "#E8D44D" }} />
                <span>Beach–Gummidipoondi</span>
              </div>
            </>
          )}
          {busCount > 0 && (
            <>
              <div className="legend-divider" />
              <div className="legend-row">
                <div style={{ width: "26px", display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444", border: "1px solid #fff", boxShadow: "0 0 6px #ef4444" }} />
                </div>
                <span>Bus Stop</span>
              </div>
            </>
          )}
          <div className="legend-divider" />
          <div className="legend-row">
            <div className="legend-line" style={{ background: "#8b8cf8", borderTop: "2px dashed #8b8cf8", height: 0 }} />
            <span>Walking</span>
          </div>
        </div>
      )}

      {/* Floating Status HUD */}
      <StatusBadge
        status={backendStatus}
        stationsCount={stationsCount}
        suburbanCount={suburbanCount}
        busCount={busCount}
      />

      {/* Station Info Drawer - Glassmorphism Contact Details overlay */}
      {selectedStationNode && (
        <div className="hud-drawer animate-slide-up">
          <button className="hud-drawer-close" onClick={() => setSelectedStationNode(null)}>
            ✕
          </button>
          <div className="hud-drawer-header">
            <div className="hud-drawer-icon">
              {selectedStationNode.type === "metro" ? "🚇" : selectedStationNode.type === "suburban" ? "🚂" : "🚌"}
            </div>
            <div className="hud-drawer-title-group">
              <h3>{selectedStationNode.name.toUpperCase()}</h3>
              <p>{selectedStationNode.type.toUpperCase()} HUB</p>
            </div>
          </div>
          <div className="hud-drawer-body">
            {selectedStationNode.type === "metro" && (
              <div className="hud-drawer-row">
                <span className="hud-drawer-label">Line:</span>
                <span className="hud-drawer-val" style={{ color: selectedStationNode.line === "blue" ? "#00b4d8" : "#06d6a0", fontWeight: 700 }}>
                  {selectedStationNode.line.toUpperCase()} LINE {selectedStationNode.isInterchange === "yes" ? "⇄ (INTERCHANGE)" : ""}
                </span>
              </div>
            )}
            {selectedStationNode.type === "suburban" && (
              <div className="hud-drawer-row">
                <span className="hud-drawer-label">Train Track:</span>
                <span className="hud-drawer-val" style={{ color: "#F5A623", fontWeight: 700 }}>
                  {selectedStationNode.line.replace("beach-", "").replace(/-/g, " ").toUpperCase()}
                </span>
              </div>
            )}
            {selectedStationNode.type === "bus" && (
              <div className="hud-drawer-row">
                <span className="hud-drawer-label">Locality:</span>
                <span className="hud-drawer-val" style={{ fontWeight: 700 }}>{selectedStationNode.area.toUpperCase()}</span>
              </div>
            )}
            <div className="hud-drawer-row">
              <span className="hud-drawer-label">Helpline Service:</span>
              <span className="hud-drawer-val helpline-number">📞 {selectedStationNode.contact}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── STATUS BADGE ── */
function StatusBadge({ status, stationsCount, suburbanCount, busCount }) {
  const cfg = {
    connecting: { cls: "dot-warn", text: "Connecting..." },
    online: {
      cls: "dot-online",
      text: `Metro: ${stationsCount} • Suburban: ${suburbanCount} • Bus: ${busCount} stops`,
    },
    offline: { cls: "dot-offline", text: "Backend offline" },
  };
  const c = cfg[status] || cfg.connecting;
  return (
    <div className="status-badge">
      <div className={`sdot ${c.cls}`} />
      <span>{c.text}</span>
    </div>
  );
}
