import React, { useState, useMemo } from 'react';

export default function LogsView({ logs = [] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter((e) => {
      const level = (e.level || 'info').toLowerCase();
      if (filter !== 'all' && level !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const msg = (e.message || '').toLowerCase();
        const sub = (e.subsystem || '').toLowerCase();
        if (!msg.includes(q) && !sub.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filter, search]);

  const counts = {
    all: logs.length,
    info: logs.filter((e) => (e.level || 'info').toLowerCase() === 'info').length,
    warning: logs.filter((e) => (e.level || '').toLowerCase() === 'warning').length,
    critical: logs.filter((e) => (e.level || '').toLowerCase() === 'critical').length,
  };

  return (
    <div className="ps-full-logs-container">
      {/* Search & Filter Toolbar */}
      <div className="ps-logs-toolbar">
        <div className="ps-logs-search-wrap">
          <span className="ps-search-icon">🔍</span>
          <input
            type="text"
            className="ps-logs-search-input"
            placeholder="Search telemetry, subsystems, or messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="ps-search-clear-btn"
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="ps-logs-filter-group">
          <button
            type="button"
            className={`ps-log-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>ALL</span>
            <span className="ps-filter-count">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`ps-log-filter-btn info ${filter === 'info' ? 'active' : ''}`}
            onClick={() => setFilter('info')}
          >
            <span>INFO</span>
            <span className="ps-filter-count">{counts.info}</span>
          </button>
          <button
            type="button"
            className={`ps-log-filter-btn warning ${filter === 'warning' ? 'active' : ''}`}
            onClick={() => setFilter('warning')}
          >
            <span>WARN</span>
            <span className="ps-filter-count">{counts.warning}</span>
          </button>
          <button
            type="button"
            className={`ps-log-filter-btn critical ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >
            <span>CRIT</span>
            <span className="ps-filter-count">{counts.critical}</span>
          </button>
        </div>
      </div>

      {/* Structured Log Table */}
      <div className="ps-logs-table-wrap">
        <table className="ps-logs-table">
          <thead>
            <tr>
              <th style={{ width: '45px' }}>#</th>
              <th style={{ width: '85px' }}>TIME</th>
              <th style={{ width: '75px' }}>SEVERITY</th>
              <th style={{ width: '80px' }}>SUBSYSTEM</th>
              <th>TELEMETRY EVENT & MESSAGE</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((entry, idx) => {
                const level = (entry.level || 'info').toLowerCase();
                return (
                  <tr key={idx} className={`ps-log-table-row level-${level}`}>
                    <td className="mono ps-col-idx">{idx + 1}</td>
                    <td className="mono ps-col-time">{entry.time || '--:--:--'}</td>
                    <td>
                      <span className={`ps-stream-badge ${level}`}>
                        {level.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="ps-stream-subsys">{entry.subsystem || 'CORE'}</span>
                    </td>
                    <td className="ps-col-msg">{entry.message}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="ps-logs-empty-row">
                  No telemetry events match the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="ps-logs-footer-info">
        <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
        <span>Telemetry polling active (2s interval)</span>
      </div>
    </div>
  );
}
