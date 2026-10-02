import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./index.css";

const API = "http://127.0.0.1:8000";

/* =====================================================
   MAP ICONS
===================================================== */

const icons = {
  ambulance: L.divIcon({
    className: "custom-marker",
    html: `<div class="marker ambulance-marker">🚑</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  }),

  hospital: L.divIcon({
    className: "custom-marker",
    html: `<div class="marker hospital-marker">✚</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  }),
};

/* =====================================================
   MAP CONTROLLER
===================================================== */

function MapController({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);

  return null;
}

/* =====================================================
   MAIN APP
===================================================== */

function App() {
  const [role, setRole] = useState("dispatcher");

  const [dashboard, setDashboard] = useState({});
  const [hotspots, setHotspots] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [qaoa, setQaoa] = useState({ assignments: [] });

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);

  const [notification, setNotification] = useState(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);

  const [clock, setClock] = useState(new Date());

  /* =====================================================
     CLOCK
  ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =====================================================
     NOTIFICATION
  ===================================================== */

  function showNotification(message, type = "success") {
    setNotification({
      message,
      type,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3500);
  }

  /* =====================================================
     LOAD BACKEND DATA
  ===================================================== */

  async function loadData() {
    try {
      const [
        dashboardRes,
        hotspotsRes,
        ambulancesRes,
        hospitalsRes,
        qaoaRes,
      ] = await Promise.all([
        fetch(`${API}/dashboard`),
        fetch(`${API}/hotspots`),
        fetch(`${API}/ambulances`),
        fetch(`${API}/hospitals`),
        fetch(`${API}/qaoa`),
      ]);

      if (
        !dashboardRes.ok ||
        !hotspotsRes.ok ||
        !ambulancesRes.ok ||
        !hospitalsRes.ok ||
        !qaoaRes.ok
      ) {
        throw new Error("Backend request failed");
      }

      const dashboardData = await dashboardRes.json();
      const hotspotsData = await hotspotsRes.json();
      const ambulancesData = await ambulancesRes.json();
      const hospitalsData = await hospitalsRes.json();
      const qaoaData = await qaoaRes.json();

      setDashboard(dashboardData || {});
      setHotspots(Array.isArray(hotspotsData) ? hotspotsData : []);
      setAmbulances(
        Array.isArray(ambulancesData) ? ambulancesData : []
      );
      setHospitals(
        Array.isArray(hospitalsData) ? hospitalsData : []
      );
      setQaoa(qaoaData || { assignments: [] });

      setBackendError(false);
      setLoading(false);
    } catch (error) {
      console.error("Backend connection error:", error);

      setBackendError(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const availableCount = ambulances.filter(
    (a) => a.status === "available"
  ).length;

  const busyCount = ambulances.filter(
    (a) => a.status !== "available"
  ).length;

  const criticalHotspots = hotspots.filter(
    (h) => String(h.hotspot).toUpperCase() === "HIGH"
  ).length;

  const activeAssignments = Array.isArray(qaoa?.assignments)
    ? qaoa.assignments
    : [];

  const mapCenter = [12.9716, 77.5946];

  const selected = selectedAmbulance
    ? ambulances.find(
      (a) => a.ambulance_id === selectedAmbulance
    )
    : null;

  /* =====================================================
     ACCEPT QAOA ASSIGNMENT
  ===================================================== */

  async function acceptAssignment(assignment) {
    try {
      const response = await fetch(
        `${API}/assignments/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ambulance_id: assignment.ambulance_id,
            zone_id: assignment.zone_id,
            hospital_id:
              assignment.hospital_id || "H001",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Assignment failed");
      }

      showNotification(
        `QAOA assignment accepted for ${assignment.ambulance_id}`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showNotification(
        "Could not accept assignment",
        "error"
      );
    }
  }

  /* =====================================================
     UPDATE AMBULANCE STATUS
  ===================================================== */

  async function updateAmbulanceStatus(id, status) {
    if (!id) {
      showNotification(
        "No ambulance selected",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(
        `${API}/ambulances/${id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Status update failed");
      }

      showNotification(
        `${id} status updated to ${status.replace(
          "_",
          " "
        )}`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showNotification(
        "Status update failed",
        "error"
      );
    }
  }

  /* =====================================================
     UPDATE HOSPITAL BEDS
  ===================================================== */

  async function updateHospitalBeds(hospitalId) {
    const emergency = prompt(
      "Available emergency beds:"
    );

    const icu = prompt(
      "Available ICU beds:"
    );

    if (emergency === null || icu === null) {
      return;
    }

    const emergencyBeds = Number(emergency);
    const icuBeds = Number(icu);

    if (
      Number.isNaN(emergencyBeds) ||
      Number.isNaN(icuBeds) ||
      emergencyBeds < 0 ||
      icuBeds < 0
    ) {
      showNotification(
        "Please enter valid bed numbers",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(
        `${API}/hospitals/${hospitalId}/beds`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            available_emergency_beds:
              emergencyBeds,

            available_icu_beds:
              icuBeds,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Hospital update failed"
        );
      }

      showNotification(
        `${hospitalId} capacity updated`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showNotification(
        "Hospital update failed",
        "error"
      );
    }
  }

  /* =====================================================
     HOSPITAL ALERT
  ===================================================== */

  async function sendHospitalAlert(
    hospitalId,
    ambulanceId
  ) {
    if (!ambulanceId) {
      showNotification(
        "No ambulance selected",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(
        `${API}/hospitals/${hospitalId}/incoming?ambulance_id=${ambulanceId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Hospital alert failed"
        );
      }

      showNotification(
        `Hospital ${hospitalId} notified about ${ambulanceId}`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showNotification(
        "Hospital alert failed",
        "error"
      );
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="app">

      {/* =================================================
          NOTIFICATION
      ================================================= */}

      {notification && (
        <div
          className={`toast ${notification.type}`}
        >
          <span className="toast-icon">
            {notification.type === "error"
              ? "⚠"
              : "✓"}
          </span>

          <span>
            {notification.message}
          </span>
        </div>
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-logo">
            <span>⚡</span>
          </div>

          <div>
            <div className="brand-title">
              QuantumResQ
            </div>

            <div className="brand-subtitle">
              Emergency Intelligence
            </div>
          </div>

        </div>

        <div className="system-status">
          <span className="live-dot"></span>
          SYSTEM ONLINE
        </div>

        <div className="nav-label">
          COMMAND CENTER
        </div>

        {/* DISPATCHER */}

        <button
          className={`nav-item ${role === "dispatcher"
            ? "active"
            : ""
            }`}
          onClick={() =>
            setRole("dispatcher")
          }
        >
          <span className="nav-icon">
            🚨
          </span>

          <div>
            <strong>
              Dispatcher
            </strong>

            <small>
              Control Center
            </small>
          </div>
        </button>

        {/* AMBULANCE */}

        <button
          className={`nav-item ${role === "ambulance"
            ? "active"
            : ""
            }`}
          onClick={() =>
            setRole("ambulance")
          }
        >
          <span className="nav-icon">
            🚑
          </span>

          <div>
            <strong>
              Ambulance
            </strong>

            <small>
              Field Operations
            </small>
          </div>
        </button>

        {/* HOSPITAL */}

        <button
          className={`nav-item ${role === "hospital"
            ? "active"
            : ""
            }`}
          onClick={() =>
            setRole("hospital")
          }
        >
          <span className="nav-icon">
            🏥
          </span>

          <div>
            <strong>
              Hospital
            </strong>

            <small>
              Capacity Control
            </small>
          </div>
        </button>

        <div className="sidebar-spacer"></div>

        {/* TECHNOLOGY */}

        <div className="technology-card">

          <div className="tech-title">
            <span>◈</span>
            AI + QUANTUM ENGINE
          </div>

          <div className="tech-row">
            <span>
              AI Demand Model
            </span>

            <span className="online">
              ACTIVE
            </span>
          </div>

          <div className="tech-row">
            <span>
              QAOA Optimizer
            </span>

            <span className="online">
              ACTIVE
            </span>
          </div>

          <div className="tech-row">
            <span>
              Routing Engine
            </span>

            <span className="online">
              ACTIVE
            </span>
          </div>

        </div>

        <div className="sidebar-footer">
          QuantumResQ v1.0
          <br />
          Hackathon Prototype
        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="main">

        {/* HEADER */}

        <header className="topbar">

          <div>

            <div className="breadcrumb">
              EMERGENCY RESPONSE /{" "}
              <span>
                {role.toUpperCase()}
              </span>
            </div>

            <h1>
              {role === "dispatcher" &&
                "Emergency Command Center"}

              {role === "ambulance" &&
                "Ambulance Operations"}

              {role === "hospital" &&
                "Hospital Capacity Center"}
            </h1>

          </div>

          <div className="header-right">

            <div className="live-clock">
              <span>●</span>
              LIVE
            </div>

            <div className="clock">
              {clock.toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}
            </div>

            <div className="profile">

              <div className="profile-avatar">
                QR
              </div>

              <div>
                <strong>
                  Control Operator
                </strong>

                <small>
                  Authorized
                </small>
              </div>

            </div>

          </div>

        </header>

        {/* BACKEND ERROR */}

        {backendError && (
          <div className="backend-warning">
            <span>⚠</span>

            <div>
              <strong>
                Backend connection unavailable
              </strong>

              <small>
                Make sure FastAPI is running on
                127.0.0.1:8000
              </small>
            </div>

            <button
              onClick={loadData}
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="loading-screen">

            <div className="loading-orbit">
              ◈
            </div>

            <h2>
              Initializing QuantumResQ
            </h2>

            <p>
              Connecting AI prediction,
              quantum optimization and
              emergency network...
            </p>

          </div>
        ) : (
          <>
            {/* DISPATCHER */}

            {role === "dispatcher" && (
              <DispatcherView
                dashboard={dashboard}
                hotspots={hotspots}
                ambulances={ambulances}
                hospitals={hospitals}
                activeAssignments={
                  activeAssignments
                }
                availableCount={
                  availableCount
                }
                busyCount={busyCount}
                criticalHotspots={
                  criticalHotspots
                }
                acceptAssignment={
                  acceptAssignment
                }
                routes={routes}
                setRoutes={setRoutes}
                selected={selected}
                setSelectedAmbulance={
                  setSelectedAmbulance
                }
              />
            )}

            {/* AMBULANCE */}

            {role === "ambulance" && (
              <AmbulanceView
                ambulances={ambulances}
                hospitals={hospitals}
                updateAmbulanceStatus={
                  updateAmbulanceStatus
                }
                sendHospitalAlert={
                  sendHospitalAlert
                }
              />
            )}

            {/* HOSPITAL */}

            {role === "hospital" && (
              <HospitalView
                hospitals={hospitals}
                updateHospitalBeds={
                  updateHospitalBeds
                }
              />
            )}
          </>
        )}

      </main>
    </div>
  );
}

/* =====================================================
   DISPATCHER VIEW
===================================================== */

function DispatcherView({
  dashboard,
  hotspots,
  ambulances,
  hospitals,
  activeAssignments,
  availableCount,
  busyCount,
  criticalHotspots,
  acceptAssignment,
  routes,
  setRoutes,
  selected,
  setSelectedAmbulance,
}) {
  const displayDemand = (value) => {
    const demand = Number(value || 0);
    return (demand / 10).toFixed(1);
  };
  const totalDemand =
    hotspots.reduce(
      (sum, h) =>
        sum +
        Number(h.predicted_demand || 0) / 10,
      0
    );

  const averageDemand =
    hotspots.length > 0
      ? totalDemand / hotspots.length
      : 0;

  const highestDemand =
    hotspots.length > 0
      ? Math.max(
        ...hotspots.map(
          (h) =>
            Number(h.predicted_demand || 0) / 10
        )
      )
      : 0;

  const stats = [
    {
      label: "Active Emergencies",
      value:
        dashboard?.active_emergencies ??
        hotspots.length ??
        0,
      icon: "⚠",
      className: "danger",
      change: "AI monitored",
    },

    {
      label: "Critical Hotspots",
      value: criticalHotspots,
      icon: "◉",
      className: "warning",
      change: "Predicted zones",
    },

    {
      label: "Available Units",
      value: availableCount,
      icon: "🚑",
      className: "success",
      change: `${busyCount} deployed`,
    },

    {
      label: "Hospitals",
      value: hospitals.length,
      icon: "✚",
      className: "purple",
      change: "Connected",
    },
  ];

  return (
    <div className="content">

      {/* =================================================
          STATS
      ================================================= */}

      <section className="stats-grid">

        {stats.map((stat) => (
          <div
            className="stat-card"
            key={stat.label}
          >

            <div
              className={`stat-icon ${stat.className}`}
            >
              {stat.icon}
            </div>

            <div className="stat-info">

              <span>
                {stat.label}
              </span>

              <strong>
                {stat.value}
              </strong>

              <small>
                {stat.change}
              </small>

            </div>

            <div className="stat-pulse"></div>

          </div>
        ))}

      </section>

      {/* =================================================
          INSIGHT STRIP
      ================================================= */}

      <section className="insight-strip">

        <div className="insight-item">

          <span className="insight-icon">
            ✦
          </span>

          <div>
            <small>
              AI FORECAST
            </small>

            <strong>
              {averageDemand.toFixed(1)}
            </strong>

            <span>
              avg. predicted demand
            </span>
          </div>

        </div>

        <div className="insight-divider"></div>

        <div className="insight-item">

          <span className="insight-icon">
            ◈
          </span>

          <div>
            <small>
              PEAK DEMAND
            </small>

            <strong>
              {highestDemand.toFixed(1)}
            </strong>

            <span>
              highest predicted zone
            </span>
          </div>

        </div>

        <div className="insight-divider"></div>

        <div className="insight-item">

          <span className="insight-icon">
            ⚡
          </span>

          <div>
            <small>
              OPTIMIZATION
            </small>

            <strong>
              QAOA
            </strong>

            <span>
              dispatch engine ready
            </span>
          </div>

        </div>

        <div className="prototype-badge">
          DEMO / PROTOTYPE DATA
        </div>

      </section>

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <section className="command-grid">

        {/* =================================================
            MAP
        ================================================= */}

        <div className="panel map-panel">

          <div className="panel-header">

            <div>

              <div className="eyebrow">
                LIVE GEOSPATIAL INTELLIGENCE
              </div>

              <h2>
                Emergency Response Map
              </h2>

            </div>

            <div className="map-status">

              <span className="live-dot"></span>

              LIVE TRACKING

            </div>

          </div>

          <div className="map-wrapper">

            <MapContainer
              center={[
                12.9716,
                77.5946,
              ]}
              zoom={11}
              scrollWheelZoom={true}
            >

              <MapController
                center={[
                  12.9716,
                  77.5946,
                ]}
              />

              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* HOTSPOTS */}

              {hotspots.map(
                (h, index) => {

                  const level =
                    String(
                      h.hotspot || "LOW"
                    ).toUpperCase();

                  return (
                    <CircleMarker
                      key={`hotspot-${index}`}
                      center={[
                        Number(
                          h.latitude
                        ),
                        Number(
                          h.longitude
                        ),
                      ]}
                      radius={
                        level === "HIGH"
                          ? 20
                          : level === "MEDIUM"
                            ? 15
                            : 10
                      }
                      pathOptions={{
                        color:
                          level === "HIGH"
                            ? "#ff3b5c"
                            : level ===
                              "MEDIUM"
                              ? "#ffb020"
                              : "#36d399",

                        fillOpacity: 0.3,
                      }}
                    >

                      <Popup>

                        <strong>
                          {h.zone_name}
                        </strong>

                        <br />

                        Predicted demand:{" "}
                        {displayDemand(h.predicted_demand)} / hour

                        <br />

                        Priority: {level}

                      </Popup>

                    </CircleMarker>
                  );
                }
              )}

              {/* AMBULANCES */}

              {ambulances.map(
                (a) => (
                  <Marker
                    key={
                      a.ambulance_id
                    }
                    position={[
                      Number(
                        a.latitude
                      ),
                      Number(
                        a.longitude
                      ),
                    ]}
                    icon={
                      icons.ambulance
                    }
                    eventHandlers={{
                      click: () =>
                        setSelectedAmbulance(
                          a.ambulance_id
                        ),
                    }}
                  >

                    <Popup>

                      <strong>
                        {a.ambulance_id}
                      </strong>

                      <br />

                      Status:{" "}
                      {String(
                        a.status
                      ).replace(
                        "_",
                        " "
                      )}

                    </Popup>

                  </Marker>
                )
              )}

              {/* HOSPITALS */}

              {hospitals.map(
                (h) => {

                  if (
                    !h.latitude ||
                    !h.longitude
                  ) {
                    return null;
                  }

                  return (
                    <Marker
                      key={
                        h.hospital_id
                      }
                      position={[
                        Number(
                          h.latitude
                        ),
                        Number(
                          h.longitude
                        ),
                      ]}
                      icon={
                        icons.hospital
                      }
                    >

                      <Popup>

                        <strong>
                          {h.name}
                        </strong>

                        <br />

                        Emergency beds:{" "}
                        {
                          h.available_emergency_beds
                        }

                        <br />

                        ICU beds:{" "}
                        {
                          h.available_icu_beds
                        }

                      </Popup>

                    </Marker>
                  );
                }
              )}

              {/* ROUTES */}

              {routes.map(
                (route, index) => (
                  <Polyline
                    key={index}
                    positions={route}
                    pathOptions={{
                      color:
                        "#7c5cff",
                      weight: 5,
                      opacity: 0.8,
                    }}
                  />
                )
              )}

            </MapContainer>

            {/* MAP LEGEND */}

            <div className="map-legend">

              <div>
                <span className="legend-dot high"></span>
                Critical
              </div>

              <div>
                <span className="legend-dot medium"></span>
                Medium
              </div>

              <div>
                <span className="legend-dot low"></span>
                Low
              </div>

              <div>
                <span className="legend-square ambulance"></span>
                Ambulance
              </div>

              <div>
                <span className="legend-square hospital"></span>
                Hospital
              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <div className="right-column">

          {/* AI PANEL */}

          <div className="panel intelligence-panel">

            <div className="panel-header compact">

              <div>

                <div className="eyebrow">
                  MACHINE LEARNING
                </div>

                <h2>
                  AI Demand Prediction
                </h2>

              </div>

              <div className="ai-badge">
                ✦ AI
              </div>

            </div>

            <div className="prediction-list">

              {hotspots.length === 0 && (
                <div className="empty-state">
                  <div>✦</div>

                  <strong>
                    No prediction data
                  </strong>

                  <span>
                    AI hotspot data will
                    appear here
                  </span>
                </div>
              )}

              {hotspots
                .slice(0, 4)
                .map(
                  (h, index) => (

                    <div
                      className="prediction-row"
                      key={index}
                    >

                      <div className="prediction-rank">
                        0{index + 1}
                      </div>

                      <div className="prediction-info">

                        <strong>
                          {h.zone_name}
                        </strong>

                        <span>
                          Predicted emergencies / hour
                        </span>

                      </div>

                      <div className="prediction-value">

                        <strong>
                          {displayDemand(h.predicted_demand)}
                        </strong>

                        <span
                          className={`priority ${String(
                            h.hotspot ||
                            "LOW"
                          ).toLowerCase()}`}
                        >
                          {h.hotspot ||
                            "LOW"}
                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          </div>

          {/* =================================================
              QAOA PANEL
          ================================================= */}

          <div className="panel quantum-panel">

            <div className="panel-header compact">

              <div>

                <div className="eyebrow quantum">
                  QUANTUM OPTIMIZATION
                </div>

                <h2>
                  QAOA Dispatch Plan
                </h2>

              </div>

              <div className="quantum-icon">
                ◈
              </div>

            </div>

            <div className="quantum-banner">

              <div className="quantum-symbol">
                Q
              </div>

              <div>

                <strong>
                  Quantum optimization active
                </strong>

                <span>
                  Minimizing ambulance
                  response distance
                </span>

              </div>

              <div className="qaoa-live">
                ●
              </div>

            </div>

            <div className="assignment-list">

              {activeAssignments.length ===
                0 && (
                  <div className="empty-state">

                    <div>◈</div>

                    <strong>
                      No active assignments
                    </strong>

                    <span>
                      QAOA recommendations
                      will appear here
                    </span>

                  </div>
                )}

              {activeAssignments.map(
                (assignment, index) => (

                  <div
                    className="assignment-card"
                    key={index}
                  >

                    <div className="assignment-top">

                      <div className="ambulance-tag">
                        🚑{" "}
                        {
                          assignment.ambulance_id
                        }
                      </div>

                      <span className="recommended">
                        QAOA
                      </span>

                    </div>

                    <div className="assignment-route">

                      <div className="route-point">

                        <span className="point-dot"></span>

                        <div>

                          <small>
                            UNIT
                          </small>

                          <strong>
                            {
                              assignment.ambulance_id
                            }
                          </strong>

                        </div>

                      </div>

                      <div className="route-line"></div>

                      <div className="route-point">

                        <span className="point-dot destination"></span>

                        <div>

                          <small>
                            HOTSPOT
                          </small>

                          <strong>
                            {
                              assignment.zone_name
                            }
                          </strong>

                        </div>

                      </div>

                    </div>

                    <div className="assignment-metrics">

                      <div>

                        <span>
                          Distance
                        </span>

                        <strong>
                          {Number(
                            assignment.distance_km ||
                            0
                          ).toFixed(2)}{" "}
                          km
                        </strong>

                      </div>

                      <div>

                        <span>
                          Demand
                        </span>

                        <strong>
                          {displayDemand(
                            assignment.predicted_demand
                          )} / hr
                        </strong>

                      </div>

                      <div>

                        <span>
                          Priority
                        </span>

                        <strong>
                          {
                            assignment.hotspot
                          }
                        </strong>

                      </div>

                    </div>

                    <button
                      className="primary-button"
                      onClick={() =>
                        acceptAssignment(
                          assignment
                        )
                      }
                    >
                      ✓ Accept Dispatch
                    </button>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          FLEET
      ================================================= */}

      <section className="panel fleet-panel">

        <div className="panel-header">

          <div>

            <div className="eyebrow">
              FLEET MONITORING
            </div>

            <h2>
              Ambulance Fleet
            </h2>

          </div>

          <div className="fleet-summary">

            <span>
              <b>
                {availableCount}
              </b>{" "}
              available
            </span>

            <span>
              <b>
                {busyCount}
              </b>{" "}
              deployed
            </span>

          </div>

        </div>

        <div className="fleet-grid">

          {ambulances.map(
            (a) => (

              <div
                className={`fleet-card ${a.status ===
                  "available"
                  ? "available"
                  : "busy"
                  }`}
                key={
                  a.ambulance_id
                }
                onClick={() =>
                  setSelectedAmbulance(
                    a.ambulance_id
                  )
                }
              >

                <div className="fleet-icon">
                  🚑
                </div>

                <div className="fleet-info">

                  <strong>
                    {a.ambulance_id}
                  </strong>

                  <span>
                    {String(
                      a.status ||
                      "unknown"
                    ).replace(
                      "_",
                      " "
                    )}
                  </span>

                </div>

                <div
                  className={`status-dot ${a.status ===
                    "available"
                    ? "green"
                    : "orange"
                    }`}
                ></div>

              </div>

            )
          )}

        </div>

        {selected && (
          <div className="selected-unit">

            <div>

              <span>
                SELECTED UNIT
              </span>

              <strong>
                {selected.ambulance_id}
              </strong>

            </div>

            <div>

              <span>
                STATUS
              </span>

              <strong>
                {String(
                  selected.status
                ).replace(
                  "_",
                  " "
                )}
              </strong>

            </div>

            <div>

              <span>
                POSITION
              </span>

              <strong>
                {Number(
                  selected.latitude
                ).toFixed(4)}
                ,{" "}
                {Number(
                  selected.longitude
                ).toFixed(4)}
              </strong>

            </div>

          </div>
        )}

      </section>

    </div>
  );
}

/* =====================================================
   AMBULANCE VIEW
===================================================== */

function AmbulanceView({
  ambulances,
  hospitals,
  updateAmbulanceStatus,
  sendHospitalAlert,
}) {

  const assigned =
    ambulances.find(
      (a) =>
        a.status === "assigned" ||
        a.status === "en_route" ||
        a.status === "arrived"
    ) ||
    ambulances.find(
      (a) =>
        a.status === "available"
    ) ||
    ambulances[0];

  return (
    <div className="content">

      <div className="field-banner">

        <div className="field-banner-icon">
          🚑
        </div>

        <div>

          <div className="eyebrow">
            FIELD OPERATIONS
          </div>

          <h2>
            Ambulance Response Interface
          </h2>

          <p>
            Real-time dispatch instructions
            and emergency status updates.
          </p>

        </div>

        <div className="field-live">

          <span className="live-dot"></span>

          CONNECTED

        </div>

      </div>

      <div className="ambulance-grid">

        {/* CURRENT ASSIGNMENT */}

        <div className="panel assignment-main">

          <div className="eyebrow">
            CURRENT ASSIGNMENT
          </div>

          <h2>
            {assigned?.ambulance_id ||
              "No Unit"}
          </h2>

          <div className="big-status">

            <span className="status-ring"></span>

            <div>

              <small>
                CURRENT STATUS
              </small>

              <strong>
                {assigned?.status
                  ?.replace(
                    "_",
                    " "
                  )
                  .toUpperCase() ||
                  "AVAILABLE"}
              </strong>

            </div>

          </div>

          <div className="field-route">

            <div className="field-location">

              <span className="route-icon">
                📍
              </span>

              <div>

                <small>
                  DISPATCH POINT
                </small>

                <strong>
                  Bengaluru
                </strong>

              </div>

            </div>

            <div className="vertical-route"></div>

            <div className="field-location">

              <span className="route-icon destination">
                🚨
              </span>

              <div>

                <small>
                  DESTINATION
                </small>

                <strong>
                  Emergency Hotspot
                </strong>

              </div>

            </div>

          </div>

          <div className="status-buttons">

            <button
              onClick={() =>
                updateAmbulanceStatus(
                  assigned?.ambulance_id,
                  "en_route"
                )
              }
            >
              🚨 En Route
            </button>

            <button
              onClick={() =>
                updateAmbulanceStatus(
                  assigned?.ambulance_id,
                  "arrived"
                )
              }
            >
              📍 Arrived
            </button>

            <button
              onClick={() =>
                updateAmbulanceStatus(
                  assigned?.ambulance_id,
                  "completed"
                )
              }
            >
              ✓ Completed
            </button>

          </div>

        </div>

        {/* HOSPITAL ALERT */}

        <div className="panel hospital-alert-panel">

          <div className="eyebrow">
            HOSPITAL COORDINATION
          </div>

          <h2>
            Notify Receiving Hospital
          </h2>

          <p className="panel-description">
            Alert a hospital before arrival
            so emergency resources can be
            prepared.
          </p>

          <div className="hospital-mini-list">

            {hospitals
              .slice(0, 5)
              .map(
                (hospital) => (

                  <div
                    className="hospital-mini"
                    key={
                      hospital.hospital_id
                    }
                  >

                    <div className="hospital-mini-icon">
                      ✚
                    </div>

                    <div className="hospital-mini-info">

                      <strong>
                        {hospital.name}
                      </strong>

                      <span>
                        {
                          hospital.available_emergency_beds
                        }{" "}
                        emergency beds
                      </span>

                    </div>

                    <button
                      onClick={() =>
                        sendHospitalAlert(
                          hospital.hospital_id,
                          assigned?.ambulance_id
                        )
                      }
                    >
                      Alert
                    </button>

                  </div>

                )
              )}

          </div>

        </div>

      </div>

    </div>
  );
}

/* =====================================================
   HOSPITAL VIEW
===================================================== */

function HospitalView({
  hospitals,
  updateHospitalBeds,
}) {

  const totalEmergencyBeds =
    hospitals.reduce(
      (sum, h) =>
        sum +
        Number(
          h.available_emergency_beds ||
          0
        ),
      0
    );

  const totalICUBeds =
    hospitals.reduce(
      (sum, h) =>
        sum +
        Number(
          h.available_icu_beds ||
          0
        ),
      0
    );

  const traumaAvailable =
    hospitals.filter(
      (h) =>
        Boolean(
          h.trauma_available
        )
    ).length;

  return (
    <div className="content">

      {/* BANNER */}

      <div className="field-banner hospital-banner">

        <div className="field-banner-icon">
          🏥
        </div>

        <div>

          <div className="eyebrow">
            HOSPITAL NETWORK
          </div>

          <h2>
            Emergency Capacity Center
          </h2>

          <p>
            Monitor emergency, ICU and
            trauma capacity across the
            network.
          </p>

        </div>

        <div className="field-live">

          <span className="live-dot"></span>

          NETWORK ONLINE

        </div>

      </div>

      {/* CAPACITY SUMMARY */}

      <div className="hospital-stats">

        <div className="capacity-stat">

          <span>
            CONNECTED HOSPITALS
          </span>

          <strong>
            {hospitals.length}
          </strong>

        </div>

        <div className="capacity-stat">

          <span>
            EMERGENCY BEDS
          </span>

          <strong>
            {totalEmergencyBeds}
          </strong>

        </div>

        <div className="capacity-stat">

          <span>
            ICU BEDS
          </span>

          <strong>
            {totalICUBeds}
          </strong>

        </div>

        <div className="capacity-stat">

          <span>
            TRAUMA READY
          </span>

          <strong>
            {traumaAvailable}
          </strong>

        </div>

      </div>

      {/* HOSPITAL CARDS */}

      <div className="hospital-grid">

        {hospitals.map(
          (hospital) => {

            const emergency =
              Number(
                hospital.available_emergency_beds ||
                0
              );

            const icu =
              Number(
                hospital.available_icu_beds ||
                0
              );

            const level =
              emergency <= 5
                ? "critical"
                : emergency <= 10
                  ? "warning"
                  : "healthy";

            return (
              <div
                className="hospital-card"
                key={
                  hospital.hospital_id
                }
              >

                <div className="hospital-card-top">

                  <div className="hospital-big-icon">
                    ✚
                  </div>

                  <div>

                    <span className="hospital-id">
                      {
                        hospital.hospital_id
                      }
                    </span>

                    <h3>
                      {hospital.name}
                    </h3>

                  </div>

                  <div
                    className={`capacity-status ${level}`}
                  >
                    {level ===
                      "healthy"
                      ? "AVAILABLE"
                      : level ===
                        "warning"
                        ? "LIMITED"
                        : "CRITICAL"}
                  </div>

                </div>

                <div className="capacity-bars">

                  {/* EMERGENCY */}

                  <div className="capacity-row">

                    <div className="capacity-label">

                      <span>
                        Emergency
                      </span>

                      <strong>
                        {emergency}
                      </strong>

                    </div>

                    <div className="progress">

                      <div
                        style={{
                          width: `${Math.min(
                            emergency *
                            5,
                            100
                          )}%`,
                        }}
                      ></div>

                    </div>

                  </div>

                  {/* ICU */}

                  <div className="capacity-row">

                    <div className="capacity-label">

                      <span>
                        ICU
                      </span>

                      <strong>
                        {icu}
                      </strong>

                    </div>

                    <div className="progress">

                      <div
                        style={{
                          width: `${Math.min(
                            icu * 10,
                            100
                          )}%`,
                        }}
                      ></div>

                    </div>

                  </div>

                </div>

                <div className="hospital-footer">

                  <span>

                    Trauma:

                    {" "}

                    <b>
                      {hospital.trauma_available
                        ? "Available"
                        : "Unavailable"}
                    </b>

                  </span>

                  <button
                    onClick={() =>
                      updateHospitalBeds(
                        hospital.hospital_id
                      )
                    }
                  >
                    Update
                  </button>

                </div>

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}

/* =====================================================
   EXPORT
===================================================== */

export default App;