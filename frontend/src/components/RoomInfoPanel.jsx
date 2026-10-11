import React, { useEffect } from 'react';
import { STATION_ROOMS, TELEMETRY_LABELS } from '../data/stationRooms';

function TelTile({ field, value }) {
  const meta = TELEMETRY_LABELS[field] || { label: field, unit: '' };

  if (meta.isBool) {
    const isOn = value === 1 || value === true;
    return (
      <div className="ps-inspector-tile">
        <span className="ps-inspector-key">{meta.label}</span>
        <div className="ps-inspector-val-row">
          <span className={`ps-badge-pill ${isOn ? 'green' : 'red'}`}>
            <span className="ps-synced-dot" />
            {isOn ? 'Operational' : 'FAULT / OFFLINE'}
          </span>
        </div>
      </div>
    );
  }

  const display =
    value !== undefined && value !== null
      ? typeof value === 'number'
        ? value.toFixed(meta.precision ?? 2)
        : String(value)
      : '--';

  const pct =
    meta.max && typeof value === 'number'
      ? Math.min(100, Math.max(0, (value / meta.max) * 100))
      : null;

  return (
    <div className="ps-inspector-tile">
      <span className="ps-inspector-key">{meta.label}</span>
      <div className="ps-inspector-val-row">
        <strong className="ps-inspector-number">{display}</strong>
        {meta.unit && <span className="ps-inspector-unit">{meta.unit}</span>}
      </div>
      {pct !== null && (
        <div className="ps-inspector-bar-track">
          <div className="ps-inspector-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function RoomInfoPanel({ selectedRoomId, stationData, onClose }) {
  const room = STATION_ROOMS.find((r) => r.id === selectedRoomId);

  // Close on ESC key
  useEffect(() => {
    if (!room) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [room, onClose]);

  if (!room) return null;

  const status = stationData ? room.statusLogic(stationData) : 'normal';

  return (
    <div className="ps-modal-overlay" onClick={onClose}>
      <div className="ps-modal-window ps-inspector-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ps-modal-header">
          <div className="ps-modal-title">
            <span className="ps-modal-icon" style={{ fontSize: '18px' }}>{room.icon}</span>
            <span>{room.name.toUpperCase()}</span>
            <span className={`ps-badge-pill ${status === 'critical' ? 'red' : status === 'warning' ? 'orange' : 'green'}`} style={{ marginLeft: '8px' }}>
              {status === 'normal' ? 'OPERATIONAL' : status.toUpperCase()}
            </span>
          </div>
          <button type="button" className="ps-modal-close-btn" onClick={onClose} title="Close (ESC)">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="ps-modal-body">
          {/* Room description summary banner */}
          <div className="ps-inspector-banner">
            <div className="ps-inspector-desc">{room.description}</div>
            <div className="ps-inspector-category-tag">Category: <strong>{room.category?.toUpperCase() || 'CORE FACILITY'}</strong></div>
          </div>

          {/* Subsystem Telemetry Grid */}
          <div className="ps-inspector-grid">
            {stationData ? (
              room.telemetryFields && room.telemetryFields.length > 0 ? (
                room.telemetryFields.map((field) => (
                  <TelTile key={field} field={field} value={stationData[field]} />
                ))
              ) : (
                <div className="ps-inspector-empty">No telemetry channels configured for this zone.</div>
              )
            ) : (
              <div className="ps-inspector-empty">Connecting to station telemetry stream...</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="ps-modal-footer">
          <span className="ps-footer-tip">Press <kbd>ESC</kbd> or click outside to dismiss</span>
          <button type="button" className="ps-modal-btn-primary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
