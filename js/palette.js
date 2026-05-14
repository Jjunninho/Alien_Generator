// ============================================================
// MODULE 2: COLOR PALETTE
// ============================================================
const Palette = (() => {
  function generate(rng) {
    const greenVariants = [
      ['#1a4a1a', '#2d7a2d', '#3daa3d'],
      ['#0d3320', '#1a6640', '#2daa60'],
      ['#2a4a0a', '#4a8a10', '#7acc20'],
      ['#1a3a0a', '#386018', '#5e9430'],
      ['#0a2a18', '#155c35', '#259c5a'],
    ];
    const gv = rng.pick(greenVariants);
    const eyeColors = ['#ff2244','#cc00ff','#ff6600','#ffcc00','#00ffff'];

    return {
      outline:    '#050f08',
      body1:      gv[0],
      body2:      gv[1],
      body3:      gv[2],
      highlight:  '#a0ffb0',
      eye:        rng.pick(eyeColors),
      eyeWhite:   '#f0f0f0',
      eyePupil:   '#111111',
      slime:      '#44ff66',
      scar:       '#0a1a0a',
      mouth:      '#0a0505',
      teeth:      '#e8e8c0',
      tongue:     '#ff4466',
    };
  }

  return { generate };
})();