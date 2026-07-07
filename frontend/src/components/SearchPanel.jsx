import { useState, useRef, useEffect } from "react";
import "./SearchPanel.css";

const PREFS = [
  { id: "fastest",     label: "Fastest",    icon: "⚡" },
  { id: "cheapest",    label: "Cheapest",   icon: "₹"  },
  { id: "leastwalk",   label: "Least Walk", icon: "🚶" },
  { id: "comfortable", label: "Comfort",    icon: "😌" },
];

const MODES = [
  { id: "metro",    label: "Metro",    icon: "🚇" },
  { id: "suburban", label: "Train",    icon: "🚆" },
  { id: "bus",      label: "Bus",      icon: "🚌" },
  { id: "bike",     label: "BikeTaxi", icon: "🏍️" },
  { id: "auto",     label: "Auto",     icon: "🛺" },
  { id: "cab",      label: "Cab",      icon: "🚕" },
];

async function fetchSuggestions(query) {
  if (!query || query.length < 2) return { data: [], error: null };
  try {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.length) return { data: [], error: "no_results" };
    return {
      data: data.map(item => {
        return {
          name:     item.address_line1 || item.name || item.city || "Unknown Place",
          fullName: item.formatted || "Unknown location",
          lat:      parseFloat(item.lat),
          lng:      parseFloat(item.lon),
        };
      }),
      error: null,
    };
  } catch (err) {
    if (err.name === "TimeoutError") return { data: [], error: "timeout" };
    console.error("Geocoding fetch error:", err);
    return { data: [], error: "network_error" };
  }
}

