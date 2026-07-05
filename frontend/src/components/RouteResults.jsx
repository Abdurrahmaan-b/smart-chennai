import { useState } from "react";
import "./RouteResults.css";

const TAG = {
  fastest:     { label: "FASTEST",     color: "#f4a261", icon: "⚡" },
  cheapest:    { label: "CHEAPEST",    color: "#06d6a0", icon: "₹"  },
  leastwalk:   { label: "LEAST WALK",  color: "#00b4d8", icon: "🚶" },
  comfortable: { label: "COMFORTABLE", color: "#8b8cf8", icon: "😌" },
};

const MODE_STYLE = {
  metro: { color: "#00b4d8", bg: "rgba(0,180,216,0.14)",   icon: "🚇" },
  walk:  { color: "#8b8cf8", bg: "rgba(139,140,248,0.14)", icon: "🚶" },
  bus:   { color: "#06d6a0", bg: "rgba(6,214,160,0.14)",   icon: "🚌" },
  train: { color: "#f4a261", bg: "rgba(244,162,97,0.14)",  icon: "🚂" },
  cab:   { color: "#e63946", bg: "rgba(230,57,70,0.14)",   icon: "🚕" },
};

const cap = s => s?.replace(/\b\w/g, c => c.toUpperCase()) || "";

export default function RouteResults({
  routes,
  selectedRoute,
  onSelectRoute,
  onClose,
  from,
  to,
  isMinimized,
  onExpand,
}) {
  // Track which card is expanded to show steps
  const [expandedId, setExpandedId] = useState(selectedRoute?.id ?? null);

  function handleCardClick(route) {
    // If already selected and expanded → just re-select to re-draw on map
    // If different → select it on map AND expand steps
    onSelectRoute(route);
    setExpandedId(route.id);
  }

  return (
    <div className={`rp-panel ${isMinimized ? "rp-panel-minimized" : ""}`}>
      <div
        className="rp-card"
        onClick={() => { if (isMinimized && onExpand) onExpand(); }}
        style={{ cursor: isMinimized ? "pointer" : "default" }}
      >
        {/* ── Header ── */}
        <div className="rp-header">
          <button
            className="rp-back-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Close"
          >
            ←
          </button>
          <div className="rp-route-name">
            {isMinimized ? (
              selectedRoute ? (
                <span className="minimized-summary">
                  <span className="ms-tag" style={{ color: (TAG[selectedRoute.tag] || TAG.fastest).color }}>
                    {(TAG[selectedRoute.tag] || TAG.fastest).icon}
                  </span>
                  <span className="ms-time">{selectedRoute.duration_min} min</span>
                  <span className="ms-dot">·</span>
                  <span className="ms-cost">₹{selectedRoute.cost_inr}</span>
                  <span className="ms-dot">·</span>
                  <span className="ms-line">{selectedRoute.legs.find(l => l.mode !== "walk")?.label || "Route"}</span>
                  <span className="ms-expand">↑ tap</span>
                </span>
              ) : (
                <span className="minimized-tagline">↑ TAP TO EXPAND</span>
              )
            ) : (
              <>
                <span className="rp-from">{cap(from?.name)}</span>
                <span className="rp-sep">→</span>
                <span className="rp-to">{cap(to?.name)}</span>
              </>
            )}
          </div>
          <button
            className="rp-close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            ✕
          </button>
        </div>

        {/* ── Content — hidden when minimized ── */}
        {!isMinimized && (
          <div className="rp-content-wrapper">
            {/* Route summary cards */}
            <div className="rp-scroll">
              {routes.map((r, i) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  isSelected={selectedRoute?.id === r.id}
                  isExpanded={expandedId === r.id}
                  onClick={() => handleCardClick(r)}
                  delay={i * 0.07}
                />
              ))}
            </div>

            {/* ── Journey steps — only for expanded card ── */}
            {expandedId !== null && routes.find(r => r.id === expandedId) && (
              <StepBreakdown route={routes.find(r => r.id === expandedId)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Route summary card ── */
function RouteCard({ route, isSelected, isExpanded, onClick, delay }) {
  const tag = TAG[route.tag] || { label: route.tag, color: "#fff", icon: "" };
  const primaryLeg = route.legs.find(l => l.mode !== "walk") || route.legs[0];
  const ms = MODE_STYLE[primaryLeg?.mode] || { color: "#fff", bg: "rgba(255,255,255,0.1)", icon: "🚌" };

  return (
    <div
      className={`rc ${isSelected ? "rc-selected" : ""}`}
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Tag badge */}
      <div
        className="rc-tag"
        style={{ color: tag.color, background: `${tag.color}18`, borderColor: `${tag.color}44` }}
      >
        {tag.icon} {tag.label}
      </div>

      {/* Time + cost row */}
      <div className="rc-main-row">
        <div className="rc-time">
          {route.duration_min}
          <span className="rc-unit"> min</span>
        </div>
        <div className="rc-cost">₹{route.cost_inr}</div>
      </div>

      {/* Mode pills */}
      <div className="rc-modes">
        {route.legs.map((leg, i) => {
          const s = MODE_STYLE[leg.mode] || { color: "#fff", bg: "rgba(255,255,255,0.1)", icon: "" };
          return (
            <span key={i} className="rc-mode-dot" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </span>
          );
        })}
        <span className="rc-dist">{route.distance_km} km</span>
      </div>

      {/* Expand hint */}
      {isSelected && (
        <div className="rc-expand-hint">
          {isExpanded ? "▲ steps shown below" : "▼ tap to see steps"}
        </div>
      )}
    </div>
  );
}

/* ── Journey step breakdown ── */
function StepBreakdown({ route }) {
  return (
    <div className="rp-steps">
      <div className="rp-steps-title">
        <span className="steps-line" />
        JOURNEY STEPS
        <span className="steps-line" />
      </div>
      {route.legs.map((leg, i) => {
        const ms = MODE_STYLE[leg.mode] || { color: "#fff", bg: "rgba(255,255,255,0.1)", icon: "" };
        const isLast = i === route.legs.length - 1;
        return (
          <div key={i} className="step-row">
            {/* Timeline track */}
            <div className="step-track">
              <div className="step-icon" style={{ background: ms.bg, color: ms.color }}>
                {ms.icon}
              </div>
              {!isLast && <div className="step-connector" style={{ background: `linear-gradient(to bottom, ${ms.color}60, ${(MODE_STYLE[route.legs[i+1]?.mode] || ms).color}60)` }} />}
            </div>
            {/* Info */}
            <div className="step-info">
              <div className="step-label">{leg.label}</div>
              <div className="step-meta">
                <span className="step-dur">{leg.duration_min} min</span>
                <span className="step-mode-tag" style={{ color: ms.color, background: ms.bg }}>
                  {leg.mode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
