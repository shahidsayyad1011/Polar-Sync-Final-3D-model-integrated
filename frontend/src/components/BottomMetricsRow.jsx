import React from 'react';

// ── Helpers ─────────────────────────────────────────────────────────
function degToCompass(num) {
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[Math.floor(num / 22.5 + 0.5) % 16];
}

// Compass code -> plain-English name (used in hover tooltips)
const COMPASS_NAMES = {
  N: 'North', NNE: 'North-North-East', NE: 'North-East', ENE: 'East-North-East',
  E: 'East', ESE: 'East-South-East', SE: 'South-East', SSE: 'South-South-East',
  S: 'South', SSW: 'South-South-West', SW: 'South-West', WSW: 'West-South-West',
  W: 'West', WNW: 'West-North-West', NW: 'North-West', NNW: 'North-North-West',
};

// Number -> fixed string, or '--' when telemetry has not arrived yet
function fmt(v, digits = 1) {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? '--' : n.toFixed(digits);
}

// Beaufort scale from km/h
function beaufort(kmh) {
  const limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  return limits.filter((l) => kmh >= l).length;
}

// Status text -> tile colour
function statusTone(status) {
  const s = String(status || '').toUpperCase();
  if (['ONLINE', 'RUNNING', 'ACTIVE', 'STANDBY', 'NORMAL', 'NOMINAL'].includes(s)) return 'green';
  if (['DEGRADED', 'LOW', 'WARNING'].includes(s)) return 'amber';
  return 'red';
}

// Percentage level (fuel, battery) -> colour + tag
function levelTone(pct, lowAt = 20, warnAt = 40) {
  if (pct == null) return { tone: '', tag: '--', tagTone: '' };
  if (pct < lowAt) return { tone: 'red', tag: 'Low', tagTone: 'red' };
  if (pct < warnAt) return { tone: 'amber', tag: 'Medium', tagTone: 'amber' };
  return { tone: 'green', tag: 'Normal', tagTone: 'green' };
}

// ── Reusable pieces ─────────────────────────────────────────────────
function Tile({ label, tag, tagTone = 'green', value, unit, tone = '', caption, hint, text = false, wide = false }) {
  return (
    <div
      className={`ps-metric-2x2-tile${wide ? ' span-2' : ''}`}
      title={`${label}: ${value}${unit ? ' ' + unit : ''}${caption ? ' — ' + caption : ''}${hint ? '\n' + hint : ''}`}
    >
      <div className="ps-tile-header-line">
        <span className="ps-tile-lbl-full">{label}</span>
      </div>
      <div className="ps-tile-num-wrap">
        <span className={`ps-tile-big-num ${tone}${text ? ' text-val' : ''}`}>{value}</span>
        {unit ? <span className="ps-tile-unit">{unit}</span> : null}
        {tag ? <span className={`ps-tile-tag ${tagTone}`}>{tag}</span> : null}
      </div>
      {caption ? <span className="ps-tile-sub-caption">{caption}</span> : null}
    </div>
  );
}

