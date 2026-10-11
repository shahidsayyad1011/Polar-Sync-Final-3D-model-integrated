import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Clean professional palette matching the SIH screenshot
const CHART_PALETTE = {
  generation: '#10b981', // green
  consumption: '#3b82f6', // blue
  genLoad: '#a855f7', // purple
  batterySoc: '#06b6d4', // cyan
};

function buildSmoothLineConfig(labels, datasets) {
  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'start',
          labels: {
            color: '#64748b',
            font: { family: 'Inter', size: 12, weight: '600' },
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 10,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          bodyFont: { family: 'JetBrains Mono', size: 12 },
          padding: 8,
          cornerRadius: 6,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            maxTicksLimit: 5,
            maxRotation: 0,
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.4)',
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            maxTicksLimit: 5,
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.4)',
            drawBorder: false,
          },
        },
      },
      elements: {
        point: { radius: 0, hoverRadius: 4 },
        line: { tension: 0.4, borderWidth: 2 },
      },
    },
  };
}

function SmoothCanvasChart({ config }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, config);
    return () => chartRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.data.labels = config.data.labels;
    config.data.datasets.forEach((ds, i) => {
      if (chartRef.current.data.datasets[i]) {
        chartRef.current.data.datasets[i].data = ds.data;
      }
    });
    chartRef.current.update('none');
  }, [config.data.labels, config.data.datasets]);

  return <canvas ref={canvasRef} />;
}

// Mini Circular Usage Gauge
function CircularUsageGauge({ percent = 82 }) {
  const radius = 15;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="ps-donut-gauge" title={`Power Consumption Usage: ${percent}%`}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="rgba(226, 232, 240, 0.7)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#06b6d4"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="ps-donut-text">
        <span className="ps-donut-label">Usage</span>
        <span className="ps-donut-val">{percent}%</span>
      </div>
    </div>
  );
}

export default function TelemetryChartsRow({
  history = [],
  data,
  logs = [],
  onOpenFullLogs,
  onOpenEnergyDetails,
}) {
  const labels = history.map((d) => {
    const ts = d.timestamp?.split(' ')[1];
    return ts ? ts.slice(0, 5) : '';
  });

  const genVal = data?.power_generation ?? 74.2;
  const conVal = data?.power_consumption ?? 72.6;
  const genLoadVal = data?.generator_load ?? 62;
  const battVal = data?.battery_soc ?? 89.2;
  const usagePct = genVal > 0 ? Math.round((conVal / genVal) * 100) : 82;

  // 1. Power Generation vs Consumption Config
  const powerConfig = buildSmoothLineConfig(labels, [
    {
      label: 'Generation (kW)',
      data: history.map((d) => d.power_generation ?? 74),
      borderColor: CHART_PALETTE.generation,
      backgroundColor: 'transparent',
    },
    {
      label: 'Consumption (kW)',
      data: history.map((d) => d.power_consumption ?? 72),
      borderColor: CHART_PALETTE.consumption,
      backgroundColor: 'transparent',
    },
  ]);

  // 2. Diagnostics - Load & Battery Config
  const diagConfig = buildSmoothLineConfig(labels, [
    {
      label: 'Generator Load (%)',
      data: history.map((d) => d.generator_load ?? 62),
      borderColor: CHART_PALETTE.genLoad,
      backgroundColor: 'transparent',
    },
    {
      label: 'Battery Charge (%)',
      data: history.map((d) => d.battery_soc ?? 89),
      borderColor: CHART_PALETTE.batterySoc,
      backgroundColor: 'transparent',
    },
  ]);

  // Latest 5 events for Event Log card
  const recentLogs = logs.slice(-5).reverse();

  return (
    <div className="ps-middle-grid">
      {/* ── CARD 1: Power Generation vs Consumption ── */}
      <div className="ps-white-card ps-chart-card">
        <div className="ps-card-header">
          <div className="ps-card-title-wrap">
            <span className="ps-card-icon-dot" style={{ backgroundColor: '#10b981' }} />
            <h3 className="ps-card-title">Power Generation vs Consumption</h3>
          </div>
          <button
            type="button"
            className="ps-live-badge green"
            onClick={onOpenEnergyDetails}
            title="Inspect Energy Telemetry"
          >
            ● Live
          </button>
        </div>

        <div className="ps-chart-canvas-wrap">
          <SmoothCanvasChart config={powerConfig} />
        </div>

        <div className="ps-chart-footer-row">
          <div className="ps-footer-metric">
            <span className="ps-dot green" />
            <span className="ps-metric-lbl">Generation</span>
            <strong className="ps-metric-val">{Number(genVal).toFixed(1)} kW</strong>
          </div>

          <div className="ps-footer-metric">
            <span className="ps-dot blue" />
            <span className="ps-metric-lbl">Consumption</span>
            <strong className="ps-metric-val">{Number(conVal).toFixed(1)} kW</strong>
          </div>

          <CircularUsageGauge percent={usagePct} />
        </div>
      </div>

      {/* ── CARD 2: Diagnostics - Load & Battery ── */}
      <div className="ps-white-card ps-chart-card">
        <div className="ps-card-header">
          <div className="ps-card-title-wrap">
            <span className="ps-card-icon-dot" style={{ backgroundColor: '#06b6d4' }} />
            <h3 className="ps-card-title">Diagnostics - Load & Battery</h3>
          </div>
          <span className="ps-live-badge cyan">◆ Live</span>
        </div>

        <div className="ps-chart-canvas-wrap">
          <SmoothCanvasChart config={diagConfig} />
        </div>

        <div className="ps-chart-footer-row">
          <div className="ps-footer-metric-pill">
            <span className="ps-metric-icon">⚙️</span>
            <div>
              <span className="ps-sub-label">Generator Load</span>
              <strong className="ps-main-num">{Math.round(genLoadVal)}%</strong>
            </div>
          </div>

          <div className="ps-footer-metric-pill">
            <span className="ps-metric-icon">🔋</span>
            <div>
              <span className="ps-sub-label">Battery Charge</span>
              <strong className="ps-main-num">{Number(battVal).toFixed(1)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Event Log ── */}
      <div className="ps-white-card ps-event-card">
        <div className="ps-card-header">
          <div className="ps-card-title-wrap">
            <span className="ps-card-icon-dot" style={{ backgroundColor: '#3b82f6' }} />
            <h3 className="ps-card-title">Event Log</h3>
          </div>
          <button
            type="button"
            className="ps-card-action-link"
            onClick={onOpenFullLogs}
          >
            View All →
          </button>
        </div>

        <div className="ps-event-list-stream">
          {recentLogs.length > 0 ? (
            recentLogs.map((entry, idx) => {
              const level = (entry.level || 'info').toLowerCase();
              return (
                <div key={idx} className="ps-stream-row">
                  <span className="ps-stream-time">{entry.time}</span>
                  <span className={`ps-stream-badge ${level}`}>
                    {level.toUpperCase()}
                  </span>
                  <span className="ps-stream-subsys">{entry.subsystem}</span>
                  <span className="ps-stream-msg" title={entry.message}>
                    {entry.message}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="ps-stream-empty">Telemetry stream connecting...</div>
          )}
        </div>

        <button
          type="button"
          className="ps-view-full-log-btn"
          onClick={onOpenFullLogs}
        >
          <span className="ps-doc-icon">📄</span>
          <span>View Full Log ({logs.length})</span>
        </button>
      </div>
    </div>
  );
}