export default function SearchPanel({
  isOpen,
  onOpen,
  onClose,
  onSearch,
  isSearching,
  backendStatus,
  isMinimized,
  onExpand,
  persistFromText,
  persistToText,
  onFromTextChange,
  onToTextChange,
}) {
  const [fromText, setFromText_]   = useState(persistFromText || "");
  const [toText,   setToText_]     = useState(persistToText   || "");
  const [fromPlace, setFromPlace]  = useState(null);
  const [toPlace,   setToPlace]    = useState(null);
  const [fromSugg,  setFromSugg]   = useState([]);
  const [toSugg,    setToSugg]     = useState([]);
  const [fromLoading, setFromLoading] = useState(false);
  const [toLoading,   setToLoading]   = useState(false);
  const [fromError,   setFromError]   = useState(null);
  const [toError,     setToError]     = useState(null);
  const [pref,        setPref]        = useState("fastest");
  const [activeField, setActiveField] = useState(null);
  const [activeModes, setActiveModes] = useState(["metro", "suburban", "bus"]);

  const fromTimer = useRef(null);
  const toTimer   = useRef(null);

  // Sync text up to parent for persistence
  function setFromText(v) { setFromText_(v); onFromTextChange?.(v); }
  function setToText(v)   { setToText_(v);   onToTextChange?.(v);   }

  // Sync persisted text back on reopen
  useEffect(() => {
    if (persistFromText !== undefined) setFromText_(persistFromText);
  }, [persistFromText]);
  useEffect(() => {
    if (persistToText !== undefined) setToText_(persistToText);
  }, [persistToText]);

  // Debounced FROM search
  useEffect(() => {
    clearTimeout(fromTimer.current);
    setFromSugg([]); setFromError(null);
    if (!fromText || fromText.length < 2) { setFromLoading(false); return; }
    setFromLoading(true);
    fromTimer.current = setTimeout(async () => {
      const { data, error } = await fetchSuggestions(fromText);
      setFromLoading(false);
      setFromSugg(data);
      setFromError(error);
    }, 380);
  }, [fromText]);

  // Debounced TO search
  useEffect(() => {
    clearTimeout(toTimer.current);
    setToSugg([]); setToError(null);
    if (!toText || toText.length < 2) { setToLoading(false); return; }
    setToLoading(true);
    toTimer.current = setTimeout(async () => {
      const { data, error } = await fetchSuggestions(toText);
      setToLoading(false);
      setToSugg(data);
      setToError(error);
    }, 380);
  }, [toText]);

  function handleFromChange(e) {
    setFromText(e.target.value);
    setFromPlace(null);
  }

  function handleToChange(e) {
    setToText(e.target.value);
    setToPlace(null);
  }

  function pickFrom(place) {
    setFromText(place.name);
    setFromPlace(place);
    setFromSugg([]);
    setActiveField(null);
  }

  function pickTo(place) {
    setToText(place.name);
    setToPlace(place);
    setToSugg([]);
    setActiveField(null);
  }

  async function handleUseGPS(field) {
    const setLoading = field === "from" ? setFromLoading : setToLoading;
    const setError = field === "from" ? setFromError : setToError;
    const pick = field === "from" ? pickFrom : pickTo;

    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("GPS not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`/api/reverse?lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error("Reverse geocode failed");
          const data = await res.json();
          
          const place = {
            name: data.address_line1 || data.name || "Current Location",
            fullName: data.formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            lat: latitude,
            lng: longitude,
          };
          pick(place);
        } catch (err) {
          console.error("GPS reverse geocoding error:", err);
          const fallbackPlace = {
            name: "Current Location",
            fullName: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            lat: latitude,
            lng: longitude,
          };
          pick(fallbackPlace);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("GPS error:", err);
        setError("Could not access location. Please check browser permissions.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function swap() {
    const ft = fromText, tt = toText;
    const fp = fromPlace, tp = toPlace;
    setFromText(tt); setToText(ft);
    setFromPlace(tp); setToPlace(fp);
    setFromSugg([]); setToSugg([]);
  }

  function search() {
    if (!fromPlace || !toPlace) return;
    onSearch(fromPlace, toPlace, pref, activeModes);
  }

  function toggleMode(modeId) {
    setActiveModes(prev => {
      if (prev.includes(modeId)) {
        if (prev.length === 1) return prev; // prevent unselecting all
        return prev.filter(m => m !== modeId);
      }
      return [...prev, modeId];
    });
  }

  const canSearch = fromPlace && toPlace && !isSearching && backendStatus === "online";

  /* ── Collapsed pill ── */
  if (!isOpen) {
    return (
      <div className="search-panel">
        <div className="collapsed-search-pill" onClick={onOpen}>
          <div className="pill-accent" />
          <div className="pill-icon-wrap">🔍</div>
          <div className="pill-body">
            <div className="pill-label">TRANSIT PLANNER</div>
            <div className="pill-text">
              {fromText && toText
                ? `${fromText.split(",")[0]} → ${toText.split(",")[0]}`
                : "Where do you want to go?"}
            </div>
          </div>
          <div className="pill-arrow">›</div>
        </div>
      </div>
    );
  }

  /* ── Expanded bottom-sheet ── */
  return (
    <div className={`search-panel ${isMinimized ? "panel-minimized" : ""}`}>
      <div
        className="panel-card"
        onClick={() => { if (isMinimized && onExpand) onExpand(); }}
        style={{ cursor: isMinimized ? "pointer" : "default" }}
      >
        {/* Handle row */}
        <div className="panel-handle-row">
          <button
            className="panel-back-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Close"
          >←</button>
          <div className="handle-center">
            <div className="handle-bar" />
            {isMinimized && <span className="minimized-label">TAP TO EXPAND</span>}
          </div>
          <button
            className="panel-close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >✕</button>
        </div>

        {!isMinimized && (
          <>
            {/* FROM / TO inputs */}
            <div className="inputs-block">
              <div className="track">
                <div className="track-dot from-dot" />
                <div className="track-line" />
                <div className="track-dot to-dot" />
              </div>
              <div className="inputs-col">

                {/* FROM */}
                <div className={`input-wrap ${activeField === "from" ? "focused" : ""}`}>
                  <input
                    className="place-inp"
                    type="text"
                    placeholder="From — starting point"
                    value={fromText}
                    onChange={handleFromChange}
                    onFocus={() => setActiveField("from")}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {fromLoading && <span className="inp-spinner" />}
                  {fromText && !fromLoading && (
                    <button className="clear-x" onClick={() => { setFromText(""); setFromPlace(null); setFromSugg([]); }}>×</button>
                  )}
                </div>
                {activeField === "from" && (
                  <div className="sugg-list">
                    <div className="sugg-list-header">
                      <button className="sugg-back" onClick={() => setActiveField(null)}>← back</button>
                    </div>
                    
                    {/* GPS Button */}
                    <div className="sugg-item gps-item" onClick={() => handleUseGPS("from")}>
                      <span className="sugg-pin">🎯</span>
                      <div className="sugg-text-col">
                        <span className="sugg-name">Use Current Location</span>
                        <span className="sugg-fullname">Pinpoint using device GPS</span>
                      </div>
                    </div>

                    {fromLoading && <div className="sugg-loading">Searching Chennai…</div>}
                    {!fromLoading && fromError && fromError !== "no_results" && fromError !== "timeout" && fromError !== "network_error" && (
                      <div className="sugg-empty">{fromError}</div>
                    )}
                    {!fromLoading && fromError === "no_results" && <div className="sugg-empty">No locations found</div>}
                    {!fromLoading && fromError === "timeout"    && <div className="sugg-empty">Search timed out — try again</div>}
                    {!fromLoading && fromError === "network_error" && <div className="sugg-empty">Network error — check connection</div>}
                    {!fromLoading && !fromError && fromSugg.map((s, i) => (
                      <div key={i} className="sugg-item" onClick={() => pickFrom(s)}>
                        <span className="sugg-pin">📍</span>
                        <div className="sugg-text-col">
                          <span className="sugg-name">{s.name}</span>
                          {s.fullName && s.fullName !== s.name && (
                            <span className="sugg-fullname">{s.fullName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Swap */}
                <div className="swap-row">
                  <button className="swap-btn" onClick={swap} title="Swap from ↔ to">⇅</button>
                </div>

                {/* TO */}
                <div className={`input-wrap ${activeField === "to" ? "focused" : ""}`}>
                  <input
                    className="place-inp"
                    type="text"
                    placeholder="To — destination"
                    value={toText}
                    onChange={handleToChange}
                    onFocus={() => setActiveField("to")}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {toLoading && <span className="inp-spinner" />}
                  {toText && !toLoading && (
                    <button className="clear-x" onClick={() => { setToText(""); setToPlace(null); setToSugg([]); }}>×</button>
                  )}
                </div>
                {activeField === "to" && (
                  <div className="sugg-list">
                    <div className="sugg-list-header">
                      <button className="sugg-back" onClick={() => setActiveField(null)}>← back</button>
                    </div>

                    {/* GPS Button */}
                    <div className="sugg-item gps-item" onClick={() => handleUseGPS("to")}>
                      <span className="sugg-pin">🎯</span>
                      <div className="sugg-text-col">
                        <span className="sugg-name">Use Current Location</span>
                        <span className="sugg-fullname">Pinpoint using device GPS</span>
                      </div>
                    </div>

                    {toLoading && <div className="sugg-loading">Searching Chennai…</div>}
                    {!toLoading && toError && toError !== "no_results" && toError !== "timeout" && toError !== "network_error" && (
                      <div className="sugg-empty">{toError}</div>
                    )}
                    {!toLoading && toError === "no_results" && <div className="sugg-empty">No locations found</div>}
                    {!toLoading && toError === "timeout"    && <div className="sugg-empty">Search timed out — try again</div>}
                    {!toLoading && toError === "network_error" && <div className="sugg-empty">Network error — check connection</div>}
                    {!toLoading && !toError && toSugg.map((s, i) => (
                      <div key={i} className="sugg-item" onClick={() => pickTo(s)}>
                        <span className="sugg-pin">📍</span>
                        <div className="sugg-text-col">
                          <span className="sugg-name">{s.name}</span>
                          {s.fullName && s.fullName !== s.name && (
                            <span className="sugg-fullname">{s.fullName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* Prefer chips */}
            <div className="opts-row">
              <span className="opts-label">PREFER</span>
              <div className="chips">
                {PREFS.map(p => (
                  <button
                    key={p.id}
                    className={`chip ${pref === p.id ? "chip-active" : ""}`}
                    onClick={() => setPref(p.id)}
                  >
                    <span>{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode chips */}
            <div className="opts-row">
              <span className="opts-label">MODE</span>
              <div className="chips">
                {MODES.map(m => {
                  const isActive = activeModes.includes(m.id);
                  return (
                    <button 
                      key={m.id} 
                      className={`chip ${isActive ? "chip-active" : ""}`}
                      onClick={() => toggleMode(m.id)}
                    >
                      <span>{m.icon}</span>{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Find button */}
            <button
              className={`find-btn ${canSearch ? "find-ready" : "find-off"}`}
              onClick={search}
              disabled={!canSearch}
            >
              {isSearching
                ? <><span className="spin" /> Finding routes…</>
                : backendStatus !== "online"
                ? "⚠ Backend offline"
                : !fromPlace || !toPlace
                ? "Select start & destination"
                : "FIND ROUTE →"
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}
