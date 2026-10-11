import React, { useState, useEffect, useCallback, useRef } from 'react';

import Header from './components/Header';
import DigitalTwin from './components/DigitalTwin';
import BharatiDigitalTwin from './components/BharatiDigitalTwin';
import TelemetryChartsRow from './components/TelemetryChartsRow';
import BottomMetricsRow from './components/BottomMetricsRow';
import RightStatusSidebar from './components/RightStatusSidebar';
import RoomInfoPanel from './components/RoomInfoPanel';
import AlertPanel from './components/AlertPanel';
import WeatherPanel from './components/WeatherPanel';
import LogsView from './components/LogsView';
import EdgeComputingControl from './components/EdgeComputingControl';
import EdgeComputingPanel from './components/EdgeComputingPanel';

import { fetchStationData, fetchAnomalyEvents } from './services/api';
import { detectAlerts } from './data/stationRooms';

const POLL_INTERVAL = 2000; // ms — matches simulator 2s interval
const MAX_HISTORY = 30; // rolling buffer size
const MAX_LOGS = 100; // max log entries to keep

function buildLogEntry(data, prevData) {
  const time = data.timestamp?.split(' ')[1]?.slice(0, 8) ?? '--:--:--';
  const entries = [];

  if (!prevData) {
    entries.push({ time, level: 'info', subsystem: 'CORE', message: 'Telemetry stream established' });
    return entries;
  }

  const genLoadDiff = Math.abs((data.generator_load ?? 0) - (prevData.generator_load ?? 0));
  if (genLoadDiff > 5) {
    const dir = data.generator_load > prevData.generator_load ? '▲' : '▼';
    entries.push({ time, level: 'info', subsystem: 'GEN', message: `Load ${dir} ${data.generator_load?.toFixed(1)}%` });
  }

  if (data.pump_status === 0 && prevData.pump_status !== 0) {
    entries.push({ time, level: 'critical', subsystem: 'PUMP', message: 'Cooling pump OFFLINE' });
  }
  if (data.pump_status === 1 && prevData.pump_status !== 1) {
    entries.push({ time, level: 'info', subsystem: 'PUMP', message: 'Cooling pump restored' });
  }

  if ((data.vibration ?? 0) > 7 && (prevData.vibration ?? 0) <= 7) {
    entries.push({ time, level: 'critical', subsystem: 'MECH', message: `High vibration: ${data.vibration?.toFixed(2)} mm/s` });
  }

  if ((data.battery_soc ?? 100) < 20 && (prevData.battery_soc ?? 100) >= 20) {
    entries.push({ time, level: 'warning', subsystem: 'BATT', message: `Low battery SOC: ${data.battery_soc?.toFixed(1)}%` });
  }

  if ((data.fuel_level ?? 100) < 20 && (prevData.fuel_level ?? 100) >= 20) {
    entries.push({ time, level: 'warning', subsystem: 'FUEL', message: `Fuel critical: ${data.fuel_level?.toFixed(1)}%` });
  }

  if (entries.length === 0) {
    entries.push({ time, level: 'info', subsystem: 'CORE', message: `Telemetry OK — energy ${data.energy?.toFixed(2)} kWh` });
  }

  return entries;
}

