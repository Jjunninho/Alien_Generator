// ============================================================
// MODULE 4: ALIEN GENERATOR
// ============================================================
const AlienGenerator = (() => {

  const HEAD_SHAPES = ['oval', 'wide', 'tall', 'triangular', 'bulbous', 'squished'];
  const MOUTH_TYPES = ['tiny', 'huge', 'fanged', 'tentacle', 'sucker', 'zigzag'];
  const ANTENNA_TYPES = ['none', 'single_ball', 'double_droopy', 'triple_spiky', 'curled', 'branched'];

  /**
   * Generate an alien genome (all traits) from a seed.
   * This is pure data — no drawing involved.
   */
  function generateGenome(seed, overrides = {}) {
    const rng = PRNG.create(seed);

    // Global grotesque multipliers from UI
    const asymmetryFactor = (overrides.asymmetry ?? 60) / 100;
    const noiseLevel      = (overrides.noise ?? 50) / 100;
    const mutationLevel   = (overrides.mutation ?? 40) / 100;
    const slimeLevel      = (overrides.slime ?? 50) / 100;

    const headShape   = rng.pick(HEAD_SHAPES);
    const eyeCount    = rng.int(1, 4);
    const eyeSize     = rng.int(1, 3);
    const mouthType   = rng.pick(MOUTH_TYPES);
    const antennaType = overrides.antenna !== false ? rng.pick(ANTENNA_TYPES) : 'none';

    // Body proportions
    const bodyW  = rng.int(6, 10);
    const bodyH  = rng.int(5, 9);
    const headRx = rng.int(4, 8);
    const headRy = (() => {
      if (headShape === 'tall')        return rng.int(6, 9);
      if (headShape === 'wide')        return rng.int(3, 5);
      if (headShape === 'triangular')  return rng.int(4, 6);
      if (headShape === 'bulbous')     return rng.int(7, 10);
      if (headShape === 'squished')    return rng.int(2, 4);
      return rng.int(5, 8);
    })();

    // Asymmetry offsets (per feature)
    const asymLeft  = overrides.asym !== false ? rng.float(-asymmetryFactor * 2, asymmetryFactor * 2) : 0;
    const asymRight = overrides.asym !== false ? rng.float(-asymmetryFactor * 2, asymmetryFactor * 2) : 0;
    const asymEyeL  = overrides.asym !== false ? rng.float(-asymmetryFactor, asymmetryFactor) : 0;
    const asymEyeR  = overrides.asym !== false ? rng.float(-asymmetryFactor, asymmetryFactor) : 0;

    // Eye data
    const eyes = [];
    for (let i = 0; i < eyeCount; i++) {
      eyes.push({
        size:   rng.int(1, Math.max(1, eyeSize + Math.round(rng.float(-1, 1)))),
        pupilSize: rng.int(1, 2),
        offset: rng.float(-0.5, 0.5),
        vertOffset: rng.float(-0.3, 0.3),
      });
    }

    // Noise pixels (bumps, scars, texture)
    const noiseCount = Math.floor(noiseLevel * 18 + mutationLevel * 10);
    const noisePixels = [];
    for (let i = 0; i < noiseCount; i++) {
      noisePixels.push({
        x: rng.float(-1, 1),
        y: rng.float(-1, 1),
        type: rng.pick(['dark','light','scar','bump']),
      });
    }

    // Slime drips
    const slimeDrips = [];
    if (overrides.slime !== false && slimeLevel > 0.1) {
      const dripCount = rng.int(0, Math.floor(slimeLevel * 5));
      for (let i = 0; i < dripCount; i++) {
        slimeDrips.push({
          x: rng.float(-0.7, 0.7),
          len: rng.int(1, 3),
          thick: rng.bool(0.4),
        });
      }
    }

    // Scars
    const scars = [];
    if (overrides.scars !== false) {
      const scarCount = rng.int(0, Math.floor(mutationLevel * 4));
      for (let i = 0; i < scarCount; i++) {
        scars.push({
          x: rng.float(-0.6, 0.6),
          y: rng.float(-0.6, 0.6),
          angle: rng.float(0, Math.PI),
          len: rng.int(1, 3),
        });
      }
    }

    // Mouth data
    const mouthData = {
      type: mouthType,
      width: rng.int(2, 6),
      y: rng.float(0.2, 0.65),
      asymm: overrides.asym !== false ? rng.float(-1, 1) * asymmetryFactor : 0,
      toothCount: rng.int(2, 6),
    };

    const palette = Palette.generate(rng);

    return {
      seed, headShape, eyeCount, eyeSize, mouthType, antennaType,
      bodyW, bodyH, headRx, headRy,
      asymLeft, asymRight, asymEyeL, asymEyeR,
      eyes, noisePixels, slimeDrips, scars, mouthData,
      palette, noiseLevel, mutationLevel, asymmetryFactor, slimeLevel,
    };
  }

  /**
   * Render a genome onto an ImageData object.
   * size = pixel size of canvas (e.g. 24)
   * frameData: {frame, totalFrames} for animation
   */
  function renderGenome(genome, size, ctx, offsetX = 0, offsetY = 0, frameInfo = {frame:0, total:1}) {
    const { palette: pal } = genome;
    const imgData = ctx.createImageData ? ctx.createImageData(size, size) : null;

    // We'll draw directly to ctx using drawImage of a tmp canvas
    const tmp = document.createElement('canvas');
    tmp.width = size; tmp.height = size;
    const tc = tmp.getContext('2d');
    const id = tc.createImageData(size, size);
    id.height = size; // patch for setPixel bounds check

    const W = size;
    const cx = Math.floor(size / 2);

    // Animation offsets
    const { frame, total } = frameInfo;
    const animT = frame / Math.max(total - 1, 1);  // 0..1
    // Frames: 0=idle, 1=blink, 2=breathe, 3=twitch
    const frameType = Math.floor(frame / Math.max(1, total / 4));
    let breathOffset = 0, blinkScale = 1, twitchX = 0;
    if (frameType === 2) breathOffset = Math.round(Math.sin(animT * Math.PI) * 1);
    if (frameType === 1) blinkScale = 0.15;
    if (frameType === 3) twitchX = (animT < 0.5 ? 1 : -1);

    // ---- LAYOUT CONSTANTS ----
    // Anatomy (top→bottom): [antenna gap] [head] [neck] [body]
    // Reserve top ~20% for antennae, head occupies middle, body at bottom
    const hrx = genome.headRx / 2;
    const hry = genome.headRy / 2;
    const brx = genome.bodyW / 2;
    const bry = genome.bodyH / 2;

    // Head center: upper portion of canvas
    // antennaTop=0..size*0.15, head from ~0.18 to ~0.58
    const hx = cx;
    const hy = Math.floor(size * 0.18 + hry) + breathOffset;   // head center Y

    // Body center: below the head, near bottom
    const bx = cx;
    const by = Math.floor(hy + hry + 1 + bry) + breathOffset;  // sits right under head

    // ---- BODY (draw first so head renders on top) ----
    PixelDraw.fillEllipse(id, W, bx, by, brx, bry, pal.body1);
    PixelDraw.fillEllipse(id, W, bx, by, brx - 1, bry - 1, pal.body2);
    // Body highlight
    PixelDraw.fillEllipse(id, W, bx - Math.floor(brx/3), by - Math.floor(bry/3), 1, 1, pal.highlight);

    // ---- NECK ----
    const neckW = Math.max(2, Math.floor(genome.bodyW / 3));
    const neckY = hy + Math.floor(hry * 0.85);
    const neckH = Math.max(1, by - Math.floor(bry * 0.9) - neckY);
    PixelDraw.fillRect(id, W, cx - Math.floor(neckW/2), neckY, neckW, neckH, pal.body1);

    // ---- HEAD ----
    // Head shape deform for triangular: wide top, narrow bottom (alien chin)
    if (genome.headShape === 'triangular') {
      for (let row = 0; row < hry * 2; row++) {
        const frac = row / (hry * 2);
        // Wide at top, narrows toward chin
        const rowW = Math.round(hrx * 2 * (1 - frac * 0.55));
        const rx2 = rowW / 2;
        for (let col = -rx2; col <= rx2; col++) {
          const px = Math.round(hx + col), py = Math.round(hy - hry + row);
          PixelDraw.setPixel(id, W, px, py, pal.body2);
        }
      }
    } else {
      PixelDraw.fillEllipse(id, W, hx, hy, hrx, hry, pal.body2);
    }
    // Head shading (darker lower-right quadrant for depth)
    PixelDraw.fillEllipse(id, W, hx + Math.floor(hrx/3), hy + Math.floor(hry/3), hrx/2, hry/2, pal.body1);
    // Head highlight (upper-left)
    PixelDraw.fillEllipse(id, W, hx - Math.floor(hrx/3), hy - Math.floor(hry/4), 1, 1, pal.highlight, 200);

    // ---- EYES ----
    const eyeCount = genome.eyes.length;
    const eyeSpacing = (hrx * 1.4) / (eyeCount + 1);
    for (let i = 0; i < eyeCount; i++) {
      const eye = genome.eyes[i];
      const ex = Math.round(hx - hrx * 0.6 + eyeSpacing * (i + 1) + eye.offset * hrx + (i === 0 ? genome.asymEyeL : genome.asymEyeR));
      // Eyes sit in the CENTER to slightly upper area of the head (not the chin)
      const ey = Math.round(hy - hry * 0.1 + eye.vertOffset * hry * 0.6);
      const er = eye.size;
      const ep = eye.pupilSize;

      // Eye white
      if (blinkScale > 0.5) {
        PixelDraw.fillEllipse(id, W, ex, ey, er, Math.max(1, Math.round(er * blinkScale)), pal.eyeWhite);
        // Iris
        PixelDraw.fillEllipse(id, W, ex, ey, Math.max(1, er - 0), Math.max(1, Math.round((er - 0) * blinkScale)), pal.eye);
        // Pupil
        if (er > 1) PixelDraw.fillEllipse(id, W, ex + twitchX, ey, ep, Math.round(ep * blinkScale), pal.eyePupil);
        // Highlight
        if (er >= 2) PixelDraw.setPixel(id, W, ex - 1, ey - 1, pal.highlight);
      } else {
        // Blink frame — just a line
        PixelDraw.drawLine(id, W, ex - er, ey, ex + er, ey, pal.outline);
      }
    }

    // ---- MOUTH ----
    const { mouthData: md } = genome;
    const mx = Math.round(hx + md.asymm);
    // Mouth in lower half of head: hy + 30%..65% of hry
    const my = Math.round(hy + hry * 0.3 + (hry * 0.35) * md.y);
    const mw = Math.max(1, Math.floor(md.width / 2));

    if (md.type === 'tiny') {
      PixelDraw.fillRect(id, W, mx - 1, my, 2, 1, pal.mouth);

    } else if (md.type === 'huge') {
      PixelDraw.fillEllipse(id, W, mx, my, mw, Math.max(1, Math.round(mw * 0.7)), pal.mouth);
      PixelDraw.fillEllipse(id, W, mx, my, mw - 1, Math.max(1, Math.round((mw-1) * 0.5)), pal.tongue);

    } else if (md.type === 'fanged') {
      PixelDraw.fillRect(id, W, mx - mw, my, mw * 2, 2, pal.mouth);
      // Draw teeth
      for (let t = 0; t < Math.min(md.toothCount, mw * 2); t += 2) {
        PixelDraw.setPixel(id, W, mx - mw + t, my + 1, pal.teeth);
        PixelDraw.setPixel(id, W, mx - mw + t, my + 2, pal.teeth);
      }

    } else if (md.type === 'tentacle') {
      // Horizontal slit + dripping tentacles
      PixelDraw.fillRect(id, W, mx - mw, my, mw * 2, 1, pal.outline);
      for (let t = 0; t < Math.min(3, mw); t++) {
        const tx = mx - Math.floor(mw/2) + t * Math.floor(mw/2);
        const tl = genome.eyes.length > 2 ? 2 : 1;
        for (let dy = 1; dy <= tl; dy++) {
          PixelDraw.setPixel(id, W, tx + (dy%2), my + dy, pal.slime);
        }
      }

    } else if (md.type === 'sucker') {
      PixelDraw.fillEllipse(id, W, mx, my, mw, mw, pal.mouth);
      PixelDraw.fillEllipse(id, W, mx, my, mw - 1, mw - 1, pal.body1);
      PixelDraw.fillEllipse(id, W, mx, my, 1, 1, pal.outline);

    } else if (md.type === 'zigzag') {
      for (let zx = mx - mw; zx < mx + mw; zx += 2) {
        PixelDraw.setPixel(id, W, zx,     my,     pal.mouth);
        PixelDraw.setPixel(id, W, zx + 1, my + 1, pal.mouth);
      }
    }

    // ---- ANTENNA ----
    const at = genome.antennaType;
    if (at !== 'none') {
      const baseX = Math.round(hx + genome.asymLeft);
      const baseY = Math.round(hy - hry);

      if (at === 'single_ball') {
        PixelDraw.drawLine(id, W, baseX, baseY, baseX, baseY - 4, pal.body1);
        PixelDraw.fillEllipse(id, W, baseX, baseY - 5, 2, 2, pal.eye);
        PixelDraw.setPixel(id, W, baseX, baseY - 5, pal.highlight);

      } else if (at === 'double_droopy') {
        [-2, 2].forEach((ox, idx) => {
          const ax = baseX + ox;
          const ay = baseY - 1;
          // Drooping curve
          for (let seg = 0; seg < 4; seg++) {
            const nx = ax + Math.round(Math.sin(seg * 0.8) * (idx === 0 ? -1 : 1));
            PixelDraw.setPixel(id, W, nx, ay - seg, pal.body2);
          }
          PixelDraw.fillEllipse(id, W, ax + (idx === 0 ? -1 : 1), ay - 4, 1, 1, pal.eye);
        });

      } else if (at === 'triple_spiky') {
        [-2, 0, 2].forEach((ox, idx) => {
          const ax = baseX + ox;
          PixelDraw.drawLine(id, W, ax, baseY, ax + (ox > 0 ? 1 : ox < 0 ? -1 : 0), baseY - 4, pal.body3);
          PixelDraw.setPixel(id, W, ax + (ox > 0 ? 2 : ox < 0 ? -2 : 0), baseY - 5, pal.highlight);
        });

      } else if (at === 'curled') {
        for (let ang = 0; ang < 180; ang += 15) {
          const rad = ang * Math.PI / 180;
          const ax = Math.round(baseX + Math.cos(rad) * 2 - 1);
          const ay = Math.round(baseY - 2 - Math.sin(rad) * 3);
          PixelDraw.setPixel(id, W, ax, ay, pal.body3);
        }
        PixelDraw.fillEllipse(id, W, baseX, baseY - 5, 1, 1, pal.eye);

      } else if (at === 'branched') {
        PixelDraw.drawLine(id, W, baseX, baseY, baseX, baseY - 3, pal.body2);
        PixelDraw.drawLine(id, W, baseX, baseY - 3, baseX - 2, baseY - 5, pal.body2);
        PixelDraw.drawLine(id, W, baseX, baseY - 3, baseX + 2, baseY - 5, pal.body2);
        PixelDraw.setPixel(id, W, baseX - 2, baseY - 5, pal.eye);
        PixelDraw.setPixel(id, W, baseX + 2, baseY - 5, pal.eye);
      }
    }

    // ---- SLIME DRIPS — hang from bottom of head downward ----
    genome.slimeDrips.forEach(drip => {
      const dx = Math.round(hx + drip.x * hrx);
      const dy = hy + Math.floor(hry * 0.85);  // start at bottom edge of head
      for (let l = 0; l < drip.len; l++) {
        PixelDraw.setPixel(id, W, dx, dy + l, pal.slime, 200);
        if (drip.thick && l < drip.len - 1) {
          PixelDraw.setPixel(id, W, dx + 1, dy + l, pal.slime, 150);
        }
      }
      // Drip bubble at end
      PixelDraw.setPixel(id, W, dx, dy + drip.len, pal.slime, 120);
    });

    // ---- SCARS ----
    genome.scars.forEach(scar => {
      const sx = Math.round(hx + scar.x * hrx);
      const sy = Math.round(hy + scar.y * hry);
      const ex = Math.round(sx + Math.cos(scar.angle) * scar.len);
      const ey = Math.round(sy + Math.sin(scar.angle) * scar.len);
      PixelDraw.drawLine(id, W, sx, sy, ex, ey, pal.scar);
    });

    // ---- NOISE / BUMPS ----
    genome.noisePixels.forEach(np => {
      const px = Math.round(hx + np.x * hrx);
      const py = Math.round(hy + np.y * hry);
      if (np.type === 'dark')   PixelDraw.setPixel(id, W, px, py, pal.body1, 180);
      if (np.type === 'light')  PixelDraw.setPixel(id, W, px, py, pal.highlight, 120);
      if (np.type === 'scar')   PixelDraw.setPixel(id, W, px, py, pal.scar, 200);
      if (np.type === 'bump')   PixelDraw.fillEllipse(id, W, px, py, 1, 1, pal.body3, 160);
    });

    // ---- OUTLINE (post-process) ----
    // For every filled pixel, if adjacent to empty — draw outline
    const outlineData = tc.createImageData(size, size);
    outlineData.height = size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const alpha = id.data[idx + 3];
        if (alpha < 10) {
          // Check neighbors
          const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1],[x-1,y-1],[x+1,y-1],[x-1,y+1],[x+1,y+1]];
          let hasNeighbor = false;
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
              if (id.data[(ny * size + nx) * 4 + 3] > 10) { hasNeighbor = true; break; }
            }
          }
          if (hasNeighbor) PixelDraw.setPixel(id, W, x, y, pal.outline, 255);
        }
      }
    }

    // Blit to tmp canvas
    tc.putImageData(id, 0, 0);

    // Draw to main ctx (invertido verticalmente)
    ctx.save();
    ctx.translate(offsetX, offsetY + size);
    ctx.scale(1, -1);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
    return genome;
  }

  /**
   * Public API: generate + render a single alien.
   * Returns the genome for stats display.
   */
  function generateAlien(seed, canvas, overrides = {}) {
    const size = parseInt(document.getElementById('res-select').value) || 24;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const genome = generateGenome(seed, overrides);
    renderGenome(genome, size, ctx, 0, 0, { frame: 0, total: 1 });
    return genome;
  }

  /**
   * Generate multiple aliens on one canvas (batch preview).
   * Returns array of genomes.
   */
  function generateMultiple(seeds, canvas, overrides = {}) {
    const size = parseInt(document.getElementById('res-select').value) || 24;
    const spacing = 4;
    const cols = Math.ceil(Math.sqrt(seeds.length));
    const rows = Math.ceil(seeds.length / cols);
    canvas.width  = cols * (size + spacing) + spacing;
    canvas.height = rows * (size + spacing) + spacing;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const genomes = [];
    seeds.forEach((seed, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = spacing + col * (size + spacing);
      const oy = spacing + row * (size + spacing);
      const genome = generateGenome(seed, overrides);
      renderGenome(genome, size, ctx, ox, oy, { frame: 0, total: 1 });
      genomes.push(genome);
    });
    return genomes;
  }

  /**
   * Generate animation frames for a single alien.
   * 4 frame types: idle, blink, breathe, twitch
   * Laid out horizontally.
   */
  function generateAnimFrames(seed, canvas, overrides = {}) {
    const size = parseInt(document.getElementById('res-select').value) || 24;
    const totalFrames = 8;
    const spacing = 2;
    canvas.width  = totalFrames * (size + spacing) + spacing;
    canvas.height = size + spacing * 2;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const genome = generateGenome(seed, overrides);
    for (let f = 0; f < totalFrames; f++) {
      const ox = spacing + f * (size + spacing);
      renderGenome(genome, size, ctx, ox, spacing, { frame: f, total: totalFrames });
    }
    return genome;
  }

  /**
   * Sprite sheet builder.
   * config: { count, seed, spacing }
   */
  function generateSpriteSheet(config, overrides = {}) {
    const size = parseInt(document.getElementById('res-select').value) || 24;
    const { count = 12, seed = 1000, spacing = 4 } = config;
    const cols = Math.min(count, 8);
    const rows = Math.ceil(count / cols);

    const canvas = document.getElementById('sheet-canvas');
    canvas.width  = cols * (size + spacing) + spacing;
    canvas.height = rows * (size + spacing) + spacing;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = spacing + col * (size + spacing);
      const oy = spacing + row * (size + spacing);
      const genome = generateGenome(seed + i * 7919, overrides); // prime-stepped seeds
      renderGenome(genome, size, ctx, ox, oy, { frame: 0, total: 1 });
    }
    return canvas;
  }

  return { generateGenome, renderGenome, generateAlien, generateMultiple, generateAnimFrames, generateSpriteSheet };
})();