// ============================================================
// MODULE 5: UI CONTROLLER
// ============================================================
let currentZoom   = 8;
let lastGenome    = null;
let animInterval  = null;
let animFrame     = 0;

// Init range displays
document.querySelectorAll('input[type=range]').forEach(r => {
  const id = r.id.replace('r-','v-');
  r.addEventListener('input', () => {
    document.getElementById(id).textContent = r.value;
  });
});

function getOverrides() {
  return {
    asymmetry: parseInt(document.getElementById('r-asymmetry').value),
    noise:     parseInt(document.getElementById('r-noise').value),
    mutation:  parseInt(document.getElementById('r-mutation').value),
    slime:     parseInt(document.getElementById('r-slime').value),
    antenna:   document.getElementById('t-antenna').classList.contains('on'),
    slimeFeature: document.getElementById('t-slime').classList.contains('on'),
    scars:     document.getElementById('t-scars').classList.contains('on'),
    asym:      document.getElementById('t-asym').classList.contains('on'),
    anim:      document.getElementById('t-anim').classList.contains('on'),
  };
}

function toggleFeature(el) {
  el.classList.toggle('on');
  generateSingle();
}

function randomSeed() {
  const s = Math.floor(Math.random() * 9999999);
  document.getElementById('seed-input').value = s;
  document.getElementById('sheet-seed').value = Math.floor(s / 7);
}

function setZoom(z) {
  currentZoom = z;
  document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  updateSingleDisplay();
}

// Wrapper canvas for zoom display
let zoomCanvas = null;
function updateSingleDisplay() {
  if (!lastGenome) return;
  const size = parseInt(document.getElementById('res-select').value) || 24;
  const sc = document.getElementById('single-canvas');
  sc.style.width  = (size * currentZoom) + 'px';
  sc.style.height = (size * currentZoom) + 'px';
}

function updateStats(genome) {
  if (!genome) return;
  document.getElementById('stat-seed').textContent    = genome.seed;
  document.getElementById('stat-res').textContent     = `${parseInt(document.getElementById('res-select').value)}px`;
  document.getElementById('stat-eyes').textContent    = genome.eyeCount;
  document.getElementById('stat-mouth').textContent   = genome.mouthType.toUpperCase();
  document.getElementById('stat-antenna').textContent = genome.antennaType.toUpperCase();
  document.getElementById('stat-asymm').textContent   = (genome.asymmetryFactor * 100).toFixed(0) + '%';

  // DNA display
  const dna = [
    `<span class="g">HS:${genome.headShape.slice(0,3).toUpperCase()}</span>`,
    `<span class="g">EY:${genome.eyeCount}</span>`,
    `<span class="r">MT:${genome.mouthType.slice(0,3).toUpperCase()}</span>`,
    `<span class="p">AT:${genome.antennaType.slice(0,3).toUpperCase()}</span>`,
    `<span class="g">BW:${genome.bodyW}×${genome.bodyH}</span>`,
    `<span class="r">NL:${(genome.noiseLevel*100).toFixed(0)}</span>`,
    `<span class="p">SL:${genome.slimeDrips.length}</span>`,
    `<span class="g">SC:${genome.scars.length}</span>`,
  ].join(' ');
  document.getElementById('dna-display').innerHTML = dna;
}

function generateSingle() {
  clearInterval(animInterval);
  const seed = parseInt(document.getElementById('seed-input').value) || 42069;
  const ov   = getOverrides();
  const sc   = document.getElementById('single-canvas');

  lastGenome = AlienGenerator.generateAlien(seed, sc, ov);
  updateSingleDisplay();
  updateStats(lastGenome);

  // Anim frames
  const ac = document.getElementById('anim-canvas');
  AlienGenerator.generateAnimFrames(seed, ac, ov);
  const size = parseInt(document.getElementById('res-select').value) || 24;
  ac.style.height = (size * 3) + 'px';
  ac.style.width  = 'auto';

  // Live animation if enabled
  if (ov.anim) {
    startLiveAnim(seed, ov);
  }
}

function startLiveAnim(seed, ov) {
  clearInterval(animInterval);
  const size = parseInt(document.getElementById('res-select').value) || 24;
  const sc = document.getElementById('single-canvas');
  sc.width = size; sc.height = size;

  let f = 0;
  const FRAMES = [
    {frame:0,total:8}, {frame:0,total:8}, {frame:0,total:8},
    {frame:1,total:8}, // blink
    {frame:0,total:8}, {frame:0,total:8},
    {frame:2,total:8}, {frame:3,total:8}, // breathe + twitch
    {frame:4,total:8}, {frame:5,total:8},
    {frame:0,total:8}, {frame:0,total:8},
  ];

  animInterval = setInterval(() => {
    const ctx = sc.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const genome = AlienGenerator.generateGenome(seed, ov);
    AlienGenerator.renderGenome(genome, size, ctx, 0, 0, FRAMES[f % FRAMES.length]);
    f++;
  }, 180);
}

function generateBatch() {
  const seed = parseInt(document.getElementById('seed-input').value) || 42069;
  const ov   = getOverrides();
  const seeds = Array.from({length: 6}, (_, i) => seed + i * 1337);
  AlienGenerator.generateMultiple(seeds, document.getElementById('batch-canvas'), ov);
}

function buildSpriteSheet() {
  const count   = parseInt(document.getElementById('sheet-count').value)   || 12;
  const seed    = parseInt(document.getElementById('sheet-seed').value)     || 1000;
  const spacing = parseInt(document.getElementById('sheet-spacing').value)  || 4;
  const ov = getOverrides();
  AlienGenerator.generateSpriteSheet({ count, seed, spacing }, ov);
  // Scale sheet display
  const sc = document.getElementById('sheet-canvas');
  sc.style.imageRendering = 'pixelated';
  const scale = Math.min(4, Math.floor(800 / sc.width));
  sc.style.width  = (sc.width  * Math.max(2, scale)) + 'px';
  sc.style.height = (sc.height * Math.max(2, scale)) + 'px';
}

function downloadSheet() {
  const sc = document.getElementById('sheet-canvas');
  if (!sc.width) { buildSpriteSheet(); }
  const link = document.createElement('a');
  link.download = `xenogen_sheet_${Date.now()}.png`;
  link.href = sc.toDataURL('image/png');
  link.click();
}

function mutateAll() {
  const seed = parseInt(document.getElementById('seed-input').value) || 42069;
  // Max out grotesque
  document.getElementById('r-asymmetry').value = 95; document.getElementById('v-asymmetry').textContent = 95;
  document.getElementById('r-noise').value = 90;     document.getElementById('v-noise').textContent = 90;
  document.getElementById('r-mutation').value = 90;  document.getElementById('v-mutation').textContent = 90;
  document.getElementById('r-slime').value = 85;     document.getElementById('v-slime').textContent = 85;
  generateSingle();
  generateBatch();
}

// ---- INIT ----
document.getElementById('res-select').addEventListener('change', () => { generateSingle(); generateBatch(); });

// Auto-generate on load
generateSingle();
generateBatch();
buildSpriteSheet();