function DomainCard({ icon, iconTone, title, badge, badgeTone, onDetails, detailsTitle, singleColumn = false, children }) {
  return (
    <div className="ps-white-card ps-bottom-card">
      <div className="ps-card-header">
        <div className="ps-card-title-wrap" title={title}>
          <span className={`ps-domain-icon ${iconTone}`}>{icon}</span>
          <h3 className="ps-card-title">{title}</h3>
        </div>
        <div className="ps-header-right-group">
          <span className={`ps-badge-pill ${badgeTone}`}>{badge}</span>
          <button type="button" className="ps-card-action-link" onClick={onDetails} title={detailsTitle}>
            View Details <span className="ps-details-chevron" aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <div className={`ps-bottom-metrics-2x2${singleColumn ? ' cols-1' : ''}`}>{children}</div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────
export default function BottomMetricsRow({
  data,
  onOpenEnergyDetails,
  onOpenWeatherDetails,
  onOpenEquipmentDetails,
  onOpenLogisticsDetails,
}) {
  const d = data || {};

  // 1) ENERGY
  const genStatus = d.generator_status || '--';
  const genLoad = d.generator_load;
  const genLoadTone = genLoad == null ? '' : genLoad > 90 ? 'red' : genLoad > 75 ? 'amber' : 'green';
  const genLoadTag = genLoad == null ? '--' : genLoad > 90 ? 'Overload' : genLoad > 75 ? 'High' : 'Normal';
  const fuel = levelTone(d.fuel_level);
  const batt = levelTone(d.battery_soc);

  // 2) ENVIRONMENT
  const windKmh = d.wind_speed;
  const bft = windKmh != null ? beaufort(windKmh) : null;
  const windTone = bft == null ? 'cyan' : bft >= 8 ? 'red' : bft >= 6 ? 'amber' : 'cyan';
  const windNote = bft == null ? '--' : bft >= 8 ? 'Gale Warning' : bft >= 6 ? 'Strong Wind' : 'Wind Nominal';
  const windDeg = d.wind_direction != null ? Math.round(d.wind_direction) : null;
  const windHeading = windDeg != null ? degToCompass(windDeg) : '--';
  const windHeadingName = COMPASS_NAMES[windHeading] || 'unknown direction';

  // 3) INFRASTRUCTURE
  const waterStatus = d.water_treatment_status || '--';
  const commStatus = d.communication_equipment_status || '--';
  const heaterActive = !!d.backup_heater_active;
  const pumpOnline = d.pump_status !== 0;
  const issues =
    (waterStatus !== 'ONLINE' && waterStatus !== '--' ? 1 : 0) +
    (commStatus !== 'ONLINE' && commStatus !== '--' ? 1 : 0) +
    (pumpOnline ? 0 : 1);

  // 4) LOGISTICS
  const foodDays = d.food_days_remaining;
  const foodKg = d.food_stock_kg != null ? Number(d.food_stock_kg).toLocaleString() : '--';
  const medDays = d.medicine_days_remaining;
  const medUnits = d.medicine_stock_units != null ? Number(d.medicine_stock_units).toLocaleString() : '--';
  // Backend does not send cooking_fuel_level yet, so fall back to day-tank level (same as the right sidebar)
  const cookingFuel = d.cooking_fuel_level != null ? d.cooking_fuel_level : d.fuel_level;
  const cook = levelTone(cookingFuel);
  const rawRisk = d.resupply_risk || 'NOMINAL';
  const resupplyRisk = rawRisk === 'NORMAL' ? 'NOMINAL' : rawRisk;

  return (
    <div className="ps-bottom-grid ps-bottom-grid-4">
      {/* ── CARD 1: Energy & Power Grid ── */}
      <DomainCard
        icon="⚡"
        iconTone="green"
        title="Energy & Power Grid"
        badge={genStatus}
        badgeTone={statusTone(genStatus)}
        onDetails={onOpenEnergyDetails}
        detailsTitle="View Energy Details"
      >
        <Tile label="Generator Status" tag="Gen 1" tagTone="blue" value={genStatus} tone={statusTone(genStatus)} text caption="Diesel Generator" hint="Diesel Generator Unit 1 (DG-1): the station's main power generator." />
        <Tile label="Generator Load" tag={genLoadTag} tagTone={genLoadTone} value={fmt(genLoad)} unit="%" tone={genLoadTone} caption="Engine Load" hint="How hard the generator engine is working. Above 75% = High, above 90% = Overload." />
        <Tile label="Power Generation" tag="Live" tagTone="green" value={fmt(d.power_generation)} unit="kW" tone="green" caption="100kVA Main Feed" hint="Electricity being produced right now by the main generator feed." />
        <Tile label="Power Consumption" tag="In Use" tagTone="blue" value={fmt(d.power_consumption)} unit="kW" tone="blue" caption="Life Support & Labs" hint="Electricity being used right now by the station (life support, labs, heating)." />
        <Tile label="Fuel Level" tag={fuel.tag} tagTone={fuel.tagTone} value={fmt(d.fuel_level)} unit="%" tone={fuel.tone} caption="Daily Fuel Tank" hint="Diesel left in the day tank that feeds the generator. Medium below 40%, Low below 20%." />
        <Tile label="Battery Charge" tag={batt.tag} tagTone={batt.tagTone} value={fmt(d.battery_soc)} unit="%" tone={batt.tone} caption="Battery Bank 415V" hint="Battery State of Charge (SOC): how full the battery is. Medium below 40%, Low below 20%." />
      </DomainCard>

      {/* ── CARD 2: Environment & Climate ── */}
      <DomainCard
        icon="🌡️"
        iconTone="blue"
        title="Environment & Climate"
        badge="Live Weather"
        badgeTone="blue"
        onDetails={onOpenWeatherDetails}
        detailsTitle="View Environment Details"
      >
        <Tile label="Temperature" tag="Outside" tagTone="blue" value={fmt(d.temperature)} unit="°C" tone="blue" caption="Weather Mast" hint="Outside air temperature, measured by the Automatic Weather Station (AWS) mast." />
        <Tile label="Wind Speed" tag={bft != null ? `Force ${bft}` : '--'} tagTone={windTone} value={fmt(windKmh)} unit="km/h" tone={windTone} caption={windNote} hint="Force = Beaufort wind scale from 0 (calm) to 12 (hurricane). Force 8 is a gale." />
        <Tile label="Wind Direction" tag={windHeading} tagTone="green" value={windDeg != null ? `${windDeg}°` : '--'} caption="Wind Comes From" hint={windDeg != null ? `Wind is blowing from the ${windHeadingName} (${windDeg}° on the compass).` : undefined} />
        <Tile label="Air Pressure" tag="Live" tagTone="cyan" value={fmt(d.air_pressure)} unit="hPa" tone="cyan" caption="Station Barometer" hint="Atmospheric pressure in hectopascals (hPa). Falling pressure often means bad weather is coming." />
        <Tile label="Humidity" tag="Moisture" tagTone="green" value={fmt(d.humidity)} unit="%" caption="Relative Humidity" hint="Relative Humidity: how much moisture is in the air compared to the maximum it can hold." wide />
      </DomainCard>

      {/* ── CARD 3: Infrastructure & Systems ── */}
      <DomainCard
        icon="🛠️"
        iconTone="green"
        title="Infrastructure & Systems"
        badge={issues === 0 ? 'All OK' : `${issues} Issue${issues > 1 ? 's' : ''}`}
        badgeTone={issues === 0 ? 'green' : 'red'}
        onDetails={onOpenEquipmentDetails}
        detailsTitle="View Subsystems Details"
      >
        <Tile label="Water Treatment" tag={d.water_treatment_health != null ? `${fmt(d.water_treatment_health, 0)}%` : '--'} tagTone={statusTone(waterStatus)} value={waterStatus} tone={statusTone(waterStatus)} text caption="Water Purifier" hint="Reverse Osmosis (RO) water purification unit. The % badge shows its health." />
        <Tile label="Comm System" tag={d.communication_equipment_health != null ? `${fmt(d.communication_equipment_health, 0)}%` : '--'} tagTone={statusTone(commStatus)} value={commStatus} tone={statusTone(commStatus)} text caption="Satellite Link" hint="Satellite communication link (VSAT via GSAT-14). The % badge shows its health." />
        <Tile label="Backup Heater" tag={d.backup_heater_health != null ? `${fmt(d.backup_heater_health, 0)}%` : '--'} tagTone="green" value={heaterActive ? 'ACTIVE' : 'STANDBY'} tone={heaterActive ? 'amber' : 'green'} text caption="Backup Heating" hint="Standby heater: ACTIVE when running, STANDBY when ready but switched off. The % badge shows its health." />
        <Tile label="Heating (HVAC)" tag="Power" tagTone="amber" value={fmt(d.heating)} unit="kW" tone="amber" caption="Living & Lab Supply" hint="HVAC = Heating, Ventilation & Air Conditioning. Heating power supplied to living and lab areas." />
        <Tile label="Pump Status" tag="Pump 1" tagTone={pumpOnline ? 'green' : 'red'} value={pumpOnline ? 'ACTIVE' : 'OFFLINE'} tone={pumpOnline ? 'green' : 'red'} text caption="Cooling Heat Exchanger" hint="Circulation pump 1 of the heating/cooling loop. ACTIVE = running, OFFLINE = stopped." wide />
      </DomainCard>

      {/* ── CARD 4: Logistics & Life Support ── */}
      <DomainCard
        icon="📦"
        iconTone="cyan"
        title="Logistics & Life Support"
        badge={resupplyRisk === 'CRITICAL' ? 'Alert' : 'Normal'}
        badgeTone={resupplyRisk === 'CRITICAL' ? 'red' : 'green'}
        onDetails={onOpenLogisticsDetails}
        detailsTitle="View Logistics Details"
        singleColumn
      >
        <Tile
          label="Food Stock"
          tag={`${foodKg} kg`}
          tagTone={statusTone(d.food_status || 'NORMAL')}
          value={foodDays != null ? foodDays : '--'}
          unit="Days"
          tone={statusTone(d.food_status || 'NORMAL')}
          caption={`Burn ${fmt(d.food_consumption_daily_kg, 0)} kg/day · Winterover Rations`}
        />
        <Tile label="Cooking Fuel" tag={cook.tag} tagTone={cook.tagTone} value={fmt(cookingFuel)} unit="%" tone={cook.tone} caption="Galley & Heating Supply" />
        <Tile
          label="Medical Supply"
          tag={`${medUnits} units`}
          tagTone={statusTone(d.medicine_status || 'NORMAL')}
          value={medDays != null ? medDays : '--'}
          unit="Days"
          tone={statusTone(d.medicine_status || 'NORMAL')}
          caption={`Use ${fmt(d.medicine_consumption_daily, 1)} u/day · Store ${fmt(d.medicine_storage_temperature, 1)}°C`}
        />
      </DomainCard>
    </div>
  );
}