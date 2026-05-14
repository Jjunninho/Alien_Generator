// ============================================================
// MODULE 1: PRNG — Mulberry32 deterministic PRNG
// ============================================================
const PRNG = (() => {
  function create(seed) {
    let s = seed >>> 0;
    return {
      next() {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      },
      int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; },
      bool(p = 0.5) { return this.next() < p; },
      pick(arr) { return arr[this.int(0, arr.length - 1)]; },
      float(min, max) { return min + this.next() * (max - min); }
    };
  }

  return { create };
})();