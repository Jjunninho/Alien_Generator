// ============================================================
// MODULE 3: PIXEL DRAWING UTILITIES
// ============================================================
const PixelDraw = (() => {
  function setPixel(data, w, x, y, col, alpha = 255) {
    if (x < 0 || y < 0 || x >= w || y >= data.height) return;
    const idx = (y * w + x) * 4;
    if (typeof col === 'string') col = hexToRgb(col);
    data.data[idx]     = col[0];
    data.data[idx + 1] = col[1];
    data.data[idx + 2] = col[2];
    data.data[idx + 3] = alpha;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r, g, b];
  }

  function fillEllipse(data, w, cx, cy, rx, ry, col, alpha = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx*dx + dy*dy <= 1) setPixel(data, w, x, y, col, alpha);
      }
    }
  }

  function strokeEllipse(data, w, cx, cy, rx, ry, col) {
    for (let angle = 0; angle < 360; angle += 0.5) {
      const rad = angle * Math.PI / 180;
      const x = Math.round(cx + rx * Math.cos(rad));
      const y = Math.round(cy + ry * Math.sin(rad));
      setPixel(data, w, x, y, col);
    }
  }

  function fillRect(data, w, x, y, rw, rh, col, alpha = 255) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++)
        setPixel(data, w, x + dx, y + dy, col, alpha);
  }

  function drawLine(data, w, x0, y0, x1, y1, col, alpha = 255) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      setPixel(data, w, x0, y0, col, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx)  { err += dx; y0 += sy; }
    }
  }

  return { setPixel, hexToRgb, fillEllipse, strokeEllipse, fillRect, drawLine };
})();