/**
 * Polar Environment & Antarctic Terrain System
 * Authentic Schirmacher Oasis Moraine & Larsemann Hills Coastal Plateau
 * PBR Procedural Textures (Albedo, Sobel Normal Map, Roughness Map),
 * Contoured diorama topography, IBL reflections, and dynamic polar atmosphere.
 * SIH 2026 PS #26060 (MoES / NCPOR)
 */

window.PolarEnvironment = (function () {
  let sunLight, hemiLight, ambientLight, snowBounceLight, snowParticles;
  let skyDome, terrainMesh, coastalOceanGroup;
  let oceanMesh = null, oceanMat = null, waterNormalTex1 = null, waterNormalTex2 = null, waterTime = 0;
  const floatingIceCakes = [];
  let currentMode = 'twilight';

  // Procedural PBR Terrain Texture Suite (2048x2048)
  function createPBRTerrainTextures() {
    const size = 1024;

    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const hCtx = heightCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d');

    const dImg = dCtx.createImageData(size, size);
    const hImg = hCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    const dData = dImg.data;
    const hData = hImg.data;
    const rData = rImg.data;

    // Organic island boundary function matching reference photo
    function getMoraineThreshold(angle) {
      // Natural non-circular diorama perimeter shape
      return 0.52 + 
        0.08 * Math.sin(angle * 2.0 + 0.4) + 
        0.05 * Math.cos(angle * 3.0 - 0.8) + 
        0.03 * Math.sin(angle * 5.0 + 1.2) + 
        0.02 * Math.cos(angle * 7.0);
    }

    for (let y = 0; y < size; y++) {
      const ny = (y - size / 2) / (size / 2); // -1 to 1
      for (let x = 0; x < size; x++) {
        const nx = (x - size / 2) / (size / 2); // -1 to 1
        const idx = (y * size + x) * 4;

        const dist = Math.sqrt(nx * nx + ny * ny);
        const angle = Math.atan2(ny, nx);
        const moraineEdge = getMoraineThreshold(angle);

        // Multi-octave natural rock scree noise
        const n1 = Math.sin(x * 0.045) * Math.cos(y * 0.045) * 24;
        const n2 = Math.sin(x * 0.16 + y * 0.11) * 16;
        const n3 = Math.cos(x * 0.38 - y * 0.28) * 12;
        const grain = (Math.random() - 0.5) * 28;

        // Base Antarctic dark moraine gneiss & weathered granite scree
        let r = 88 + n1 + n2 + grain;
        let g = 80 + n1 + n2 + grain;
        let b = 72 + n1 + n3 + grain;
        let h = 120 + n1 + n2 + n3 + grain;
        let rough = 220; // high roughness for scree

        // Natural permafrost polygon cracks across the oasis
        const crack = Math.abs(Math.sin(x * 0.035 + Math.cos(y * 0.045) * 3.2));
        if (crack < 0.035 && dist < moraineEdge) {
          r *= 0.58;
          g *= 0.58;
          b *= 0.58;
          h -= 35;
          rough = 245;
        }

        // Contact Ambient Occlusion shadow under main buildings & stilt pads
        if (Math.abs(nx) < 0.42 && Math.abs(ny) < 0.38) {
          const ao = 0.86 + (Math.random() * 0.08);
          r *= ao;
          g *= ao;
          b *= ao;
        }

        // Sastrugi & Glacial Snow Transition (Outer Perimeter)
        if (dist > moraineEdge - 0.08) {
          const sastrugiWave = (Math.sin(x * 0.025 + y * 0.018) + Math.cos(y * 0.032 - x * 0.015)) * 0.06;
          const snowProgress = Math.min(1.0, Math.max(0.0, (dist - (moraineEdge - 0.08) + sastrugiWave) / 0.18));

          // Pure crystalline Antarctic snow with cool blue subsurface tone
          const snowR = 242 + Math.random() * 10;
          const snowG = 247 + Math.random() * 6;
          const snowB = 255;

          r = r * (1 - snowProgress) + snowR * snowProgress;
          g = g * (1 - snowProgress) + snowG * snowProgress;
          b = b * (1 - snowProgress) + snowB * snowProgress;

          h = h * (1 - snowProgress) + (185 + sastrugiWave * 120) * snowProgress;
          rough = Math.round(rough * (1 - snowProgress) + 55 * snowProgress); // 55 = slick specular glacial ice
        }

        // Snowdrifts nestled inside depressions of the rocky plateau
        const internalDriftNoise = Math.sin(x * 0.065) * Math.cos(y * 0.065);
        if (internalDriftNoise > 0.62 && dist < moraineEdge - 0.06 && dist > 0.22) {
          const factor = (internalDriftNoise - 0.62) * 2.6;
          r = r * (1 - factor) + 242 * factor;
          g = g * (1 - factor) + 248 * factor;
          b = b * (1 - factor) + 255 * factor;
          rough = Math.round(rough * (1 - factor) + 75 * factor);
          h += factor * 25;
        }

        dData[idx] = Math.max(0, Math.min(255, r));
        dData[idx + 1] = Math.max(0, Math.min(255, g));
        dData[idx + 2] = Math.max(0, Math.min(255, b));
        dData[idx + 3] = 255;

        const hClamped = Math.max(0, Math.min(255, h));
        hData[idx] = hClamped;
        hData[idx + 1] = hClamped;
        hData[idx + 2] = hClamped;
        hData[idx + 3] = 255;

        const rClamped = Math.max(0, Math.min(255, rough));
        rData[idx] = rClamped;
        rData[idx + 1] = rClamped;
        rData[idx + 2] = rClamped;
        rData[idx + 3] = 255;
      }
    }

    dCtx.putImageData(dImg, 0, 0);
    hCtx.putImageData(hImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    // Procedural Moraine Scree: 1400 fine stones & gravel boulders on moraine
    for (let i = 0; i < 1400; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rRatio = Math.sqrt(Math.random()) * getMoraineThreshold(angle) * 0.95;
      const bx = (Math.cos(angle) * rRatio * 0.5 + 0.5) * size;
      const by = (Math.sin(angle) * rRatio * 0.5 + 0.5) * size;
      const br = Math.random() * 4.2 + 1.2;

      dCtx.fillStyle = Math.random() > 0.45 ? '#2F2924' : '#4A423B';
      dCtx.beginPath();
      dCtx.arc(bx, by, br, 0, Math.PI * 2);
      dCtx.fill();

      dCtx.fillStyle = 'rgba(10, 8, 6, 0.5)';
      dCtx.beginPath();
      dCtx.arc(bx + 1.2, by + 1.2, br * 0.8, 0, Math.PI * 2);
      dCtx.fill();

      dCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      dCtx.lineWidth = 0.8;
      dCtx.beginPath();
      dCtx.arc(bx, by, br, Math.PI * 0.75, Math.PI * 1.75);
      dCtx.stroke();
    }

    // Sobel Normal Filter for High-Frequency Physical Surface Relief
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const nCtx = normalCanvas.getContext('2d');
    const nImg = nCtx.createImageData(size, size);
    const nData = nImg.data;
    const bumpScale = 2.6;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = (y * size + x) * 4;

        const left = hData[(y * size + (x - 1)) * 4];
        const right = hData[(y * size + (x + 1)) * 4];
        const up = hData[((y - 1) * size + x) * 4];
        const down = hData[((y + 1) * size + x) * 4];

        const dx = (right - left) / 255 * bumpScale;
        const dy = (down - up) / 255 * bumpScale;
        const dz = 1.0;

        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = (-dx / len);
        const ny = (-dy / len);
        const nz = (dz / len);

        nData[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        nData[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        nData[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        nData[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(diffuseCanvas);
    albedoTex.wrapS = THREE.ClampToEdgeWrapping;
    albedoTex.wrapT = THREE.ClampToEdgeWrapping;
    albedoTex.anisotropy = 16;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.wrapS = THREE.ClampToEdgeWrapping;
    normalTex.wrapT = THREE.ClampToEdgeWrapping;
    normalTex.anisotropy = 16;

    const roughnessTex = new THREE.CanvasTexture(roughCanvas);
    roughnessTex.wrapS = THREE.ClampToEdgeWrapping;
    roughnessTex.wrapT = THREE.ClampToEdgeWrapping;
    roughnessTex.anisotropy = 16;

    return {
      map: albedoTex,
      normalMap: normalTex,
      roughnessMap: roughnessTex
    };
  }

  // Create Polar HDR Sky & Reflection Dome
  function createSkyDome(scene) {
    const skyGeo = new THREE.SphereGeometry(320, 32, 24);
    skyGeo.scale(-1, 1, 1);

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 256;
    skyCanvas.height = 512;
    const sCtx = skyCanvas.getContext('2d');

    const grad = sCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#2A6394'); // Zenith polar azure
    grad.addColorStop(0.35, '#5688B6');
    grad.addColorStop(0.7, '#92B9DC'); // Polar horizon ice-blink
    grad.addColorStop(0.92, '#D7E7F6'); // Pure white horizon glint
    grad.addColorStop(1.0, '#EAF3FB');  // Snow bounce reflection
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 512);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
    skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    return skyTex;
  }

  function setupEnvironment(scene, renderer) {
    // 1. Sky Dome & Image-Based Lighting (IBL)
    const skyTex = createSkyDome(scene);
    if (renderer) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const envRT = pmremGenerator.fromEquirectangular(skyTex);
      scene.environment = envRT.texture;
    }

    // 2. High-Definition Contoured Diorama Terrain
    const terrainSize = 220;
    const segments = 180;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);

      let height = 0;
      if (Math.abs(x) < 40 && Math.abs(z) < 32) {
        // Subtle natural rocky plateau undulation matching diorama
        height = (Math.sin(x * 0.22) * Math.cos(z * 0.22)) * 0.22 +
                 (Math.sin(x * 0.55 + z * 0.38) * 0.12) +
                 (Math.cos(x * 1.1 - z * 0.8) * 0.05);
      } else {
        // Natural sloping diorama perimeter with sastrugi wind waves
        const sastrugi = Math.sin(x * 0.16 + z * 0.1) * 0.42;
        height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2.5 +
                 Math.sin(x * 0.1 + z * 0.07) * 1.1 +
                 sastrugi;
        if (dist > 54) {
          height += Math.pow((dist - 54) * 0.065, 1.35);
        }
      }
      pos.setY(i, height);
    }
    terrainGeo.computeVertexNormals();

    const pbrMaps = createPBRTerrainTextures();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: pbrMaps.map,
      normalMap: pbrMaps.normalMap,
      normalScale: new THREE.Vector2(2.0, 2.0),
      roughnessMap: pbrMaps.roughnessMap,
      roughness: 0.72,
      metalness: 0.16
    });

    terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 3. Realistic 3D Moraine Boulders with Directional Snow Caps
    const boulderMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x3E3832, roughness: 0.88, metalness: 0.22 }),
      new THREE.MeshStandardMaterial({ color: 0x544C43, roughness: 0.82, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0x2C2621, roughness: 0.92, metalness: 0.28 })
    ];

    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xF6F9FD,
      roughness: 0.28,
      metalness: 0.12
    });

    for (let r = 0; r < 120; r++) {
      const rx = (Math.random() - 0.5) * 110;
      const rz = (Math.random() - 0.5) * 90;
      if (Math.abs(rx) < 24 && Math.abs(rz) < 16) continue;

      const rockGroup = new THREE.Group();
      const rockRadius = 0.45 + Math.random() * 0.55;
      const rockGeo = new THREE.DodecahedronGeometry(rockRadius, 1);
      const rock = new THREE.Mesh(rockGeo, boulderMaterials[r % boulderMaterials.length]);
      const scale = Math.random() * 0.85 + 0.5;
      rock.scale.set(scale, scale * 0.65, scale);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      rockGroup.add(rock);

      const snowCapGeo = new THREE.SphereGeometry(rockRadius * 0.88 * scale, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
      const snowCap = new THREE.Mesh(snowCapGeo, snowCapMat);
      snowCap.position.y = rockRadius * 0.35 * scale;
      snowCap.castShadow = true;
      rockGroup.add(snowCap);

      rockGroup.position.set(rx, 0.26, rz);
      scene.add(rockGroup);
    }

    // 4. Calibrated High-Definition Lighting Suite
    ambientLight = new THREE.AmbientLight(0xdde8f6, 0.72);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xf4f9ff, 0x766858, 0.62);
    hemiLight.position.set(0, 80, 0);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff9ee, 1.55);
    sunLight.position.set(68, 54, -46);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 230;
    const sD = 66;
    sunLight.shadow.camera.left = -sD;
    sunLight.shadow.camera.right = sD;
    sunLight.shadow.camera.top = sD;
    sunLight.shadow.camera.bottom = -sD;
    sunLight.shadow.bias = -0.0002;
    scene.add(sunLight);

    snowBounceLight = new THREE.DirectionalLight(0xcde1f6, 0.48);
    snowBounceLight.position.set(-60, 20, 52);
    scene.add(snowBounceLight);

    scene.background = new THREE.Color(0xb5c9de);
    scene.fog = new THREE.FogExp2(0xc4d6e9, 0.0030);

    // 5. Drifting Snow Particles
    const snowCount = 1800;
    const snowGeo = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    const snowSpeeds = new Float32Array(snowCount);

    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 170;
      snowPositions[i * 3 + 1] = Math.random() * 52;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 170;
      snowSpeeds[i] = Math.random() * 0.15 + 0.07;
    }

    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));

    const snowCanvas = document.createElement('canvas');
    snowCanvas.width = 32;
    snowCanvas.height = 32;
    const scCtx = snowCanvas.getContext('2d');
    const sGrad = scCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sGrad.addColorStop(0, 'rgba(255,255,255,0.98)');
    sGrad.addColorStop(0.5, 'rgba(240,248,255,0.65)');
    sGrad.addColorStop(1, 'rgba(255,255,255,0)');
    scCtx.fillStyle = sGrad;
    scCtx.fillRect(0, 0, 32, 32);
    const snowTex = new THREE.CanvasTexture(snowCanvas);

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.52,
      map: snowTex,
      transparent: true,
      opacity: 0.76,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    snowParticles = new THREE.Points(snowGeo, snowMat);
    scene.add(snowParticles);

    // 6. Coastal Polar Ocean for Bharati Station (Larsemann Hills / Prydz Bay)
    coastalOceanGroup = new THREE.Group();
    coastalOceanGroup.name = "CoastalOcean";

    // Dual High-Frequency Procedural Ocean Wave Normal Maps
    function createWaveNormalTexture(freq1, freq2, bias) {
      const waveSize = 512;
      const waveCanvas = document.createElement('canvas');
      waveCanvas.width = waveSize;
      waveCanvas.height = waveSize;
      const wCtx = waveCanvas.getContext('2d');
      const wImg = wCtx.createImageData(waveSize, waveSize);
      const wData = wImg.data;
      for (let y = 0; y < waveSize; y++) {
        for (let x = 0; x < waveSize; x++) {
          const idx = (y * waveSize + x) * 4;
          const w1 = Math.sin(x * freq1 + bias) * Math.cos(y * freq1) * 0.45;
          const w2 = Math.sin(x * freq2 + y * (freq2 * 0.85)) * 0.32;
          const w3 = Math.cos(x * (freq1 * 2.2) - y * (freq2 * 1.4)) * 0.18;
          const nx = w1 + w2 + w3;
          const ny = Math.cos(x * freq1 + y * freq2) * 0.38;
          wData[idx] = Math.round((nx * 0.5 + 0.5) * 255);
          wData[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
          wData[idx + 2] = 248;
          wData[idx + 3] = 255;
        }
      }
      wCtx.putImageData(wImg, 0, 0);
      const tex = new THREE.CanvasTexture(waveCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 7);
      return tex;
    }

    waterNormalTex1 = createWaveNormalTexture(0.08, 0.16, 0.0);
    waterNormalTex2 = createWaveNormalTexture(0.14, 0.28, 1.2);

    const oceanGeo = new THREE.PlaneGeometry(180, 160, 96, 96);
    oceanGeo.rotateX(-Math.PI / 2);

    if (window.CinematicShaders && window.CinematicShaders.PhysicalOceanShader) {
      const shaderDef = window.CinematicShaders.PhysicalOceanShader;
      oceanMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(shaderDef.uniforms),
        vertexShader: shaderDef.vertexShader,
        fragmentShader: shaderDef.fragmentShader,
        transparent: true,
        depthWrite: true
      });
      oceanMat.uniforms.uNormalMap1.value = waterNormalTex1;
      oceanMat.uniforms.uNormalMap2.value = waterNormalTex2;
      oceanMat.uniforms.uSunPosition.value.copy(sunLight.position);
      oceanMat.uniforms.uSunColor.value.copy(sunLight.color);
    } else {
      oceanMat = new THREE.MeshStandardMaterial({
        color: 0x0A355E,
        normalMap: waterNormalTex1,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.06,
        metalness: 0.92,
        transparent: true,
        opacity: 0.96
      });
    }

    oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.set(-60, -2.5, 30);
    oceanMesh.receiveShadow = true;
    coastalOceanGroup.add(oceanMesh);

    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xF3F8FF,
      roughness: 0.18,
      metalness: 0.14
    });

    floatingIceCakes.length = 0;
    for (let i = 0; i < 28; i++) {
      const iceRadius = 0.9 + Math.random() * 2.8;
      const iceGeo = new THREE.CylinderGeometry(iceRadius, iceRadius * 1.06, 0.42, 6 + Math.floor(Math.random() * 4));
      const iceCake = new THREE.Mesh(iceGeo, iceMat);
      const ix = -32 - Math.random() * 56;
      const iz = 5 + Math.random() * 54;
      const baseY = -2.32;
      iceCake.position.set(ix, baseY, iz);
      iceCake.rotation.y = Math.random() * Math.PI;
      iceCake.castShadow = true;
      coastalOceanGroup.add(iceCake);
      floatingIceCakes.push({ mesh: iceCake, baseY: baseY, phase: Math.random() * Math.PI * 2 });
    }

    // Wet Dark Basalt Shoreline Boulders lining Prydz Bay coast matching photo
    const wetRockMat = new THREE.MeshStandardMaterial({
      color: 0x1E242B,
      roughness: 0.16,
      metalness: 0.82
    });
    for (let b = 0; b < 48; b++) {
      const bx = -20 - Math.random() * 26;
      const bz = 4 + Math.random() * 44;
      const br = 0.55 + Math.random() * 0.75;
      const bMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(br, 1), wetRockMat);
      bMesh.position.set(bx, -2.1 + (Math.random() * 0.5), bz);
      bMesh.scale.set(1.1, 0.65, 1.1);
      bMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      bMesh.castShadow = true;
      coastalOceanGroup.add(bMesh);
    }

    coastalOceanGroup.visible = false;
    scene.add(coastalOceanGroup);

    return {
      sunLight,
      ambientLight,
      hemiLight,
      snowBounceLight,
      snowParticles,
      snowSpeeds,
      skyDome,
      coastalOceanGroup
    };
  }

  function updateSnow(snowObj, delta = 0.016, speedMultiplier = 1.0) {
    if (!snowObj || !snowObj.snowParticles) return;
    const pos = snowObj.snowParticles.geometry.attributes.position;
    const count = pos.count;
    const speeds = snowObj.snowSpeeds;

    for (let i = 0; i < count; i++) {
      let y = pos.getY(i);
      let x = pos.getX(i);
      let z = pos.getZ(i);

      y -= speeds[i] * speedMultiplier * 14 * delta;
      x -= (speeds[i] * 26 + 8) * speedMultiplier * delta;

      if (y < 0) {
        y = 48 + Math.random() * 6;
        x = (Math.random() - 0.5) * 170;
        z = (Math.random() - 0.5) * 170;
      }
      if (x < -85) x = 85;

      pos.setY(i, y);
      pos.setX(i, x);
    }
    pos.needsUpdate = true;
  }

  function setEnvironmentMode(mode, scene) {
    currentMode = mode;
    if (mode === 'day') {
      scene.background.setHex(0xb5c9de);
      scene.fog.color.setHex(0xc4d6e9);
      scene.fog.density = 0.0030;
      sunLight.color.setHex(0xfff9ee);
      sunLight.intensity = 1.55;
      sunLight.position.set(68, 54, -46);
      ambientLight.color.setHex(0xdde8f6);
      ambientLight.intensity = 0.72;
      hemiLight.color.setHex(0xf4f9ff);
      hemiLight.groundColor.setHex(0x766858);
    } else if (mode === 'twilight') {
      scene.background.setHex(0x1a2638);
      scene.fog.color.setHex(0x22334a);
      scene.fog.density = 0.0055;
      sunLight.color.setHex(0xff8844);
      sunLight.intensity = 0.95;
      sunLight.position.set(85, 18, -25);
      ambientLight.color.setHex(0x3a4f6d);
      ambientLight.intensity = 0.52;
      hemiLight.color.setHex(0xffaa77);
      hemiLight.groundColor.setHex(0x2d3a4d);
    } else if (mode === 'blizzard') {
      scene.background.setHex(0x0a111a);
      scene.fog.color.setHex(0x0e1722);
      scene.fog.density = 0.016;
      sunLight.color.setHex(0x5c7c99);
      sunLight.intensity = 0.35;
      ambientLight.color.setHex(0x1b2838);
      ambientLight.intensity = 0.42;
      hemiLight.color.setHex(0x00e676);
      hemiLight.groundColor.setHex(0x0c141e);
    }
  }

  function setStationTerrain(stationId) {
    if (coastalOceanGroup) {
      coastalOceanGroup.visible = (stationId === 'bharati');
    }
  }

  function updateOcean(delta) {
    waterTime += delta;
    if (oceanMat && oceanMat.uniforms) {
      oceanMat.uniforms.uTime.value = waterTime;
      if (sunLight) {
        oceanMat.uniforms.uSunPosition.value.copy(sunLight.position);
        oceanMat.uniforms.uSunColor.value.copy(sunLight.color);
      }
    } else if (waterNormalTex1) {
      waterNormalTex1.offset.x = (waterTime * 0.02) % 1.0;
      waterNormalTex1.offset.y = (waterTime * 0.015) % 1.0;
    }

    // Dynamic bobbing & rocking for floating ice cakes
    floatingIceCakes.forEach((item) => {
      const bob = Math.sin(waterTime * 1.5 + item.phase) * 0.07;
      item.mesh.position.y = item.baseY + bob;
      item.mesh.rotation.z = Math.sin(waterTime * 1.1 + item.phase) * 0.035;
      item.mesh.rotation.x = Math.cos(waterTime * 0.9 + item.phase) * 0.025;
    });
  }

  function setSunElevation(degrees, scene) {
    if (!sunLight) return;
    const rad = (degrees * Math.PI) / 180;
    const dist = 94;
    const sunX = Math.cos(rad) * 68;
    const sunY = Math.sin(rad) * dist;
    const sunZ = -Math.cos(rad) * 46;
    sunLight.position.set(sunX, Math.max(sunY, 1.5), sunZ);

    // Multi-stage Antarctic atmospheric light calibration
    if (degrees >= 35) {
      // Polar Midday (High Sun)
      const factor = Math.min((degrees - 35) / 35, 1.0);
      sunLight.color.setRGB(1.0, 0.98, 0.93);
      sunLight.intensity = 1.55 + factor * 0.2;
      ambientLight.color.setRGB(0.87, 0.91, 0.97);
      ambientLight.intensity = 0.72;
      if (scene) {
        scene.background.setRGB(0.71, 0.79, 0.87);
        scene.fog.color.setRGB(0.77, 0.84, 0.91);
        scene.fog.density = 0.0030;
      }
    } else if (degrees >= 12) {
      // Golden Hour (dramatic polar grazing sunlight & warm long shadows)
      const factor = (degrees - 12) / 23;
      sunLight.color.setRGB(1.0, 0.70 + factor * 0.26, 0.36 + factor * 0.55);
      sunLight.intensity = 1.85 - factor * 0.25;
      ambientLight.color.setRGB(0.52 + factor * 0.32, 0.60 + factor * 0.28, 0.75 + factor * 0.2);
      ambientLight.intensity = 0.60;
      if (scene) {
        scene.background.setRGB(0.42 + factor * 0.26, 0.52 + factor * 0.24, 0.70 + factor * 0.15);
        scene.fog.color.setRGB(0.52 + factor * 0.23, 0.60 + factor * 0.22, 0.76 + factor * 0.13);
        scene.fog.density = 0.0036;
      }
    } else if (degrees >= 3) {
      // Low twilight / polar dusk
      const factor = (degrees - 3) / 9;
      sunLight.color.setRGB(1.0, 0.44, 0.20);
      sunLight.intensity = 1.15 + factor * 0.5;
      ambientLight.color.setRGB(0.24, 0.32, 0.48);
      ambientLight.intensity = 0.48;
      if (scene) {
        scene.background.setRGB(0.12, 0.18, 0.28);
        scene.fog.color.setRGB(0.16, 0.23, 0.34);
        scene.fog.density = 0.0055;
      }
    } else {
      // Polar night
      sunLight.color.setRGB(0.35, 0.45, 0.65);
      sunLight.intensity = 0.25;
      ambientLight.color.setRGB(0.12, 0.16, 0.24);
      ambientLight.intensity = 0.38;
      if (scene) {
        scene.background.setRGB(0.04, 0.07, 0.12);
        scene.fog.color.setRGB(0.06, 0.09, 0.15);
        scene.fog.density = 0.0075;
      }
    }

    if (oceanMat && oceanMat.uniforms) {
      oceanMat.uniforms.uSunPosition.value.copy(sunLight.position);
      oceanMat.uniforms.uSunColor.value.copy(sunLight.color);
    }
  }

  return {
    setupEnvironment,
    updateSnow,
    updateOcean,
    setSunElevation,
    setEnvironmentMode,
    setStationTerrain,
    getMode: () => currentMode
  };
})();
