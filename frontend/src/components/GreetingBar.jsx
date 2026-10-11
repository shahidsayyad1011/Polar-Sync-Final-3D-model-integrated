import React from 'react';

export default function GreetingBar({
  station = 'MAITRI',
  activeTab = 'Overview',
  onSelectTab,
}) {
  // Determine appropriate greeting based on local time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

  const stationName = station === 'BHARATI' ? 'Bharati' : 'Maitri';

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: '📊' },
    { id: '3D View', label: '3D View', icon: '🧊' },
    { id: 'Systems', label: 'Systems', icon: '⚙️' },
    { id: 'Weather', label: 'Weather', icon: '🌤️' },
    { id: 'Alerts', label: 'Alerts', icon: '⚠️' },
    { id: 'Reports', label: 'Reports', icon: '📄' },
  ];

  return (
    <div className="ps-greeting-bar">
      <div className="ps-greeting-text-group">
        <div className="ps-greeting-title-wrap">
          <span className="ps-greeting-sun-icon" role="img" aria-label="Sun">☀️</span>
          <h2 className="ps-greeting-title">{greeting}</h2>
        </div>
        <p className="ps-greeting-sub">Here’s what’s happening at {stationName} today</p>
      </div>

      <div className="ps-greeting-tabs" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ps-greeting-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab(tab.id)}
            >
              <span className="ps-tab-emoji">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
