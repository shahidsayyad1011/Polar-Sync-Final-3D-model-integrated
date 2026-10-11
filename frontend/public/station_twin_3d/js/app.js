/**
 * Indian Antarctic Research Stations - Dual Digital Twin Orchestrator
 * Seamless switching between Maitri Station (Schirmacher Oasis) & Bharati Station (Larsemann Hills)
 * Orbit Controls, High-Definition Shaders, 3D Labels, Raycasting, and SIH 26060 Telemetry.
 */

(function () {
  // Core Three.js Objects
  let scene, camera, renderer, controls;
  let maitriData = null;
  let bharatiData = null;
  let envData = null;
  let clock = new THREE.Clock();

  // Post-Processing Pipeline & Cinematic Director
  let composer = null, renderPass = null, bloomPass = null, filmicPass = null, tiltShiftPass = null, fxaaPass = null;
  let isPostProcessingEnabled = true;
  let isTurntableActive = false;
  let turntableSpeed = 0.8;
  let graphicsPreset = 'balanced'; // 'ultra' | 'balanced' | 'performance'

  // State
  let currentStation = 'maitri'; // 'maitri' | 'bharati'
  let currentOverlay = 'standard';
  let labelsVisible = true;
  let activeModuleId = 'main_entrance';
  let isCameraAnimating = false;
  let targetCamPos = new THREE.Vector3();
  let targetLookAt = new THREE.Vector3();
  let failureModeActive = false;
  let interiorLightsOn = false;

  // Station Configurations & Presets
  const stationConfigs = {
    maitri: {
      id: 'maitri',
      title: 'MAITRI STATION',
      coords: '70°45′57″ S, 11°44′09″ E • Schirmacher Oasis, Antarctica • Elev: 117m',
      cameraPresets: {
        photo: { pos: new THREE.Vector3(18, 54, 74), look: new THREE.Vector3(-1, 3.0, 4), name: "Reference Photo Angle" },
        aerial: { pos: new THREE.Vector3(0, 88, 4), look: new THREE.Vector3(0, 0, 4), name: "Top-Down Aerial Grid" },
        power: { pos: new THREE.Vector3(-48, 16, 26), look: new THREE.Vector3(-28, 3.5, 7), name: "Generator & Fuel Depot" },
        labs: { pos: new THREE.Vector3(-26, 24, 18), look: new THREE.Vector3(-15, 6, -8), name: "Laboratories & Mast" },
        living: { pos: new THREE.Vector3(34, 22, 22), look: new THREE.Vector3(18, 5, -6), name: "Living & Dining Block" },
        workshop: { pos: new THREE.Vector3(-4, 18, 38), look: new THREE.Vector3(-2, 3, 10), name: "Workshop & Store/Logistics" },
        comms: { pos: new THREE.Vector3(42, 14, 32), look: new THREE.Vector3(28, 3.5, 17), name: "VSAT Dish & Comms" }
      },
      markers: [
        { id: 'aws_weather_station', name: 'AWS / WEATHER STATION', pos: new THREE.Vector3(-44, 11.5, 1.5), dotColor: 'orange' },
        { id: 'laboratories', name: 'LABORATORIES', pos: new THREE.Vector3(-14, 7.5, -8) },
        { id: 'main_entrance', name: 'MAIN ENTRANCE', pos: new THREE.Vector3(0, 8.2, -7.5) },
        { id: 'living_quarters', name: 'LIVING QUARTERS', pos: new THREE.Vector3(12, 7.5, -8) },
        { id: 'dining_recreation', name: 'DINING / RECREATION', pos: new THREE.Vector3(27, 10.5, -7.5) },
        { id: 'workshop', name: 'WORKSHOP', pos: new THREE.Vector3(-2, 7.2, 10) },
        { id: 'generator_room', name: 'GENERATOR ROOM', pos: new THREE.Vector3(-32, 7.5, 13) },
        { id: 'fuel_storage', name: 'FUEL STORAGE', pos: new THREE.Vector3(-25, 6.0, 1.5) },
        { id: 'battery_backup', name: 'BATTERY BACKUP', pos: new THREE.Vector3(-38, 5.2, 27), dotColor: 'orange' },
        { id: 'water_treatment_unit', name: 'WATER TREATMENT UNIT', pos: new THREE.Vector3(-21, 5.8, 24), dotColor: 'orange' },
        { id: 'backup_heater', name: 'BACKUP HEATER', pos: new THREE.Vector3(-11, 6.2, 24), dotColor: 'orange' },
        { id: 'heating_hvac', name: 'HEATING / HVAC', pos: new THREE.Vector3(-2, 5.5, 32), dotColor: 'orange' },
        { id: 'store', name: 'STORE/LOGISTICS', pos: new THREE.Vector3(10, 6.5, 24) },
        { id: 'communication_room', name: 'COMMUNICATION ROOM', pos: new THREE.Vector3(32, 5.5, 17) }
      ],
      modules: {
        main_entrance: { code: "MAI-01", name: "Main Entrance & Hub", temp: 19.5, power: 4.2, sensors: ["Door Air-Lock: SEALED", "Passage Heating: ACTIVE", "Indian National Emblem: ILLUMINATED"] },
        laboratories: { code: "MAI-02", name: "Scientific Laboratories", temp: 21.0, power: 18.6, sensors: ["Magnetometer: 0.2nT Noise", "Riometer Antenna: ONLINE", "Seismograph: ACTIVE", "Clean Lab Air: HEPA-14"] },
        living_quarters: { code: "MAI-03", name: "Living Quarters", temp: 22.0, power: 12.8, sensors: ["Occupancy: 18 Scientists", "Fresh Air Exchanger: 450 m³/h", "Greywater Recovery: 84%"] },
        dining_recreation: { code: "MAI-04", name: "Dining & Recreation Complex", temp: 21.5, power: 14.5, sensors: ["Galley Kitchen Range: READY", "HVAC Hoods: NOMINAL", "Mess Library: WARM"] },
        workshop: { code: "MAI-05", name: "Maintenance Workshop", temp: 17.0, power: 6.8, sensors: ["Snowcat Bay: STANDBY", "Welding Rig: IDLE", "Machine Lathe: OPERATIONAL"] },
        generator_room: { code: "MAI-06", name: "Generator & Power House", temp: 26.0, power: 2.4, sensors: ["DG-1 (100kVA): RUNNING", "DG-2 (100kVA): AUTO-STANDBY", "Battery Bank: 54.2V (98%)"] },
        fuel_storage: { code: "MAI-07", name: "Bulk Fuel Storage Farm", temp: -12.0, power: 1.2, sensors: ["White Cylinders (x6): 74,200 L", "Red Reserve Tank: 14,200 L", "Fuel Line Heat Trace: ON (-18°C)"] },
        store: { code: "MAI-08", name: "Store/Logistics", temp: 4.5, power: 1.5, sensors: ["Dry Ration Stocks: 8.5 Months", "Spare Parts: 94%", "Permafrost Stilts: STABLE"] },
        communication_room: { code: "MAI-09", name: "Communications Room & VSAT", temp: 20.0, power: 3.8, sensors: ["VSAT 2.4m Dish: LOCKED (GSAT-14)", "Latency: 680ms", "Iridium Backup: READY"] },
        aws_weather_station: { code: "MAI-10", name: "AWS / Weather Station", temp: -24.5, power: 0.8, sensors: ["Wind Gust: 52.4 km/h", "Barometer: 988.2 hPa", "Solar Irradiance: 145 W/m²", "Sonic Temp: -24.5°C"] },
        battery_backup: { code: "MAI-11", name: "Battery Backup", temp: 18.2, power: 8.5, sensors: ["Storage Capacity: 480 kWh", "State of Charge: 98.4%", "Inverter Bus: 415V 3-Phase", "Thermal Condition: OPTIMAL"] },
        heating_hvac: { code: "MAI-12", name: "Heating / HVAC", temp: 22.4, power: 18.2, sensors: ["Axial Cooling Fans: 4/4 RUNNING", "Supply Loop Flow: 185 L/min", "Condenser COP: 3.4", "Loop Delta T: 14.2°C"] },
        water_treatment_unit: { code: "MAI-13", name: "Water Treatment Unit", temp: 14.5, power: 6.8, sensors: ["Dual Sand Filters: ONLINE", "RO Permeate Flux: 3,200 L/Day", "Potable Storage: 12,500 L", "Water TDS Purity: 12 ppm"] },
        backup_heater: { code: "MAI-14", name: "Backup Heater", temp: 45.0, power: 2.2, sensors: ["Auxiliary Thermal Output: 85 kW", "Flue Temp: 148°C", "Dual Burners: STANDBY AUTO-START", "District Supply: READY"] }
      }
    },
    bharati: {
      id: 'bharati',
      title: 'BHARATI STATION',
      coords: '69°24′28″ S, 76°11′14″ E • Larsemann Hills, Antarctica • Elev: 35m',
      cameraPresets: {
        photo: { pos: new THREE.Vector3(20, 58, 82), look: new THREE.Vector3(0, 3.5, 4), name: "Reference Photo Angle" },
        aerial: { pos: new THREE.Vector3(0, 92, 2), look: new THREE.Vector3(0, 0, 2), name: "Top-Down Aerial Grid" },
        main: { pos: new THREE.Vector3(2, 24, 22), look: new THREE.Vector3(2, 7, -6), name: "Main Aerodynamic Complex" },
        fuel: { pos: new THREE.Vector3(-48, 16, 8), look: new THREE.Vector3(-28, 4, -6), name: "Bunded Fuel Farm" },
        pumphouse: { pos: new THREE.Vector3(-42, 14, 34), look: new THREE.Vector3(-28, 3, 16), name: "Sea Water Pump House" },
        power: { pos: new THREE.Vector3(-14, 16, 34), look: new THREE.Vector3(-4, 3, 16), name: "Generator & Battery Backup" },
        camp: { pos: new THREE.Vector3(46, 16, 36), look: new THREE.Vector3(32, 3, 18), name: "Summer Field Camp" }
      },
      markers: [
        { id: 'aws_weather_station', name: 'AWS / WEATHER STATION', pos: new THREE.Vector3(-42, 11.5, -12) },
        { id: 'communication_system', name: 'COMMUNICATION SYSTEM', pos: new THREE.Vector3(2.0, 15.2, -6.5) },
        { id: 'heating_hvac', name: 'HEATING / HVAC', pos: new THREE.Vector3(18.5, 13.8, -6.5) },
        { id: 'fuel_storage', name: 'FUEL STORAGE', pos: new THREE.Vector3(-28, 7.5, -6) },
        { id: 'laboratories', name: 'LABORATORIES', pos: new THREE.Vector3(-12, 10.5, -6) },
        { id: 'main_entrance', name: 'MAIN ENTRANCE', pos: new THREE.Vector3(0.5, 7.5, 2.5) },
        { id: 'living_quarters', name: 'LIVING QUARTERS', pos: new THREE.Vector3(8.0, 7.5, 1.8) },
        { id: 'dining_recreation', name: 'DINING / RECREATION', pos: new THREE.Vector3(21.0, 7.5, 1.8) },
        { id: 'sea_water_pump_house', name: 'SEA WATER PUMP HOUSE', pos: new THREE.Vector3(-28, 6.2, 16) },
        { id: 'generator_power', name: 'GENERATOR / POWER', pos: new THREE.Vector3(-8.5, 6.8, 16) },
        { id: 'battery_backup', name: 'BATTERY BACKUP', pos: new THREE.Vector3(2.5, 5.8, 16) },
        { id: 'store', name: 'STORE/LOGISTICS', pos: new THREE.Vector3(14, 5.5, 18) },
        { id: 'summer_camp', name: 'SUMMER CAMP', pos: new THREE.Vector3(32, 5.5, 18) },
        { id: 'water_treatment_unit', name: 'WATER TREATMENT UNIT', pos: new THREE.Vector3(35.5, 6.2, -6) },
        { id: 'backup_heater', name: 'BACKUP HEATER', pos: new THREE.Vector3(45, 6.8, -6) }
      ],
      modules: {
        main_entrance: { code: "BHA-01", name: "Main Entrance & Central Airlock", temp: 20.8, power: 6.4, sensors: ["Central Airlock: SEALED", "Ramp Heating: ACTIVE", "Indian National Flag: ILLUMINATED"] },
        laboratories: { code: "BHA-02", name: "Upper Scientific Laboratories", temp: 21.5, power: 32.0, sensors: ["Ionosphere Scintillation: LOCKED", "Aerosol Spectrometer: SAMPLING", "Meteorological Radar: SCANNING", "Clean Room: CLASS 1000"] },
        living_quarters: { code: "BHA-03", name: "Residential Living Quarters", temp: 22.2, power: 24.5, sensors: ["Berths: 28 Winter Crew", "HVAC Zone 1-4: 22.2°C", "Thermal Recovery: 88%"] },
        dining_recreation: { code: "BHA-04", name: "Dining Hall & Recreation Deck", temp: 21.0, power: 20.2, sensors: ["Galley Kitchen: ACTIVE", "Fitness Gym: WARM", "Ocean Panorama Windows: CLEAR"] },
        fuel_storage: { code: "BHA-05", name: "Bunded Bulk Fuel Storage Farm", temp: -6.5, power: 3.8, sensors: ["Vertical Tanks (x4): 194,600 L", "Bund Secondary Containment: 100%", "Trace Heat Line: ACTIVE (-15°C)"] },
        sea_water_pump_house: { code: "BHA-06", name: "Seawater Intake & RO Desalination", temp: 11.5, power: 16.2, sensors: ["Ocean Intake Flow: 18.5 m³/h", "Seawater Temp: -1.6°C", "RO Desalination: 4,800 L/Day"] },
        generator_power: { code: "BHA-07", name: "Primary Cogeneration Power House", temp: 27.5, power: 8.5, sensors: ["MAN DG-1 (250kVA): RUNNING", "MAN DG-2 (250kVA): AUTO-STANDBY", "CHP District Heat: 85 kW Recaptured"] },
        store: { code: "BHA-08", name: "Store/Logistics", temp: 7.0, power: 4.1, sensors: ["ISO Containers (x3): SECURE", "Critical Spares Inventory: 96%", "Snowcat Lubricants: HEATED"] },
        summer_camp: { code: "BHA-09", name: "Summer Polar Expedition Camp", temp: 18.5, power: 7.8, sensors: ["Habitat Containers (x5): OCCUPIED", "Heating Trace: NOMINAL", "Indian Flag: HOISTED"] },
        aws_weather_station: { code: "BHA-10", name: "AWS / Weather Station", temp: -18.2, power: 1.1, sensors: ["Wind Gust: 61.2 km/h", "Barometer: 992.5 hPa", "Solar Irradiance: 160 W/m²", "Sonic Anemometer: ONLINE"] },
        battery_backup: { code: "BHA-11", name: "Battery Backup", temp: 19.0, power: 12.4, sensors: ["BESS Bank (2 Containers): 750 kWh", "State of Charge: 99.1%", "Active Inverter Load: 24 kW", "Cell Voltage Delta: 12 mV"] },
        heating_hvac: { code: "BHA-12", name: "Heating / HVAC", temp: 21.8, power: 24.5, sensors: ["Rooftop Condensers (x6): ACTIVE", "District Heat Recovery: 110 kW", "Circulation Airflow: 1,200 m³/h", "Plenum Balance: 100%"] },
        communication_system: { code: "BHA-13", name: "Communication System", temp: 20.2, power: 7.4, sensors: ["VSAT 3.2m Tracking Dish: LOCKED", "Satellite: GSAT-14 / Inmarsat", "Uplink SNR: 16.8 dB", "Microwave Link: 10 Gbps"] },
        water_treatment_unit: { code: "BHA-14", name: "Water Treatment Unit", temp: 12.8, power: 9.2, sensors: ["Desalination Daily Yield: 4,500 L", "Buffer Storage: 15,000 L", "Multi-stage Media Filtration: NOMINAL", "Water Mineralizer: OPTIMAL"] },
        backup_heater: { code: "BHA-15", name: "Backup Heater", temp: 42.5, power: 3.0, sensors: ["Thermal Capacity: 120 kW", "Standby Burners (x2): READY", "Combustion Air Preheat: ACTIVE", "District Heating Loop: 65°C"] }
      }
    }
  };

  const markerElements = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function initPostProcessing() {
    if (typeof THREE.EffectComposer === 'undefined') {
      console.warn("EffectComposer not loaded, running standard WebGL renderer.");
      isPostProcessingEnabled = false;
      return;
    }

    composer = new THREE.EffectComposer(renderer);

    // 1. Scene Render Pass
    renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 2. Unreal Bloom Pass (calibrated threshold so only bright windows, beacons, and glints glow)
    const res = new THREE.Vector2(window.innerWidth, window.innerHeight);
    bloomPass = new THREE.UnrealBloomPass(res, 0.75, 0.45, 0.82);
    composer.addPass(bloomPass);

    // 3. Filmic ACES Tone Mapping, S-Curve & Lens Vignette Pass
    if (window.CinematicShaders && window.CinematicShaders.FilmicColorGradingShader) {
      filmicPass = new THREE.ShaderPass(CinematicShaders.FilmicColorGradingShader);
      composer.addPass(filmicPass);
    }

    // 4. Tilt-Shift Macro Diorama Focus Pass
    if (window.CinematicShaders && window.CinematicShaders.TiltShiftShader) {
      tiltShiftPass = new THREE.ShaderPass(CinematicShaders.TiltShiftShader);
      tiltShiftPass.uniforms['uResolution'].value.set(window.innerWidth, window.innerHeight);
      composer.addPass(tiltShiftPass);
    }

    // 5. FXAA Sub-Pixel Anti-Aliasing Pass
    if (typeof THREE.FXAAShader !== 'undefined') {
      fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pr);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pr);
      composer.addPass(fxaaPass);
    }
  }

  function init() {
    const container = document.getElementById('canvas-container');

    // Determine target station from URL query parameters (e.g. ?station=bharati or ?station=maitri)
    const urlParams = new URLSearchParams(window.location.search);
    const paramStation = (urlParams.get('station') || '').toLowerCase();
    if (paramStation === 'bharati' || paramStation === 'maitri') {
      currentStation = paramStation;
    }

    // 1. Scene
    scene = new THREE.Scene();

    // 2. Camera
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 600);
    camera.position.copy(stationConfigs[currentStation].cameraPresets.photo.pos);

    // 3. Renderer with ACESFilmic tone mapping & high dynamic range
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.copy(stationConfigs[currentStation].cameraPresets.photo.look);
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 12;
    controls.maxDistance = 280;
    controls.update();

    // 5. Build Environment & Polar Terrain
    envData = PolarEnvironment.setupEnvironment(scene, renderer);
    PolarEnvironment.setEnvironmentMode('twilight', scene);
    const initialEnvText = document.getElementById('env-text');
    if (initialEnvText) initialEnvText.textContent = 'Twilight';

    // Default lighting follows the dashboard theme: dark = Polar Night, light = Twilight
    applyThemeLighting(getDashboardTheme());
    try {
      // switching dark/light on the dashboard re-applies the matching lighting live
      new MutationObserver(() => applyThemeLighting(getDashboardTheme())).observe(
        window.parent.document.documentElement,
        { attributes: true, attributeFilter: ['data-theme'] }
      );
    } catch (e) { /* not embedded / cross-origin: keep default */ }

    // 5b. High-End Post-Processing Pipeline
    initPostProcessing();

    // 6. Build Both 3D Stations
    maitriData = MaitriModel.buildMaitriStation(scene);
    bharatiData = BharatiModel.buildBharatiStation(scene);

    // Set initial station active
    maitriData.stationRoot.visible = (currentStation === 'maitri');
    bharatiData.stationRoot.visible = (currentStation === 'bharati');
    PolarEnvironment.setStationTerrain(currentStation);

    // Update Top Header Metadata
    const config = stationConfigs[currentStation];
    document.title = `${config.title} - 3D Digital Twin | SIH 2026`;
    const titleEl = document.querySelector('.station-title');
    const coordsEl = document.querySelector('.station-coords');
    if (titleEl) titleEl.innerHTML = `${config.title} <span class="twin-tag">DIGITAL TWIN</span>`;
    if (coordsEl) coordsEl.textContent = config.coords;

    // Water controls section visibility in cinematic panel
    const waterSection = document.getElementById('water-controls-section');
    if (waterSection) waterSection.style.display = (currentStation === 'bharati') ? 'block' : 'none';

    // 7. Setup 3D Markers
    rebuild3DLabels(container);

    // 8. Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointerdown', onPointerDown);
    setupUIEventListeners();

    // 9. Initial Telemetry Poll
    pollTelemetry();
    setInterval(pollTelemetry, 2500);

    // 10. Start in the lighter 'balanced' preset
    applyGraphicsPreset('balanced');

    // 11. Start Animation Loop
    animate();
  }

  // Switch between Maitri and Bharati
  function switchStation(stationId) {
    if (currentStation === stationId) return;
    currentStation = stationId;

    // Update Top Switcher active state if switcher buttons exist
    document.querySelectorAll('.switch-station-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.station === stationId);
    });

    // Toggle 3D Models
    maitriData.stationRoot.visible = (stationId === 'maitri');
    bharatiData.stationRoot.visible = (stationId === 'bharati');

    // Toggle Coastal Ocean & Terrain
    PolarEnvironment.setStationTerrain(stationId);

    // Update Top Header Metadata
    const config = stationConfigs[stationId];
    document.title = `${config.title} - 3D Digital Twin | SIH 2026`;
    const titleEl = document.querySelector('.station-title');
    const coordsEl = document.querySelector('.station-coords');
    if (titleEl) titleEl.innerHTML = `${config.title} <span class="twin-tag">DIGITAL TWIN</span>`;
    if (coordsEl) coordsEl.textContent = config.coords;

    // Water controls section visibility in cinematic panel
    const waterSection = document.getElementById('water-controls-section');
    if (waterSection) waterSection.style.display = (stationId === 'bharati') ? 'block' : 'none';

    // Rebuild labels
    const container = document.getElementById('canvas-container');
    rebuild3DLabels(container);

    // Glide camera to default photo view of the selected station
    smoothMoveCamera(config.cameraPresets.photo.pos, config.cameraPresets.photo.look, 1400);

    // Reset failure state & poll fresh telemetry for new station
    pollTelemetry();

    // Re-apply interior lights if turned on
    if (interiorLightsOn) {
      const activeStation = (stationId === 'maitri') ? maitriData : bharatiData;
      if (activeStation && activeStation.setInteriorLights) {
        activeStation.setInteriorLights(true);
      }
    }
  }

  // Build floating HTML 3D Labels for active station
  function rebuild3DLabels(container) {
    markerElements.forEach(m => {
      if (m.element && m.element.parentNode) {
        m.element.parentNode.removeChild(m.element);
      }
    });
    markerElements.length = 0;

    const markers = stationConfigs[currentStation].markers;
    markers.forEach((def) => {
      const el = document.createElement('div');
      el.className = 'marker-3d';
      el.dataset.id = def.id;
      const dotClass = def.dotColor ? `marker-dot ${def.dotColor}` : 'marker-dot';
      el.innerHTML = `
        <div class="marker-box">
          <span class="${dotClass}"></span>
          <span>${def.name}</span>
        </div>
        <div class="marker-stem"></div>
        <div class="marker-target"></div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        focusModule(def.id);
      });

      container.appendChild(el);
      markerElements.push({ element: el, pos: def.pos, id: def.id });
    });
  }



  // Project 3D marker positions to 2D screen coordinates
  function update3DLabels() {
    if (!labelsVisible) {
      markerElements.forEach(m => m.element.style.display = 'none');
      return;
    }

    const tempV = new THREE.Vector3();
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    markerElements.forEach((item) => {
      tempV.copy(item.pos);
      tempV.project(camera);

      if (tempV.z > 1) {
        item.element.style.display = 'none';
        return;
      }

      const x = (tempV.x * widthHalf) + widthHalf;
      const y = -(tempV.y * heightHalf) + heightHalf;

      item.element.style.display = 'flex';
      item.element.style.left = `${x}px`;
      item.element.style.top = `${y}px`;

      if (failureModeActive && (item.id === 'generator_room' || item.id === 'generator_power' || item.id === 'fuel_storage')) {
        item.element.classList.add('alarm');
      } else {
        item.element.classList.remove('alarm');
      }
    });
  }

  // Camera smooth glide / tweening
  function smoothMoveCamera(newPos, newLook, duration = 1200) {
    targetCamPos.copy(newPos);
    targetLookAt.copy(newLook);
    isCameraAnimating = true;

    const startPos = camera.position.clone();
    const startLook = controls.target.clone();
    const startTime = performance.now();

    function tweenStep(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, targetCamPos, ease);
      controls.target.lerpVectors(startLook, targetLookAt, ease);
      controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(tweenStep);
      } else {
        isCameraAnimating = false;
      }
    }
    requestAnimationFrame(tweenStep);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;

    if (event.target.closest('.top-nav, .left-dock, .right-panel, .bottom-bar, .marker-3d, .dock-toggle-btn')) {
      return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const activeStationData = (currentStation === 'maitri') ? maitriData : bharatiData;
    const intersects = raycaster.intersectObjects(activeStationData.interactiveModules, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit && !hit.userData.moduleId && hit.parent) {
        hit = hit.parent;
      }
      if (hit && hit.userData.moduleId) {
        focusModule(hit.userData.moduleId);
      }
    }
  }

  const ROOM_MAP_3D_TO_2D = {
    // Maitri & Shared
    generator_room: 'generator',
    fuel_storage: 'storage',
    battery_backup: 'power',
    water_treatment_unit: 'pump',
    backup_heater: 'hvac',
    heating_hvac: 'hvac',
    aws_weather_station: 'control',
    communication_room: 'control',
    store: 'storage',
    dining_recreation: 'canteen',
    laboratories: 'laboratory',
    living_quarters: 'living',
    workshop: 'utility',
    main_entrance: 'control',
    // Bharati specific
    generator_power: 'generator',
    sea_water_pump_house: 'pump',
    communication_system: 'comms',
    summer_camp: 'living'
  };

  const ROOM_MAP_2D_TO_3D = {
    // Maitri
    generator: 'generator_room',
    power: 'battery_backup',
    pump: 'water_treatment_unit',
    hvac: 'heating_hvac',
    control: 'main_entrance',
    laboratory: 'laboratories',
    living: 'living_quarters',
    storage: 'fuel_storage',
    canteen: 'dining_recreation',
    medical: 'store',
    utility: 'workshop',
    // Bharati
    comms: 'communication_system',
    entrance: 'main_entrance',
    dining: 'dining_recreation',
    fuel_storage_building: 'fuel_storage',
    fuel_storage_tanks: 'fuel_storage'
  };

  let liveTelemetryData = null;

  function getWindDirectionCardinal(degrees) {
    if (degrees == null) return 'ESE';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((degrees % 360) / 22.5)) % 16;
    return directions[idx] || 'ESE';
  }

  function getAuthenticMaitriData(moduleId, data) {
    const defaultInfo = stationConfigs.maitri.modules[moduleId] || stationConfigs.maitri.modules['main_entrance'];
    if (!data) return defaultInfo;

    const d = data;
    switch (moduleId) {
      case 'generator_room': {
        const isFault = d.generator_status !== 'RUNNING';
        return {
          code: 'MAI-06',
          name: 'Generator & Power House',
          temp: d.equipment_temperature != null ? d.equipment_temperature.toFixed(1) : '35.0',
          power: d.power_generation != null ? d.power_generation.toFixed(1) : '80.0',
          heat: d.heating != null ? `${d.heating.toFixed(1)} kW` : 'OPTIMAL',
          health: d.generator_health != null ? Math.round(d.generator_health) : 95,
          status: isFault ? 'CRITICAL ALARM' : 'NOMINAL OPERATION',
          isAlarm: isFault || (d.generator_load > 90) || (d.vibration > 7),
          sensors: [
            `DG-1 Main Engine: ${d.generator_status || 'RUNNING'} (${(d.generator_load || 0).toFixed(1)}% Load)`,
            `Total Power Output: ${(d.power_generation || 0).toFixed(1)} kW`,
            `Engine Core Temperature: ${(d.equipment_temperature || 0).toFixed(1)} °C`,
            `Mechanical Vibration: ${(d.vibration || 0).toFixed(2)} mm/s (Safe < 7.0)`,
            `Operating Cumulative Runtime: ${(d.runtime || 0).toLocaleString()} hrs`,
            `Alternator Health Index: ${(d.generator_health || 0).toFixed(1)}%`,
            `Fuel Tank Level: ${(d.fuel_level || 0).toFixed(1)}%`
          ]
        };
      }

      case 'fuel_storage': {
        const isCritical = (d.fuel_level < 20);
        const isWarning = (d.fuel_level < 40);
        return {
          code: 'MAI-07',
          name: 'Bulk Fuel Storage Farm',
          temp: d.temperature != null ? d.temperature.toFixed(1) : '-14.2',
          power: '1.2',
          heat: (d.temperature < -15) ? 'TRACE ACTIVE' : 'OPTIMAL',
          health: d.fuel_level != null ? Math.round(d.fuel_level) : 75,
          status: isCritical ? 'CRITICAL ALARM' : isWarning ? 'LOW RESERVE' : 'NOMINAL OPERATION',
          isAlarm: isCritical,
          sensors: [
            `Fuel Storage Level: ${(d.fuel_level || 0).toFixed(1)}% Tank Capacity`,
            `Polar Diesel Bulk Reserve: ${Math.round(d.generator_fuel_reserve_l || 0).toLocaleString()} L`,
            `Reserve Autonomy: ${d.generator_fuel_reserve_days_remaining || 0} Days Remaining`,
            `Resupply Risk Level: ${d.resupply_risk || 'NORMAL'}`,
            `Tank Farm Ambient: ${(d.temperature || 0).toFixed(1)} °C`,
            `Estimated Daily Fuel Draw: ${((d.power_consumption || 65) * 24 * 0.3).toFixed(1)} L/day`
          ]
        };
      }

      case 'battery_backup': {
        const isCritical = (d.battery_soc < 20);
        const isWarning = (d.battery_soc < 40);
        return {
          code: 'MAI-11',
          name: 'Battery Backup & ESS',
          temp: '18.5',
          power: d.power_consumption != null ? d.power_consumption.toFixed(1) : '65.0',
          heat: 'OPTIMAL',
          health: d.battery_soc != null ? Math.round(d.battery_soc) : 90,
          status: isCritical ? 'CRITICAL ALARM' : isWarning ? 'LOW SOC' : 'NOMINAL OPERATION',
          isAlarm: isCritical,
          sensors: [
            `State of Charge (SOC): ${(d.battery_soc || 0).toFixed(1)}%`,
            `Accumulated Station Energy: ${(d.energy || 0).toFixed(1)} kWh`,
            `Total Power Demand Draw: ${(d.power_consumption || 0).toFixed(1)} kW`,
            `Critical Systems Powered: ${d.critical_systems_powered ? 'ONLINE (100%)' : 'EMERGENCY SHEDDING'}`,
            `Inverter Bus Voltage: 415V 3-Phase 50Hz`
          ]
        };
      }

      case 'heating_hvac': {
        const isSurge = (d.heating > 65);
        return {
          code: 'MAI-12',
          name: 'Heating / HVAC System',
          temp: d.equipment_temperature != null ? d.equipment_temperature.toFixed(1) : '22.4',
          power: d.heating != null ? d.heating.toFixed(1) : '20.0',
          heat: d.heating != null ? `${d.heating.toFixed(1)} kW` : 'OPTIMAL',
          health: 98,
          status: isSurge ? 'HEATING SURGE' : 'NOMINAL OPERATION',
          isAlarm: isSurge,
          sensors: [
            `Active Heating Thermal Output: ${(d.heating || 0).toFixed(1)} kW`,
            `Heat Exchanger Temp: ${(d.equipment_temperature || 0).toFixed(1)} °C`,
            `Blower Fan Vibration: ${(d.vibration || 0).toFixed(2)} mm/s`,
            `Supply Distribution Loop: 185 L/min`,
            `Habitat Target Comfort Setpoint: 21.0 °C`
          ]
        };
      }

      case 'backup_heater': {
        const isActive = !!d.backup_heater_active;
        return {
          code: 'MAI-14',
          name: 'Emergency Backup Heater',
          temp: isActive ? '65.0' : '18.0',
          power: isActive ? '14.0' : '0.5',
          heat: isActive ? 'AUX HEAT ENGAGED' : 'STANDBY',
          health: d.backup_heater_health != null ? Math.round(d.backup_heater_health) : 97,
          status: isActive ? 'ACTIVE (FIRING)' : 'STANDBY (NOMINAL)',
          isAlarm: false,
          sensors: [
            `Backup Heater Mode: ${isActive ? 'ACTIVE (FIRING)' : 'AUTO-STANDBY'}`,
            `Core Heater Health: ${(d.backup_heater_health || 0).toFixed(1)}%`,
            `Thermal Output Capacity: 85 kW`,
            `Auxiliary Diesel Fuel Trace: READY`,
            `Automatic Failover Interlock: ARMED`
          ]
        };
      }

      case 'water_treatment_unit': {
        const isFault = (d.water_treatment_status !== 'ONLINE' || d.pump_status === 0);
        return {
          code: 'MAI-13',
          name: 'Water Treatment & RO Unit',
          temp: '14.5',
          power: d.pump_status === 1 ? '6.8' : '0.0',
          heat: 'OPTIMAL',
          health: d.water_treatment_health != null ? Math.round(d.water_treatment_health) : 96,
          status: isFault ? 'CRITICAL ALARM' : 'NOMINAL OPERATION',
          isAlarm: isFault,
          sensors: [
            `RO Water Treatment Plant: ${d.water_treatment_status || 'ONLINE'}`,
            `Circulation Pump: ${d.pump_status === 1 ? 'OPERATIONAL (RUNNING)' : 'TRIPPED (OFFLINE FAULT)'}`,
            `Purification System Health: ${(d.water_treatment_health || 0).toFixed(1)}%`,
            `Potable Permeate Yield: 3,200 L/Day`,
            `Effluent Purity Index: 12 ppm TDS`
          ]
        };
      }

      case 'aws_weather_station': {
        return {
          code: 'MAI-10',
          name: 'AWS Polar Weather Station',
          temp: d.temperature != null ? d.temperature.toFixed(2) : '-24.5',
          power: '0.8',
          heat: 'DE-ICE ON',
          health: 100,
          status: 'NOMINAL OPERATION',
          isAlarm: false,
          sensors: [
            `Ambient Polar Temperature: ${(d.temperature || 0).toFixed(2)} °C`,
            `Atmospheric Barometer: ${(d.air_pressure || 0).toFixed(1)} hPa`,
            `Sustained Wind Speed: ${(d.wind_speed || 0).toFixed(1)} km/h`,
            `Wind Direction Azimuth: ${(d.wind_direction || 0).toFixed(0)}° (${getWindDirectionCardinal(d.wind_direction)})`,
            `Relative Air Humidity: ${(d.humidity || 0).toFixed(1)}%`,
            `Meteorological Data Quality: ${d.environment_quality || 'VALID'}`
          ]
        };
      }

      case 'communication_room': {
        const isOffline = (d.communication_equipment_status === 'OFFLINE');
        return {
          code: 'MAI-09',
          name: 'Communications & VSAT Hub',
          temp: '20.0',
          power: '3.8',
          heat: 'OPTIMAL',
          health: d.communication_equipment_health != null ? Math.round(d.communication_equipment_health) : 98,
          status: isOffline ? 'COMMUNICATIONS OFFLINE' : 'NOMINAL OPERATION',
          isAlarm: isOffline,
          sensors: [
            `VSAT Transceiver Status: ${d.communication_equipment_status || 'ONLINE'}`,
            `RF Equipment Health: ${(d.communication_equipment_health || 0).toFixed(1)}%`,
            `Network Operation Mode: ${d.network_status || 'NORMAL'}`,
            `Satellite Uplink Bandwidth: ${(d.network_bandwidth || 0).toFixed(1)} Mbps`,
            `Round-Trip Network Latency: ${d.network_latency || 0} ms`,
            `Packet Loss Rate: ${(d.packet_loss || 0).toFixed(2)}%`,
            `Carrier Signal Strength: ${d.signal_strength || 0} dBm`
          ]
        };
      }

      case 'store': {
        const isCritical = (d.food_status === 'CRITICAL' || d.medicine_status === 'CRITICAL');
        return {
          code: 'MAI-08',
          name: 'Store / Logistics & Medical Reserves',
          temp: d.food_storage_temperature != null ? d.food_storage_temperature.toFixed(1) : '-18.0',
          power: '1.5',
          heat: 'DEEP FREEZE',
          health: 95,
          status: isCritical ? 'CRITICAL ALARM' : 'NOMINAL OPERATION',
          isAlarm: isCritical,
          sensors: [
            `Food Provisions Stock: ${Math.round(d.food_stock_kg || 0)} kg (${d.food_days_remaining || 0} Days)`,
            `Food Deep Freeze Temp: ${(d.food_storage_temperature || 0).toFixed(1)} °C`,
            `Food Supply Status: ${d.food_status || 'NORMAL'} (Risk Level ${d.food_expiry_risk || 0})`,
            `Medical Supplies Inventory: ${Math.round(d.medicine_stock_units || 0)} Units (${d.medicine_days_remaining || 0} Days)`,
            `Medicine Cold Storage: ${(d.medicine_storage_temperature || 0).toFixed(1)} °C`,
            `Medical Stock Status: ${d.medicine_status || 'NORMAL'} (Risk Level ${d.medicine_expiry_risk || 0})`
          ]
        };
      }

      case 'dining_recreation': {
        return {
          code: 'MAI-04',
          name: 'Dining & Recreation Complex',
          temp: '21.5',
          power: '14.5',
          heat: d.heating != null ? `${(d.heating * 0.25).toFixed(1)} kW` : 'OPTIMAL',
          health: 100,
          status: 'NOMINAL OPERATION',
          isAlarm: false,
          sensors: [
            `Daily Food Consumption Rate: ${(d.food_consumption_daily_kg || 20).toFixed(1)} kg/day`,
            `Mess Hall Climate: 21.5 °C`,
            `Kitchen Induction Range: READY`,
            `Fresh Air Ventilation Exchanger: 420 m³/h`,
            `Expedition Crew Common Welfare: NOMINAL`
          ]
        };
      }

      case 'laboratories': {
        return {
          code: 'MAI-02',
          name: 'Scientific Laboratories Complex',
          temp: '21.0',
          power: '18.6',
          heat: 'OPTIMAL',
          health: 99,
          status: 'NOMINAL OPERATION',
          isAlarm: false,
          sensors: [
            `Atmospheric Science Lab: OPERATIONAL`,
            `Clean Lab Environment Temp: 21.0 °C`,
            `Scientific Bus Power Draw: 18.6 kW`,
            `Clean Air HEPA Filtration: NOMINAL`,
            `Magnetometer & Riometer: LOGGING LIVE`
          ]
        };
      }

      case 'living_quarters': {
        return {
          code: 'MAI-03',
          name: 'Residential Living Quarters',
          temp: '22.0',
          power: '12.8',
          heat: d.heating != null ? `${(d.heating * 0.3).toFixed(1)} kW` : 'OPTIMAL',
          health: 100,
          status: 'NOMINAL OPERATION',
          isAlarm: false,
          sensors: [
            `Habitat Living Temp: 22.0 °C`,
            `Expedition Quarters: 25 Winter Scientists`,
            `Fresh Air Exchanger: 450 m³/h`,
            `Radiant Floor Heat Draw: 12.8 kW`,
            `Life Support Integrity: 100% SECURE`
          ]
        };
      }

      case 'workshop': {
        const isHighVib = (d.vibration > 7);
        return {
          code: 'MAI-05',
          name: 'Maintenance Workshop & Utilities',
          temp: d.equipment_temperature != null ? (d.equipment_temperature * 0.6).toFixed(1) : '17.0',
          power: '6.8',
          heat: 'OPTIMAL',
          health: d.vibration != null ? Math.max(0, Math.round(100 - d.vibration * 3)) : 95,
          status: isHighVib ? 'HIGH VIBRATION WARNING' : 'NOMINAL OPERATION',
          isAlarm: isHighVib,
          sensors: [
            `Workshop Equipment Temp: ${(d.equipment_temperature || 0).toFixed(1)} °C`,
            `Structural Vibration Level: ${(d.vibration || 0).toFixed(2)} mm/s`,
            `Aux Machinery Runtime: ${(d.runtime || 0).toLocaleString()} hrs`,
            `Snowcat & Vehicle Bay: STANDBY`,
            `Maintenance Equipment: READY`
          ]
        };
      }

      case 'main_entrance':
      default: {
        return {
          code: 'MAI-01',
          name: 'Main Entrance & Central Portal',
          temp: '19.5',
          power: '4.2',
          heat: 'AIRLOCK CURTAIN',
          health: 100,
          status: 'NOMINAL OPERATION',
          isAlarm: false,
          sensors: [
            `Central Air-Lock Seal: NOMINAL (AIR-TIGHT)`,
            `Entry Passage Heating: ACTIVE`,
            `Central Hub Power Draw: 4.2 kW`,
            `National Flag & Emblem: ILLUMINATED`,
            `Permafrost Foundation Stilts: RIGID`
          ]
        };
      }
    }
  }

  function focusModule(moduleId) {
    activeModuleId = moduleId;
    const markers = stationConfigs[currentStation].markers;
    const marker = markers.find(m => m.id === moduleId);
    if (!marker) return;

    const offset = new THREE.Vector3(18, 16, 22);
    const newPos = marker.pos.clone().add(offset);
    smoothMoveCamera(newPos, marker.pos);
    // Note: Do NOT open module popup panel on 3D canvas; details are displayed in right-side Room Inspector

    // Notify parent React dashboard if embedded - works for BOTH Maitri and Bharati
    if (window.parent && window.parent !== window) {
      const room2d = ROOM_MAP_3D_TO_2D[moduleId] || moduleId;
      window.parent.postMessage({ type: 'SELECT_ROOM', roomId: room2d, moduleId3d: moduleId }, '*');
    }
  }

  function openModulePanel(moduleId) {
    const panel = document.getElementById('module-panel');
    if (!panel) return;
    panel.classList.remove('closed');
    updatePanelContent(moduleId);
  }

  function updatePanelContent(moduleId) {
    const codeEl = document.getElementById('mod-code');
    const nameEl = document.getElementById('mod-name');
    const statusTextEl = document.getElementById('mod-status-text');
    const statusBadgeEl = document.getElementById('mod-status-badge');
    const tempEl = document.getElementById('mod-temp');
    const powerEl = document.getElementById('mod-power');
    const heatEl = document.getElementById('mod-heat');
    const healthEl = document.getElementById('mod-health');
    const customDataEl = document.getElementById('mod-custom-data');
    const alertsContainer = document.getElementById('panel-alerts');
    const recFooter = document.getElementById('recommendation-footer');

    let info;
    if (currentStation === 'maitri') {
      info = getAuthenticMaitriData(moduleId, liveTelemetryData);
    } else {
      const config = stationConfigs[currentStation];
      info = config.modules[moduleId] || config.modules['main_entrance'];
    }

    if (!info) return;

    if (codeEl) codeEl.textContent = info.code || 'MAI';
    if (nameEl) nameEl.textContent = info.name || 'Station Complex';
    if (tempEl) tempEl.innerHTML = `${info.temp}<span class="unit">°C</span>`;
    if (powerEl) powerEl.innerHTML = `${info.power}<span class="unit">kW</span>`;
    if (heatEl) heatEl.textContent = info.heat || 'OPTIMAL';
    if (healthEl) healthEl.innerHTML = `${info.health || 100}<span class="unit">%</span>`;

    const isAlarm = info.isAlarm || failureModeActive;
    if (isAlarm) {
      if (statusBadgeEl) statusBadgeEl.className = 'status-indicator alarm';
      if (statusTextEl) statusTextEl.textContent = info.status || 'CRITICAL ALARM';
      if (alertsContainer) alertsContainer.style.display = 'block';
      if (recFooter) recFooter.style.display = 'block';
    } else {
      if (statusBadgeEl) statusBadgeEl.className = 'status-indicator nominal';
      if (statusTextEl) statusTextEl.textContent = info.status || 'NOMINAL OPERATION';
      if (alertsContainer) alertsContainer.style.display = 'none';
      if (recFooter) recFooter.style.display = 'none';
    }

    if (info.sensors && customDataEl) {
      customDataEl.innerHTML = info.sensors.map(s => `
        <div class="detail-row">
          <span class="d-label">•</span>
          <span class="d-val">${s}</span>
        </div>
      `).join('');
    }
  }

  // Poll real-time telemetry from Python backend for active station
  function pollTelemetry() {
    // Backend URL: passed in by the React app as ?api=..., else same-origin on :5000, else localhost
    const apiParam = new URLSearchParams(window.location.search).get('api');
    const apiBase = (apiParam && /^https?:\/\//.test(apiParam))
      ? apiParam.replace(/\/+$/, '')
      : (window.location.port === '5000') ? '' : 'http://localhost:5000';
    const stationQuery = currentStation.toUpperCase();
    fetch(`${apiBase}/api/data?station=${stationQuery}`)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        handleIncomingTelemetry(data);
      })
      .catch(() => {
        // Fallback to legacy endpoint if needed
        fetch(`${apiBase}/api/telemetry?station=${currentStation}`)
          .then(res => res.json())
          .then(data => handleIncomingTelemetry(data))
          .catch(() => {});
      });
  }

  function handleIncomingTelemetry(data) {
    if (!data) return;
    liveTelemetryData = data;
    updateHUD(data);
    if (activeModuleId) {
      updatePanelContent(activeModuleId);
    }
  }

  // Read the dashboard theme ('dark' by default)
  function getDashboardTheme() {
    try {
      if (window.parent && window.parent !== window) {
        const t = window.parent.document.documentElement.getAttribute('data-theme');
        return t === 'light' ? 'light' : 'dark';
      }
    } catch (e) { /* cross-origin: fall through */ }
    return 'dark';
  }

  // Lighting preset that follows the dashboard theme
  //   dark and light -> both use Twilight (sun elevation 6°)
  function applyThemeLighting(theme) {
    if (!scene) return;
    const elevation = 6;

    PolarEnvironment.setEnvironmentMode('twilight', scene);
    PolarEnvironment.setSunElevation(elevation, scene);

    const envText = document.getElementById('env-text');
    if (envText) envText.textContent = 'Twilight';

    const slider = document.getElementById('slider-sun-elevation');
    const val = document.getElementById('val-sun-elevation');
    if (slider) slider.value = elevation;
    if (val) val.textContent = `${elevation}°`;
    document.querySelectorAll('.solar-preset-btn').forEach((b) => {
      b.classList.toggle('active', parseFloat(b.dataset.elevation) === elevation);
    });
  }

  // Listen for parent messages when embedded in React dashboard
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'TELEMETRY_UPDATE' && event.data.data) {
      handleIncomingTelemetry(event.data.data);
    } else if (event.data.type === 'FOCUS_ROOM' && event.data.roomId) {
      const mod3d = ROOM_MAP_2D_TO_3D[event.data.roomId] || event.data.roomId;
      if (mod3d) {
        focusModule(mod3d);
      }
    } else if (event.data.type === 'SET_STATION' && event.data.station) {
      const targetStation = event.data.station.toLowerCase();
      if (targetStation === 'maitri' || targetStation === 'bharati') {
        switchStation(targetStation);
      }
    }
  });

  function updateHUD(data) {
    if (!data) return;

    const pillStatus = document.getElementById('pill-status');
    const pillTemp = document.getElementById('pill-temp');
    const pillWind = document.getElementById('pill-wind');
    const pillPower = document.getElementById('pill-power');
    const pillFuel = document.getElementById('pill-fuel');

    // Determine status from generator_status, resupply_risk, or failure_mode
    const isCritical = (data.generator_status && data.generator_status !== 'RUNNING') ||
                       (data.status === 'CRITICAL_ALERT') ||
                       (data.failure_mode_active) ||
                       (data.resupply_risk === 'CRITICAL');

    if (isCritical) {
      if (pillStatus) {
        pillStatus.className = 'pill-val status-alarm';
        pillStatus.innerHTML = '<span class="pulse-dot"></span> CRITICAL FAULT';
      }
      failureModeActive = true;
    } else {
      if (pillStatus) {
        pillStatus.className = 'pill-val status-nominal';
        pillStatus.innerHTML = '<span class="pulse-dot"></span> NOMINAL';
      }
      failureModeActive = false;
    }

    // Temperature & Wind
    const tempVal = data.temperature != null ? data.temperature : (data.ambient ? data.ambient.temperature : -24.5);
    const windSpeedVal = data.wind_speed != null ? data.wind_speed : (data.ambient ? data.ambient.wind_speed : 38.0);
    const windDirVal = data.wind_direction != null ? getWindDirectionCardinal(data.wind_direction) : (data.ambient ? data.ambient.wind_direction : 'ESE');

    if (pillTemp) {
      pillTemp.textContent = `${Number(tempVal).toFixed(1)}°C`;
    }
    if (pillWind) {
      pillWind.textContent = `${Number(windSpeedVal).toFixed(1)} km/h ${windDirVal}`;
    }

    // Power
    if (pillPower) {
      const genPower = data.power_generation != null ? data.power_generation :
        (data.generators && data.generators.gen1 ? (data.failure_mode_active ? data.generators.gen2.load_kw : data.generators.gen1.load_kw) : 62.4);
      pillPower.textContent = `${Number(genPower).toFixed(1)} kW`;
    }

    // Fuel
    if (pillFuel) {
      if (data.fuel_level != null) {
        const liters = Math.round(data.generator_fuel_reserve_l || (data.fuel_level * 1200));
        pillFuel.textContent = `${liters.toLocaleString()} L (${Math.round(data.fuel_level)}%)`;
      } else if (data.fuel) {
        const pct = Math.round((data.fuel.current_liters / data.fuel.total_capacity_liters) * 100);
        pillFuel.textContent = `${data.fuel.current_liters.toLocaleString()} L (${pct}%)`;
      }
    }

    const alertsListEl = document.getElementById('alerts-list');
    if (alertsListEl) {
      const alerts = data.alerts || [];
      if (alerts.length > 0) {
        alertsListEl.innerHTML = alerts.map(a => `
          <div class="alert-item"><strong>[${a.level || a.severity || 'ALERT'}]</strong> ${a.message}</div>
        `).join('');
      }
    }

    const btnSim = document.getElementById('btn-sim-failure');
    const btnReset = document.getElementById('btn-sim-reset');
    if (btnSim && btnReset) {
      if (failureModeActive) {
        btnSim.style.display = 'none';
        btnReset.style.display = 'block';
      } else {
        btnSim.style.display = 'flex';
        btnReset.style.display = 'none';
      }
    }
  }

  function setupUIEventListeners() {
    // Station Switcher Buttons
    const btnMaitri = document.getElementById('switch-maitri');
    const btnBharati = document.getElementById('switch-bharati');

    if (btnMaitri) {
      btnMaitri.addEventListener('click', () => switchStation('maitri'));
    }
    if (btnBharati) {
      btnBharati.addEventListener('click', () => switchStation('bharati'));
    }

    // Reset to Photo View button
    const btnResetCam = document.getElementById('btn-reset-cam');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        const preset = stationConfigs[currentStation].cameraPresets.photo;
        smoothMoveCamera(preset.pos, preset.look);
      });
    }

    // Toggle 3D Labels
    const btnLabels = document.getElementById('btn-labels');
    if (btnLabels) {
      btnLabels.addEventListener('click', () => {
        labelsVisible = !labelsVisible;
        btnLabels.classList.toggle('active', labelsVisible);
      });
    }

    // Cycle Subsystem Overlay Modes
    const btnOverlay = document.getElementById('btn-overlay');
    const overlayText = document.getElementById('overlay-text');
    if (btnOverlay) {
      btnOverlay.addEventListener('click', () => {
        if (currentOverlay === 'standard') {
          currentOverlay = 'power';
          if (overlayText) overlayText.textContent = 'Power Grid';
          btnOverlay.classList.add('active');
        } else if (currentOverlay === 'power') {
          currentOverlay = 'thermal';
          if (overlayText) overlayText.textContent = 'Thermal Twin';
          btnOverlay.classList.add('active');
        } else {
          currentOverlay = 'standard';
          if (overlayText) overlayText.textContent = 'Subsystems';
          btnOverlay.classList.remove('active');
        }
        applyOverlayMode(currentOverlay);
      });
    }

    // Cycle Weather / Lighting
    const btnWeather = document.getElementById('btn-weather');
    const envText = document.getElementById('env-text');
    if (btnWeather) {
      btnWeather.addEventListener('click', () => {
        const mode = PolarEnvironment.getMode();
        let nextMode = 'day';
        if (mode === 'day') nextMode = 'twilight';
        else if (mode === 'twilight') nextMode = 'blizzard';
        else nextMode = 'day';

        PolarEnvironment.setEnvironmentMode(nextMode, scene);
        if (envText) envText.textContent = nextMode === 'day' ? 'Polar Day' : (nextMode === 'twilight' ? 'Twilight' : 'Blizzard');
      });
    }

    // =========================================================================
    // CINEMATIC GRAPHICS STUDIO EVENT LISTENERS
    // =========================================================================
    const cinematicPanel = document.getElementById('cinematic-panel');
    const btnCinematic = document.getElementById('btn-cinematic');
    const closeCinematicBtn = document.getElementById('close-cinematic-btn');

    if (btnCinematic && cinematicPanel) {
      btnCinematic.addEventListener('click', () => {
        const isClosed = cinematicPanel.classList.contains('closed');
        if (isClosed) {
          cinematicPanel.classList.remove('closed');
          btnCinematic.classList.add('active');
        } else {
          cinematicPanel.classList.add('closed');
        }
      });
    }

    if (closeCinematicBtn && cinematicPanel) {
      closeCinematicBtn.addEventListener('click', () => {
        cinematicPanel.classList.add('closed');
      });
    }

    // 360° Showcase Turntable Mode Toggle & Speed
    const btnTurntable = document.getElementById('btn-turntable');
    const toggleTurntable = document.getElementById('toggle-turntable');
    const sliderTurntableSpeed = document.getElementById('slider-turntable-speed');
    const valTurntableSpeed = document.getElementById('val-turntable-speed');

    function setTurntable(enabled) {
      isTurntableActive = enabled;
      if (btnTurntable) btnTurntable.classList.toggle('active', enabled);
      if (toggleTurntable) toggleTurntable.checked = enabled;
    }

    if (btnTurntable) {
      btnTurntable.addEventListener('click', () => setTurntable(!isTurntableActive));
    }
    if (toggleTurntable) {
      toggleTurntable.addEventListener('change', (e) => setTurntable(e.target.checked));
    }
    if (sliderTurntableSpeed && valTurntableSpeed) {
      sliderTurntableSpeed.addEventListener('input', (e) => {
        turntableSpeed = parseFloat(e.target.value);
        valTurntableSpeed.textContent = `${turntableSpeed.toFixed(1)}x`;
      });
    }

    // Tilt-Shift Macro Diorama Focus Mode
    const toggleTiltShift = document.getElementById('toggle-tiltshift');
    const sliderTiltShiftY = document.getElementById('slider-tiltshift-y');
    const valTiltShiftY = document.getElementById('val-tiltshift-y');

    if (toggleTiltShift) {
      toggleTiltShift.addEventListener('change', (e) => {
        if (tiltShiftPass && tiltShiftPass.uniforms && tiltShiftPass.uniforms['uEnabled']) {
          tiltShiftPass.uniforms['uEnabled'].value = e.target.checked ? 1.0 : 0.0;
        }
      });
    }
    if (sliderTiltShiftY && valTiltShiftY) {
      sliderTiltShiftY.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valTiltShiftY.textContent = `${Math.round(val * 100)}%`;
        if (tiltShiftPass && tiltShiftPass.uniforms && tiltShiftPass.uniforms['uFocusY']) {
          tiltShiftPass.uniforms['uFocusY'].value = val;
        }
      });
    }

    // Graphics Presets
    document.querySelectorAll('.preset-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyGraphicsPreset(btn.dataset.preset);
      });
    });

    // Post-Processing Parameter Sliders
    const sliderBloom = document.getElementById('slider-bloom');
    const valBloom = document.getElementById('val-bloom');
    if (sliderBloom && valBloom) {
      sliderBloom.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valBloom.textContent = val.toFixed(2);
        if (bloomPass) bloomPass.strength = val;
      });
    }

    const sliderExposure = document.getElementById('slider-exposure');
    const valExposure = document.getElementById('val-exposure');
    if (sliderExposure && valExposure) {
      sliderExposure.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valExposure.textContent = val.toFixed(2);
        if (filmicPass && filmicPass.uniforms && filmicPass.uniforms['uExposure']) {
          filmicPass.uniforms['uExposure'].value = val;
        }
      });
    }

    const sliderContrast = document.getElementById('slider-contrast');
    const valContrast = document.getElementById('val-contrast');
    if (sliderContrast && valContrast) {
      sliderContrast.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valContrast.textContent = val.toFixed(2);
        if (filmicPass && filmicPass.uniforms && filmicPass.uniforms['uContrast']) {
          filmicPass.uniforms['uContrast'].value = val;
        }
      });
    }

    const sliderVignette = document.getElementById('slider-vignette');
    const valVignette = document.getElementById('val-vignette');
    if (sliderVignette && valVignette) {
      sliderVignette.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valVignette.textContent = val.toFixed(2);
        if (filmicPass && filmicPass.uniforms && filmicPass.uniforms['uVignetteDarkness']) {
          filmicPass.uniforms['uVignetteDarkness'].value = val;
        }
      });
    }

    const toggleFxaa = document.getElementById('toggle-fxaa');
    if (toggleFxaa) {
      toggleFxaa.addEventListener('change', (e) => {
        if (fxaaPass) fxaaPass.enabled = e.target.checked;
      });
    }

    // Solar Elevation Slider & Quick Presets
    const sliderSunElevation = document.getElementById('slider-sun-elevation');
    const valSunElevation = document.getElementById('val-sun-elevation');

    if (sliderSunElevation && valSunElevation) {
      sliderSunElevation.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valSunElevation.textContent = `${val}°`;
        PolarEnvironment.setSunElevation(val, scene);
        document.querySelectorAll('.solar-preset-btn').forEach(b => {
          b.classList.toggle('active', Math.abs(parseFloat(b.dataset.elevation) - val) < 6);
        });
      });
    }

    document.querySelectorAll('.solar-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.dataset.elevation);
        if (sliderSunElevation) sliderSunElevation.value = val;
        if (valSunElevation) valSunElevation.textContent = `${val}°`;
        PolarEnvironment.setSunElevation(val, scene);
        document.querySelectorAll('.solar-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Wave Scale Slider for Bharati Station
    const sliderWaveScale = document.getElementById('slider-wave-scale');
    const valWaveScale = document.getElementById('val-wave-scale');
    if (sliderWaveScale && valWaveScale) {
      sliderWaveScale.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valWaveScale.textContent = `${val.toFixed(1)}x`;
        const coastal = scene.getObjectByName("CoastalOcean");
        if (coastal) {
          coastal.traverse((obj) => {
            if (obj.material && obj.material.uniforms && obj.material.uniforms.uWaveScale) {
              obj.material.uniforms.uWaveScale.value = val;
            }
          });
        }
      });
    }
  }

  function applyGraphicsPreset(preset) {
    graphicsPreset = preset;
    document.querySelectorAll('.preset-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });

    const btnCinematic = document.getElementById('btn-cinematic');

    if (preset === 'ultra') {
      isPostProcessingEnabled = true;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      if (bloomPass) {
        bloomPass.enabled = true;
        bloomPass.strength = 0.75;
      }
      if (filmicPass) filmicPass.enabled = true;
      if (tiltShiftPass) tiltShiftPass.enabled = true;
      if (fxaaPass) fxaaPass.enabled = true;
      if (btnCinematic) btnCinematic.classList.add('active');
    } else if (preset === 'balanced') {
      isPostProcessingEnabled = true;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      if (bloomPass) {
        bloomPass.enabled = true;
        bloomPass.strength = 0.45;
      }
      if (filmicPass) filmicPass.enabled = true;
      if (tiltShiftPass) tiltShiftPass.enabled = false;
      if (fxaaPass) fxaaPass.enabled = true;
      if (btnCinematic) btnCinematic.classList.add('active');
    } else if (preset === 'performance') {
      isPostProcessingEnabled = false;
      renderer.setPixelRatio(1.0);
      renderer.shadowMap.enabled = false;
      if (btnCinematic) btnCinematic.classList.remove('active');
    }
    onWindowResize();
  }

  function applyOverlayMode(mode) {
    const activeStationData = (currentStation === 'maitri') ? maitriData : bharatiData;
    activeStationData.interactiveModules.forEach((mesh) => {
      if (!mesh.material) return;
      if (mode === 'power') {
        const isPowerNode = (mesh.userData.moduleId === 'generator_room' || mesh.userData.moduleId === 'generator_power' || mesh.userData.moduleId === 'battery_backup');
        if (isPowerNode) {
          mesh.material.emissive = new THREE.Color(0xffaa00);
          mesh.material.emissiveIntensity = 0.85;
        } else {
          mesh.material.emissive = new THREE.Color(0x0088ff);
          mesh.material.emissiveIntensity = 0.52;
        }
      } else if (mode === 'thermal') {
        if (mesh.userData.moduleId === 'living_quarters' || mesh.userData.moduleId === 'dining_recreation' || mesh.userData.moduleId === 'heating_hvac' || mesh.userData.moduleId === 'backup_heater') {
          mesh.material.emissive = new THREE.Color(0xff4400);
          mesh.material.emissiveIntensity = 0.80;
        } else if (mesh.userData.moduleId === 'store' || mesh.userData.moduleId === 'sea_water_pump_house' || mesh.userData.moduleId === 'water_treatment_unit') {
          mesh.material.emissive = new THREE.Color(0x0044ff);
          mesh.material.emissiveIntensity = 0.75;
        } else {
          mesh.material.emissive = new THREE.Color(0x00bb88);
          mesh.material.emissiveIntensity = 0.45;
        }
      } else {
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0.0;
      }
    });
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const pr = renderer.getPixelRatio();
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
      if (fxaaPass && fxaaPass.material && fxaaPass.material.uniforms && fxaaPass.material.uniforms['resolution']) {
        fxaaPass.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
      }
      if (tiltShiftPass && tiltShiftPass.uniforms && tiltShiftPass.uniforms['uResolution']) {
        tiltShiftPass.uniforms['uResolution'].value.set(window.innerWidth, window.innerHeight);
      }
      if (bloomPass && bloomPass.resolution) {
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (isTurntableActive) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = turntableSpeed;
    } else {
      controls.autoRotate = false;
    }
    controls.update();

    const snowSpeed = failureModeActive ? 2.8 : 1.0;
    PolarEnvironment.updateSnow(envData, delta, snowSpeed);
    PolarEnvironment.updateOcean(delta);

    // Update pulsing aviation hazard lights
    const activeStationData = (currentStation === 'maitri') ? maitriData : bharatiData;
    if (activeStationData && activeStationData.updateBeacons) {
      activeStationData.updateBeacons(elapsedTime);
    }

    update3DLabels();

    // Pulse generator mesh red if alarm active
    if (failureModeActive) {
      const pulse = (Math.sin(elapsedTime * 6) + 1) * 0.5;
      const powerId = (currentStation === 'maitri') ? 'generator_room' : 'generator_power';
      const genMesh = activeStationData.interactiveModules.find(m => m.userData.moduleId === powerId);
      if (genMesh && genMesh.material) {
        genMesh.material.emissive = new THREE.Color(0xff1122);
        genMesh.material.emissiveIntensity = pulse * 0.85;
      }
    }

    if (isPostProcessingEnabled && composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
