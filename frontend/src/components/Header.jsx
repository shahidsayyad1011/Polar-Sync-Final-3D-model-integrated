import React, { useState, useEffect } from 'react';
import { STATION_CONFIG } from '../data/stationRooms';

export default function Header({
  connectionStatus,
  lastUpdated,
  activeStation = 'MAITRI',
  onStationChange,
  networkBandwidth,
  networkStatus,
  networkLatency,
  theme = 'light',
  onToggleTheme,
  alertsCount = 0,
  onOpenAlerts,
  onOpenEdge,
}) {
  const [utcTime, setUtcTime] = useState('--:--:--');
  const [utcDate, setUtcDate] = useState('--');
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${mins}:${secs}`);

      const day = String(now.getUTCDate()).padStart(2, '0');
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const year = now.getUTCFullYear();
      setUtcDate(`${day}-${month}-${year}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const coords =
    activeStation === 'BHARATI'
      ? { location: 'Larsemann Hills, Antarctica', coords: '69°24′28″S  76°11′14″E' }
      : { location: 'Schirmacher Oasis, Antarctica', coords: '70°45′52″S  11°44′03″E' };

  const isOnline = connectionStatus === 'connected';

  return (
    <header className="ps-header-bar">
      {/* Brand & Station Info */}
      <div className="ps-header-left">
        {/* Brand Logo & Title */}
        <div className="ps-header-brand-wrap">
          <div className="ps-brand-logo-icon" title="PolarSync Indian Antarctic Program">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M6 21C6 17 9 12 16 12C23 12 26 17 26 21C26 25 22 26 16 26C10 26 6 25 6 21Z" fill="currentColor" opacity="0.9"/>
              <circle cx="10" cy="11" r="3" fill="currentColor"/>
              <circle cx="22" cy="11" r="3" fill="currentColor"/>
              <path d="M12 21C12 19 14 18 16 18C18 18 20 19 20 21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="ps-brand-text-block">
            <h1 className="ps-brand-title">POLAR SYNC</h1>
            <p className="ps-brand-subtitle">Indian Antarctic Research Stations</p>
          </div>
        </div>

        {/* Station Switch (side by side) */}
        <div className="ps-station-select-group">
          <span className="ps-station-label">STATION</span>
          <div className="ps-station-switch" role="tablist" aria-label="Select station">
            {['MAITRI', 'BHARATI'].map((st) => (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={activeStation === st}
                className={`ps-station-switch-btn ${activeStation === st ? 'active' : ''}`}
                onClick={() => onStationChange(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Location & GPS Coordinates */}
        <div className="ps-location-badge">
          <svg className="ps-pin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div className="ps-location-text">
            <span className="ps-loc-name">{coords.location}</span>
            <span className="ps-loc-coords">{coords.coords}</span>
          </div>
        </div>
      </div>

      {/* Status Pills, UTC Clock, Theme Toggle & User Info */}
      <div className="ps-header-right">
        {/* Simulator Status */}
        <div className="ps-status-pill online">
          <span className="ps-pill-pulse-dot" />
          <span>{isOnline ? 'Simulator Online' : 'Connecting...'}</span>
        </div>

        {/* Sync Status */}
        <button
          type="button"
          className="ps-status-pill sync"
          onClick={onOpenEdge}
          title="Edge Computing Synchronization Engine"
        >
          <svg className="ps-sync-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Sync Active</span>
        </button>

        {/* Network Status */}
        <div
          className={`ps-status-pill network ${networkStatus === 'SLOW' ? 'slow' : 'online'}`}
          title={`Bandwidth: ${networkBandwidth ?? 0} Mbps | Latency: ${networkLatency ?? 0} ms`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
          </svg>
          <div className="ps-network-text-group">
            <span className="ps-network-tag">Network</span>
            <span className="ps-network-val">{networkStatus === 'SLOW' ? 'Degraded' : 'Online'}</span>
          </div>
        </div>

        {/* UTC Clock & Date */}
        <div className="ps-utc-clock-card">
          <span className="ps-utc-tag">UTC</span>
          <div className="ps-utc-time-group">
            <strong className="ps-utc-time">{utcTime}</strong>
            <span className="ps-utc-date">{utcDate}</span>
          </div>
        </div>

        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          className="ps-theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Alerts Notification Button */}
        <button
          type="button"
          className="ps-notification-bell-btn"
          onClick={onOpenAlerts}
          title="View System Alerts"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {alertsCount > 0 && <span className="ps-notif-badge">{alertsCount}</span>}
        </button>

        {/* Commander Profile */}
        <div className="ps-user-avatar-wrap" title="Station Commander • Indian Antarctic Program">
          <div className="ps-avatar-circle">
            <span className="ps-avatar-initials">IS</span>
          </div>
        </div>
      </div>
    </header>
  );
}

