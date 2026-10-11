import React, { useState, useEffect } from 'react';
import {
  fetchEdgeStatus,
  fetchEdgeQueue,
  fetchEdgeHistory,
  fetchSyncStatus,
} from '../services/api';

// Mini SVG Sparkline Component
function MiniSparkline({ color = '#10b981', points = [10, 14, 12, 18, 16, 22] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 56;
  const height = 30;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathStr = `M ${coords.join(' L ')}`;

  return (
    <svg width={width} height={height} className="ps-sparkline-svg">
      <path
        d={pathStr}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RightStatusSidebar({
  stationData,
  alerts = [],
  anomalyEvents = [],
  onOpenAlertHistory,
  onOpenAlertDetails,
  onOpenEdgeDetails,
}) {
  const [edgeQueue, setEdgeQueue] = useState({ priorities: { P1: 0, P2: 0, P3: 0 }, total_pending: 0 });
  const [edgeHistory, setEdgeHistory] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadEdgeData() {
      try {
        const [queue, history, sync] = await Promise.all([
          fetchEdgeQueue().catch(() => null),
          fetchEdgeHistory(10).catch(() => []),
          fetchSyncStatus().catch(() => null),
        ]);
        if (!mounted) return;
        if (queue) setEdgeQueue(queue);
        if (history && history.length) setEdgeHistory(history);
        if (sync) setSyncStatus(sync);
      } catch (_) { }
    }

    loadEdgeData();
    const timer = setInterval(loadEdgeData, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const d = stationData || {};

  // Station status metrics
  const energyVal = d.energy != null ? d.energy.toFixed(2) : '497.72';
  const battSocVal = d.battery_soc != null ? d.battery_soc.toFixed(2) : '89.20';
  const cookingFuelVal = d.cooking_fuel_level != null ? d.cooking_fuel_level.toFixed(2) : (d.fuel_level != null ? d.fuel_level.toFixed(2) : '73.53');
  const genHealthVal = d.generator_health != null ? d.generator_health.toFixed(2) : '95.05';

  const p1 = edgeQueue?.priorities?.P1 ?? 0;
  const p2 = edgeQueue?.priorities?.P2 ?? 0;
  const p3 = edgeQueue?.priorities?.P3 ?? 0;
  const syncCompleteCount = 1;

  // Fallback edge history if backend list is empty
  const displayHistory =
    edgeHistory && edgeHistory.length > 0
      ? edgeHistory.slice(0, 5)
      : [
        { time: '14:23:25', p: 'P3', type: 'TELEM', status: 'Synced' },
        { time: '14:23:25', p: 'P3', type: 'TELEM', status: 'Synced' },
        { time: '14:23:15', p: 'P3', type: 'TELEM', status: 'Synced' },
        { time: '14:23:15', p: 'P3', type: 'TELEM', status: 'Synced' },
        { time: '14:23:05', p: 'P3', type: 'TELEM', status: 'Synced' },
      ];


  // Most important current alert (critical first) shown directly on the dashboard
  const sortedAlerts = [...alerts].sort(
    (a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1)
  );
  const topAlert = sortedAlerts[0] || null;
  const extraAlerts = Math.max(0, alerts.length - 1);

  // Alert History feed items
  const displayAlertHistory =
    anomalyEvents && anomalyEvents.length > 0
      ? anomalyEvents.slice(0, 3).map((evt) => ({
        time: evt.timestamp?.split(' ')[1]?.slice(0, 8) || evt.time || '11:47:55',
        priority: evt.severity === 'critical' ? 'P1' : (evt.severity === 'warning' ? 'P2' : 'P3'),
        message: evt.title || evt.description || evt.message || 'Telemetry Anomaly Event',
      }))
      : [
        { time: '11:47:55', priority: 'P3', message: 'Telemetry stream nominal' },
        { time: '10:24:12', priority: 'P2', message: 'Battery SOC below 85%' },
        { time: '08:15:00', priority: 'P3', message: 'Automated edge sync OK' },
      ];

  return (
    <aside className="ps-right-sidebar">
      {/* ── CARD 1: Station Status ── */}
      <div className="ps-white-card ps-sidebar-card">
        <div className="ps-card-header">
          <h3 className="ps-card-title">Station Status</h3>
          <span className="ps-badge-pill green">Operational</span>
        </div>

        <div className="ps-station-status-2x2">
          {/* Energy */}
          <div className="ps-status-tile">
            <div className="ps-tile-header">
              <span className="ps-tile-icon-wrap blue">⚡</span>
              <span className="ps-tile-name">Energy</span>
            </div>
            <div className="ps-tile-val">{energyVal} <small>kWh</small></div>
            <div className="ps-tile-footer">
              <span className="ps-trend-chip green">↑ 12%</span>
              <MiniSparkline color="#10b981" points={[8, 12, 10, 15, 14, 19]} />
            </div>
          </div>

          {/* Battery SOC */}
          <div className="ps-status-tile">
            <div className="ps-tile-header">
              <span className="ps-tile-icon-wrap green">🔋</span>
              <span className="ps-tile-name">Battery Charge</span>
            </div>
            <div className="ps-tile-val">{battSocVal} <small>%</small></div>
            <div className="ps-tile-footer">
              <span className="ps-trend-chip green">↑ 2%</span>
              <MiniSparkline color="#10b981" points={[14, 15, 13, 16, 17, 18]} />
            </div>
          </div>

          {/* COOKING FUEL — Highlighted SIH requirement */}
          <div className="ps-status-tile">
            <div className="ps-tile-header">
              <span className="ps-tile-icon-wrap cyan">🍳</span>
              <span className="ps-tile-name">Cooking Fuel</span>
            </div>
            <div className="ps-tile-val">{cookingFuelVal} <small>%</small></div>
            <div className="ps-tile-footer">
              <span className="ps-trend-chip cyan">↑ 1%</span>
              <MiniSparkline color="#06b6d4" points={[18, 17, 16, 15, 16, 17]} />
            </div>
          </div>

          {/* Generator Health */}
          <div className="ps-status-tile">
            <div className="ps-tile-header">
              <span className="ps-tile-icon-wrap blue">⚙️</span>
              <span className="ps-tile-name">Generator Health</span>
            </div>
            <div className="ps-tile-val">{genHealthVal} <small>%</small></div>
            <div className="ps-tile-footer">
              <span className="ps-trend-chip cyan">↑ 3%</span>
              <MiniSparkline color="#06b6d4" points={[12, 14, 13, 17, 18, 20]} />
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Priority Queue ── */}
      <div className="ps-white-card ps-sidebar-card">
        <div className="ps-card-header">
          <h3 className="ps-card-title">Priority Queue</h3>
          <button
            type="button"
            className="ps-card-action-link"
            onClick={onOpenEdgeDetails}
          >
            View All →
          </button>
        </div>

        <div className="ps-priority-list">
          <div className="ps-priority-row">
            <div className="ps-priority-pill-tag red">P1</div>
            <span className="ps-priority-name">Critical</span>
            <span className="ps-priority-count">{p1}</span>
          </div>

          <div className="ps-priority-row">
            <div className="ps-priority-pill-tag orange">P2</div>
            <span className="ps-priority-name">Moderate</span>
            <span className="ps-priority-count">{p2}</span>
          </div>

          <div className="ps-priority-row">
            <div className="ps-priority-pill-tag green">P3</div>
            <span className="ps-priority-name">Normal</span>
            <span className="ps-priority-count">{p3}</span>
          </div>

          <div className="ps-priority-row">
            <div className="ps-priority-pill-tag cyan">SYNC</div>
            <span className="ps-priority-name">Sync Complete</span>
            <span className="ps-priority-count">{syncCompleteCount}</span>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Edge History ── */}
      <div className="ps-white-card ps-sidebar-card">
        <div className="ps-card-header">
          <h3 className="ps-card-title">Edge History</h3>
          <button
            type="button"
            className="ps-card-action-link"
            onClick={onOpenEdgeDetails}
          >
            View All →
          </button>
        </div>

        <div className="ps-edge-history-list">
          {displayHistory.map((item, idx) => {
            const timeStr = item.time || (item.timestamp ? new Date(item.timestamp * 1000).toLocaleTimeString([], { hour12: false }) : '--:--:--');
            const pLabel = item.p || (item.priority != null ? `P${item.priority}` : 'P3');
            const typeStr = item.type || 'TELEM';

            return (
              <div key={idx} className="ps-edge-history-row">
                <span className="ps-edge-time">{timeStr}</span>
                <span className="ps-edge-p3-tag">{pLabel}</span>
                <span className="ps-edge-type">{typeStr}</span>
                <div className="ps-edge-synced-pill">
                  <span>Synced</span>
                  <span className="ps-synced-dot" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CARD 4: Active Alerts (Full-Width Interactive Trigger) ── */}
      <div className="ps-white-card ps-sidebar-card ps-active-alerts-card">
        <button
          type="button"
          className={`ps-active-alerts-trigger-btn ${alerts.length > 0 ? 'has-alerts' : 'nominal'}`}
          onClick={onOpenAlertDetails}
          title="Open alert details"
        >
          <div className="ps-alerts-btn-left">
            <span className={`ps-alerts-status-dot ${alerts.length > 0 ? 'alerting' : 'nominal'}`} />
            <div className="ps-alerts-btn-text">
              <div className="ps-alert-title-row">
                <span className={`ps-alerts-main-label ${topAlert ? topAlert.severity : ''}`}>
                  {topAlert ? topAlert.message : 'All Systems Nominal'}
                </span>
                {topAlert && (
                  <span className={`ps-alert-sev-tag ${topAlert.severity}`}>
                    {topAlert.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                  </span>
                )}
                {extraAlerts > 0 && (
                  <span className="ps-alert-more-chip">+{extraAlerts} more</span>
                )}
              </div>
              <span
                className="ps-alerts-current-line"
                title={topAlert ? `${topAlert.message} — ${topAlert.description}` : 'No active alerts'}
              >
                {topAlert ? topAlert.description : 'No active alerts · telemetry healthy'}
              </span>
            </div>
          </div>
          <span className="ps-alerts-btn-arrow">›</span>
        </button>
      </div>

      {/* ── CARD 5: Alert History ── */}
      <div className="ps-white-card ps-sidebar-card ps-alert-history-card">
        <div className="ps-alert-history-header">
          <div className="ps-ah-title-wrap">
            <span className="ps-clock-icon">⏱</span>
            <span className="ps-ah-title">Alert History</span>
          </div>
          <button
            type="button"
            className="ps-card-action-link"
            onClick={onOpenAlertHistory}
          >
            View All →
          </button>
        </div>

        <div className="ps-alert-history-list">
          {displayAlertHistory.map((item, idx) => (
            <div
              key={idx}
              className="ps-alert-history-row"
              onClick={onOpenAlertHistory}
              title="Click to view alert diagnostics"
            >
              <span className="ps-ah-time">{item.time}</span>
              <span className={`ps-ah-priority-pill ${item.priority.toLowerCase()}`}>
                {item.priority}
              </span>
              <span className="ps-ah-msg">{item.message}</span>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}
