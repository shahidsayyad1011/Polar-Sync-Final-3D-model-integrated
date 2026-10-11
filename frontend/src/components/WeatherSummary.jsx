import React from 'react';

// Label shown next to the title so "Min / Max / Average" are never ambiguous
const RANGE_LABELS = {
  '24H': 'Last 24 hours',
  '7D': 'Last 7 days',
  '30D': 'Last 30 days',
  All: 'All available data',
};

// Number -> fixed string, or 'N/A' when the value is missing
function show(value, digits) {
  const n = Number(value);
  return value == null || Number.isNaN(n) ? 'N/A' : n.toFixed(digits);
}

function Row({ label, value, unit, digits = 1, current = false }) {
  const text = show(value, digits);
  return (
    <div className={`ps-weather-summary__row${current ? ' is-current' : ''}`}>
      <span className="ps-weather-summary__label">{label}</span>
      <span className="ps-weather-summary__value">
        {text}
        {text !== 'N/A' && <span className="ps-weather-summary__unit">{unit}</span>}
      </span>
    </div>
  );
}

function Group({ tone, icon, title, children }) {
  return (
    <div className={`ps-weather-summary__col ${tone}`}>
      <div className="ps-weather-summary__header">
        <span className="ps-weather-summary__icon">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function WeatherSummary({ current, stats, range = '24H' }) {
  if (!stats) return null;
  const cur = current || {};

  return (
    <div className="ps-weather-summary">
      <div className="ps-weather-summary__top">
        <div className="ps-section-title">WEATHER SUMMARY</div>
        <span className="ps-weather-summary__period">{RANGE_LABELS[range] || range}</span>
      </div>

      <div className="ps-weather-summary__grid">
        <Group tone="temp" icon="🌡️" title="Temperature">
          <Row current label="Current" value={cur.temperature} unit="°C" />
          <Row label="Minimum" value={stats.tempMin} unit="°C" />
          <Row label="Maximum" value={stats.tempMax} unit="°C" />
          <Row label="Average" value={stats.tempAvg} unit="°C" />
        </Group>

        <Group tone="wind" icon="💨" title="Wind">
          <Row current label="Current" value={cur.windSpeed} unit="km/h" />
          <Row label="Maximum" value={stats.windMax} unit="km/h" />
        </Group>

        <Group tone="pressure" icon="⏲️" title="Pressure">
          <Row current label="Current" value={cur.pressure} unit="hPa" />
          <Row label="Average" value={stats.pressureAvg} unit="hPa" />
        </Group>

        <Group tone="humidity" icon="💧" title="Humidity">
          <Row current label="Current" value={cur.humidity} unit="%" digits={0} />
          <Row label="Average" value={stats.humidityAvg} unit="%" digits={0} />
        </Group>
      </div>
    </div>
  );
}