export default function App() {
  const [stationData, setStationData] = useState(null);
  const [history, setHistory] = useState({ MAITRI: [], BHARATI: [] });
  const [logs, setLogs] = useState({ MAITRI: [], BHARATI: [] });
  const [alerts, setAlerts] = useState([]);
  const [anomalyEvents, setAnomalyEvents] = useState({ MAITRI: [], BHARATI: [] });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeStation, setActiveStation] = useState('MAITRI');
  const [viewMode, setViewMode] = useState('3D'); // 3D View is default on load
  const [activeNav, setActiveNav] = useState('Dashboard');

  // Theme Management (Light mode default matching reference screenshot, with Dark mode switch)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('polarsync_theme_v2') || 'dark';
  });

  // Dedicated Domain Modals
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showEdgeModal, setShowEdgeModal] = useState(false);

  const prevDataRef = useRef({ MAITRI: null, BHARATI: null });

  // Sync theme attribute to <html> element and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('polarsync_theme_v2', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const poll = useCallback(async () => {
    try {
      const data = await fetchStationData(activeStation);
      if (!data) return;

      setStationData(data);
      setConnectionStatus('connected');

      // Update rolling history for the active station
      setHistory((h) => {
        const currentHist = h[activeStation] || [];
        const next = [...currentHist, data];
        return {
          ...h,
          [activeStation]: next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next,
        };
      });

      // Generate log entries using station-specific previous data
      const prevData = prevDataRef.current[activeStation];
      const newEntries = buildLogEntry(data, prevData);
      setLogs((l) => {
        const currentLogs = l[activeStation] || [];
        const next = [...currentLogs, ...newEntries];
        return {
          ...l,
          [activeStation]: next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next,
        };
      });

      // Detect alerts
      setAlerts(detectAlerts(data));

      // Poll anomaly events for alert history
      try {
        const events = await fetchAnomalyEvents(activeStation);
        setAnomalyEvents((prev) => ({ ...prev, [activeStation]: events }));
      } catch (_) {
        /* non-critical */
      }

      prevDataRef.current[activeStation] = data;
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  }, [activeStation]);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [poll]);

  const handleStationChange = useCallback((station) => {
    setActiveStation(station);
    setSelectedRoom(null);
  }, []);

  const handleRoomSelect = useCallback((roomId) => {
    setSelectedRoom(roomId);
  }, []);

  const handleRoomClose = useCallback(() => {
    setSelectedRoom(null);
  }, []);

  const handleNavSelect = useCallback((navId) => {
    setActiveNav(navId);
    if (navId === 'Stations') {
      setActiveStation((prev) => (prev === 'MAITRI' ? 'BHARATI' : 'MAITRI'));
    } else if (navId === 'Energy') {
      setShowEnergyModal(true);
    } else if (navId === 'Environment') {
      setShowWeatherModal(true);
    } else if (navId === 'Logistics') {
      setShowLogisticsModal(true);
    } else if (navId === 'Equipment') {
      setShowEquipmentModal(true);
    } else if (navId === 'Reports') {
      setShowLogsModal(true);
    } else if (navId === 'Settings') {
      setShowEdgeModal(true);
    }
  }, []);

  return (
    <div className={`ps-app ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      {/* ── TOP HEADER ── */}
      <Header
        connectionStatus={connectionStatus}
        lastUpdated={stationData?.timestamp}
        activeStation={activeStation}
        onStationChange={handleStationChange}
        networkBandwidth={stationData?.network_bandwidth}
        networkStatus={stationData?.network_status}
        networkLatency={stationData?.network_latency}
        theme={theme}
        onToggleTheme={toggleTheme}
        alertsCount={alerts.length}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onOpenEdge={() => setShowEdgeModal(true)}
      />

      {/* ── MAIN HORIZONTAL WORKSPACE ── */}
      <div className="ps-main-body">
        {/* Left + Center Layout Container */}
        <div className="ps-dashboard-layout">
          {/* Upper Section: Compact Left Navigation + Center 3D Twin & Charts */}
          <div className="ps-upper-grid">

            <main className="ps-content-workspace">
              {/* 3D / 2D Digital Twin Viewport */}
              <div className="ps-twin-viewport-container">
                {activeStation === 'BHARATI' ? (
                  <BharatiDigitalTwin
                    stationData={stationData}
                    selectedRoom={selectedRoom}
                    onRoomSelect={handleRoomSelect}
                    alerts={alerts}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                ) : (
                  <DigitalTwin
                    stationData={stationData}
                    selectedRoom={selectedRoom}
                    onRoomSelect={handleRoomSelect}
                    alerts={alerts}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                )}
              </div>

              {/* Middle Telemetry Charts & Live Event Log */}
              <TelemetryChartsRow
                history={history[activeStation] || []}
                data={stationData}
                logs={logs[activeStation] || []}
                onOpenFullLogs={() => setShowLogsModal(true)}
                onOpenEnergyDetails={() => setShowEnergyModal(true)}
              />
            </main>
          </div>

          {/* Bottom 4 Domains (Extending all the way from far left!) */}
          <BottomMetricsRow
            data={stationData}
            onOpenEnergyDetails={() => setShowEnergyModal(true)}
            onOpenWeatherDetails={() => setShowWeatherModal(true)}
            onOpenEquipmentDetails={() => setShowEquipmentModal(true)}
            onOpenLogisticsDetails={() => setShowLogisticsModal(true)}
          />
        </div>

        {/* Right Status Sidebar (Station Status KPIs, Priority Queue, Edge History, Alerts) */}
        <RightStatusSidebar
          stationData={stationData}
          alerts={alerts}
          anomalyEvents={anomalyEvents[activeStation] || []}
          onOpenAlertHistory={() => setShowAlertsModal(true)}
          onOpenAlertDetails={() => setShowAlertsModal(true)}
          onOpenEdgeDetails={() => setShowEdgeModal(true)}
        />
      </div>

      {/* ── ROOM INSPECTOR MODAL ── */}
      {selectedRoom && (
        <RoomInfoPanel
          selectedRoomId={selectedRoom}
          stationData={stationData}
          onClose={handleRoomClose}
        />
      )}

      {/* ── ⚡ ENERGY DOMAIN DETAIL MODAL ── */}
      {showEnergyModal && (
        <div className="ps-modal-overlay" onClick={() => setShowEnergyModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">⚡</span>
                <span>ENERGY & POWER GENERATION DOMAIN — {activeStation} STATION</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowEnergyModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body">
              <div className="ps-domain-detail-grid">
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Power Generation</span>
                  <div className="ps-kpi-number green">{stationData?.power_generation?.toFixed(2) ?? '80.00'} <small>kW</small></div>
                  <span className="ps-kpi-sub">Diesel Genset DG-1 (100kVA)</span>
                </div>
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Power Consumption</span>
                  <div className="ps-kpi-number blue">{stationData?.power_consumption?.toFixed(2) ?? '65.00'} <small>kW</small></div>
                  <span className="ps-kpi-sub">Station Life Support & Lab Load</span>
                </div>
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Battery State of Charge</span>
                  <div className="ps-kpi-number cyan">{stationData?.battery_soc?.toFixed(1) ?? '90.0'} <small>%</small></div>
                  <span className="ps-kpi-sub">Inverter Bus 415V 3-Phase</span>
                </div>
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Day Fuel Tank</span>
                  <div className="ps-kpi-number amber">{stationData?.fuel_level?.toFixed(1) ?? '75.0'} <small>%</small></div>
                  <span className="ps-kpi-sub">Active Feed to Generators</span>
                </div>
              </div>

              <div className="ps-domain-subtable">
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Generator Operational Status</span>
                  <span className="ps-badge-pill green">{stationData?.generator_status || 'RUNNING'}</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Generator Mechanical Load</span>
                  <span className="ps-st-val">{stationData?.generator_load?.toFixed(1) ?? '60.0'}%</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Generator Health Index</span>
                  <span className="ps-st-val">{stationData?.generator_health?.toFixed(1) ?? '95.0'}%</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Critical Systems Power Grid</span>
                  <span className="ps-badge-pill green">{stationData?.critical_systems_powered !== false ? 'ENERGIZED' : 'FAULT'}</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Bulk Fuel Farm Reserves</span>
                  <span className="ps-st-val">{stationData?.generator_fuel_reserve_l?.toLocaleString() ?? '200,000'} Liters ({stationData?.generator_fuel_reserve_days_remaining ?? 384} Days)</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Cumulative Energy Generated</span>
                  <span className="ps-st-val">{stationData?.energy?.toFixed(2) ?? '500.00'} kWh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 🌤️ ENVIRONMENT & METEOROLOGY MODAL ── */}
      {showWeatherModal && (
        <div className="ps-modal-overlay" onClick={() => setShowWeatherModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">🌤️</span>
                <span>ENVIRONMENT & ANTARCTIC METEOROLOGY — {activeStation}</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowWeatherModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body">
              <div className="ps-domain-detail-grid">
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Outdoor Ambient Temp</span>
                  <div className="ps-kpi-number cyan">{stationData?.temperature?.toFixed(1) ?? '-10.0'} <small>°C</small></div>
                  <span className="ps-kpi-sub">Sonic AWS Thermometer</span>
                </div>
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Barometric Air Pressure</span>
                  <div className="ps-kpi-number blue">{stationData?.air_pressure?.toFixed(1) ?? '970.0'} <small>hPa</small></div>
                  <span className="ps-kpi-sub">Barometer Station Altitude: 117m</span>
                </div>
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Wind Velocity</span>
                  <div className="ps-kpi-number green">{stationData?.wind_speed?.toFixed(1) ?? '30.0'} <small>km/h</small></div>
                  <span className="ps-kpi-sub">{((stationData?.wind_speed ?? 30) / 3.6).toFixed(1)} m/s (Anemometer Mast)</span>
                </div>
                <div className="ps-detail-kpi-card">
                  <span className="ps-kpi-title">Relative Humidity</span>
                  <div className="ps-kpi-number cyan">{stationData?.humidity?.toFixed(1) ?? '55.0'} <small>%</small></div>
                  <span className="ps-kpi-sub">Polar Cryo-Atmosphere</span>
                </div>
              </div>

              <div className="ps-domain-subtable" style={{ marginTop: '12px' }}>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Wind Azimuth Direction</span>
                  <span className="ps-st-val">{stationData?.wind_direction?.toFixed(1) ?? '270.0'}° (West Polar Katabatic)</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Telemetry Source Quality</span>
                  <span className="ps-badge-pill green">{stationData?.environment_quality || 'VALIDATED'}</span>
                </div>
                <div className="ps-subtable-row">
                  <span className="ps-st-label">Sensor Telemetry Feed</span>
                  <span className="ps-st-val">{stationData?.environment_source_type || 'AWS_DIRECT_TELEMETRY'}</span>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <WeatherPanel station={activeStation} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 🛠️ INFRASTRUCTURE & SUBSYSTEMS MODAL ── */}
      {showEquipmentModal && (
        <div className="ps-modal-overlay" onClick={() => setShowEquipmentModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">🛠️</span>
                <span>INFRASTRUCTURE & SUBSYSTEM HEALTH — {activeStation}</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowEquipmentModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body">
              <div className="ps-infra-modal-grid">
                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">Cooling Water Circulation Pump</span>
                    <div className="ps-infra-desc">Primary Heat Exchanger Loop</div>
                  </div>
                  <span className={`ps-badge-pill ${stationData?.pump_status !== 0 ? 'green' : 'red'}`}>
                    {stationData?.pump_status !== 0 ? 'ONLINE' : 'TRIPPED'}
                  </span>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">Water Treatment & RO Plant</span>
                    <div className="ps-infra-desc">Purity: 12 ppm TDS | Flux: 3,200 L/Day</div>
                  </div>
                  <span className="ps-badge-pill green">
                    {stationData?.water_treatment_status || 'ONLINE'} ({stationData?.water_treatment_health ?? 96}%)
                  </span>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">Auxiliary Backup Heater</span>
                    <div className="ps-infra-desc">Dual Burners District Heating Loop</div>
                  </div>
                  <span className={`ps-badge-pill ${stationData?.backup_heater_active ? 'orange' : 'green'}`}>
                    {stationData?.backup_heater_active ? 'ACTIVE' : 'STANDBY'} ({stationData?.backup_heater_health ?? 97}%)
                  </span>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">VSAT Satellite Transceiver</span>
                    <div className="ps-infra-desc">2.4m Tracking Antenna (GSAT-14)</div>
                  </div>
                  <span className="ps-badge-pill green">
                    {stationData?.communication_equipment_status || 'ONLINE'} ({stationData?.communication_equipment_health ?? 98}%)
                  </span>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">HVAC Heating Output</span>
                    <div className="ps-infra-desc">Living & Laboratory Supply</div>
                  </div>
                  <strong className="ps-infra-val">{stationData?.heating?.toFixed(2) ?? 20.00} kW</strong>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">Equipment Core Temperature</span>
                    <div className="ps-infra-desc">Generator House Ambient Sensor</div>
                  </div>
                  <strong className="ps-infra-val">{stationData?.equipment_temperature?.toFixed(2) ?? 35.00} °C</strong>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">Mechanical Vibration Sensor</span>
                    <div className="ps-infra-desc">Bearing Harmonic Limit: 7.0 mm/s</div>
                  </div>
                  <strong className="ps-infra-val">{stationData?.vibration?.toFixed(2) ?? 2.00} mm/s</strong>
                </div>

                <div className="ps-infra-item">
                  <div>
                    <span className="ps-infra-label">Cumulative Plant Runtime</span>
                    <div className="ps-infra-desc">Service Interval Threshold: 2,000 hrs</div>
                  </div>
                  <strong className="ps-infra-val">{stationData?.runtime ?? 1200} hrs</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 📦 LOGISTICS & LIFE SUPPORT INVENTORY MODAL ── */}
      {showLogisticsModal && (
        <div className="ps-modal-overlay" onClick={() => setShowLogisticsModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">📦</span>
                <span>LOGISTICS & EXPEDITION LIFE SUPPORT INVENTORY</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowLogisticsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body">
              <div className="ps-logistics-modal-grid">
                {/* Food Stock Card */}
                <div className="ps-white-card ps-log-card">
                  <div className="ps-card-header">
                    <span className="ps-card-title">🍲 Dry Rations & Food Stocks</span>
                    <span className={`ps-badge-pill ${stationData?.food_status === 'CRITICAL' ? 'red' : 'green'}`}>
                      {stationData?.food_status || 'NORMAL'}
                    </span>
                  </div>
                  <div className="ps-log-body">
                    <div className="ps-log-val">{stationData?.food_stock_kg?.toLocaleString() ?? 1840} <small>kg</small></div>
                    <div className="ps-log-detail">Autonomy: <strong>{stationData?.food_days_remaining ?? 92} days</strong></div>
                    <div className="ps-log-detail">Daily Burn Rate: {stationData?.food_consumption_daily_kg ?? 20} kg/day</div>
                    <div className="ps-log-detail">Cold Storage Temp: {stationData?.food_storage_temperature ?? -18.0}°C</div>
                    <div className="ps-log-detail">Spoilage Risk Level: <strong>{stationData?.food_expiry_risk ?? 0} (Nominal)</strong></div>
                  </div>
                </div>

                {/* Medicine Stock Card */}
                <div className="ps-white-card ps-log-card">
                  <div className="ps-card-header">
                    <span className="ps-card-title">💊 Medical Supplies & Vaccines</span>
                    <span className={`ps-badge-pill ${stationData?.medicine_status === 'CRITICAL' ? 'red' : 'green'}`}>
                      {stationData?.medicine_status || 'NORMAL'}
                    </span>
                  </div>
                  <div className="ps-log-body">
                    <div className="ps-log-val">{stationData?.medicine_stock_units?.toLocaleString() ?? 428} <small>units</small></div>
                    <div className="ps-log-detail">Autonomy: <strong>{stationData?.medicine_days_remaining ?? 122} days</strong></div>
                    <div className="ps-log-detail">Daily Consumption: {stationData?.medicine_consumption_daily ?? 3.5} u/day</div>
                    <div className="ps-log-detail">Medical Storage Temp: {stationData?.medicine_storage_temperature ?? 4.0}°C</div>
                    <div className="ps-log-detail">Degradation Risk: <strong>{stationData?.medicine_expiry_risk ?? 0} (Nominal)</strong></div>
                  </div>
                </div>

                {/* Bulk Fuel Reserves Card */}
                <div className="ps-white-card ps-log-card">
                  <div className="ps-card-header">
                    <span className="ps-card-title">🛢️ Bulk Generator Fuel Farm</span>
                    <span className={`ps-badge-pill ${stationData?.resupply_risk === 'CRITICAL' ? 'red' : 'green'}`}>
                      Resupply: {stationData?.resupply_risk || 'NORMAL'}
                    </span>
                  </div>
                  <div className="ps-log-body">
                    <div className="ps-log-val">{stationData?.generator_fuel_reserve_l?.toLocaleString() ?? '200,000'} <small>L</small></div>
                    <div className="ps-log-detail">Fuel Autonomy: <strong>{stationData?.generator_fuel_reserve_days_remaining ?? 384} days</strong></div>
                    <div className="ps-log-detail">Day Tank Feed: {stationData?.fuel_level?.toFixed(1) ?? 75.0}%</div>
                    <div className="ps-log-detail">Fuel Line Heat Trace: Active (-18°C)</div>
                    <div className="ps-log-detail">Winterover Resupply Window: 180 days</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 📋 FULL EVENT LOGS MODAL ── */}
      {showLogsModal && (
        <div className="ps-modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">📋</span>
                <span>SYSTEM EVENT LOG STREAM — {activeStation} STATION</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowLogsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body">
              <LogsView logs={logs[activeStation] || []} />
            </div>
          </div>
        </div>
      )}

      {/* ── ⚠️ ALERTS & AI DIAGNOSTICS MODAL ── */}
      {showAlertsModal && (
        <div className="ps-modal-overlay" onClick={() => setShowAlertsModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">⚠️</span>
                <span>ACTIVE ALERTS & DIAGNOSTICS — {activeStation} STATION</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowAlertsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <AlertPanel
                station={activeStation}
                alerts={alerts}
                anomalyEvents={anomalyEvents[activeStation] || []}
                onAlertClick={(roomId) => {
                  setShowAlertsModal(false);
                  setSelectedRoom(roomId);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 📡 EDGE COMPUTING & SYNC MODAL ── */}
      {showEdgeModal && (
        <div className="ps-modal-overlay" onClick={() => setShowEdgeModal(false)}>
          <div className="ps-modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <div className="ps-modal-title">
                <span className="ps-modal-icon">📡</span>
                <span>EDGE COMPUTING & DATA SYNCHRONIZATION PIPELINE</span>
              </div>
              <button
                type="button"
                className="ps-modal-close-btn"
                onClick={() => setShowEdgeModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ps-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <EdgeComputingControl />
              <EdgeComputingPanel station={activeStation} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
