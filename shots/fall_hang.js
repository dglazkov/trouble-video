// Fall 1, 146.33-147.17 s: THE FLOOR IS GONE. The deck has let go: where it was there is the mouth of a shaft, the
// slab they stood on is dropping away down it, and the four are standing where they stood, on nothing, over the pit,
// still grinning. On the strings (3519) all four look down. On the strings again (3525) all four look at us. Then
// the brass, and the next shot. One drawing of the four together and two edits of it. The pit is the set
// (sets/shaft.js, open at the top); what is above its rim (the deck beyond, its rail, the atrium's night) is painted
// here by the film.
// JOIN: the shot before (shots/reun_end.js) ends on the bridge with the deck unlocking; this is a cut to a new angle,
// so nothing has to match but who stands where: ROW, left to right as the camera sees them.
import { CUT, EV, W, H, shot, plates, at3d, ease, clamp, rnd } from "./fall_cast.js";
const ROW = "tane, ife, noor, juno";      // as painted (kits/tane/closeup/fall_hang_2.jpg); repaint the plate if the reunion ends otherwise
const CAM = { pos: [0.5, 2.25, -7.6], target: [0, 0.78, 0], fov: 23.5 }, R = 8, NIGHT = { tint: [0.9, 0.76, 0.86], rim: [1.0, 0.45, 0.4], rimDir: [0, 7], gradient: 0.2, gradientY: [0.15, 0.6] };
const path = (g, l) => { g.beginPath(); l.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
function frame(f) {
  const F = CUT.hang + f, look = F < EV.down ? 0 : F < EV.out ? 2 : 1;
  // the breath before the drop: they stretch a hand's width up, as one
  const up = f >= 17 ? [0.012, 0.03, 0.045][f - 17] : 0, jolt = F === EV.down || F === EV.out ? -5 : 0;
  const c = at3d(CAM, "tane.hang", look, [0, 0.955 + up * 2, 0], 0.00133 * (1 + up), { layer: NIGHT });
  return { set: "shaft", camera: CAM, options: { hatch: 0, rooms: 0.95, lamps: 0.9, fog: 0.02 }, cels: [{ ...c, y: c.y + jolt }],
    under(g, cam) {
      const pr = (x, y, z) => cam.project([x, y, z]);
      // everything outside the pit's mouth: the deck beyond it, its rail, the atrium at night with its alarm on
      const FL = pr(R, 0, R), FR = pr(-R, 0, R), SL = pr(R, 0, -5.5), SR = pr(-R, 0, -5.5);
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.moveTo(SL.x, SL.y); g.lineTo(FL.x, FL.y); g.lineTo(FR.x, FR.y); g.lineTo(SR.x, SR.y); g.lineTo(W + 400, H + 400); g.lineTo(-400, H + 400); g.closePath(); g.clip("evenodd");
      const gr = g.createLinearGradient(0, 0, 0, FL.y); gr.addColorStop(0, "#170f2e"); gr.addColorStop(0.6, "#3a1c46"); gr.addColorStop(1, "#6a2c50"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // the far wall's decks: rank on rank of windows, red
      for (let r = 0; r < 7; r++) { const y = 40 + r * 44 + 6 * Math.sin(r * 2.1); g.fillStyle = r % 3 ? "#c8384a" : "#ff6a4c"; for (let i = 0; i < 60; i++) if (rnd(r, i) > 0.3) g.fillRect(i * 33 + (r % 2) * 14, y + 14 * Math.sin(i * 0.11 + r), 15, 6); g.fillStyle = "rgba(10,6,24,0.5)"; g.fillRect(0, y + 22, W, 5); }
      // the bridge's stays
      g.strokeStyle = "#0e0a1e"; g.lineWidth = 8; for (const [x, tx] of [[-11, -3], [-4, -1], [5, 1.4], [12, 3.4]]) { const a = pr(x, 1.1, 15), b = pr(tx * 6, 40, 30); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      // the deck beyond the pit, to its rail
      const DL = pr(40, 0, 15), DR = pr(-40, 0, 15), L0 = pr(40, 0, R), R0 = pr(-40, 0, R);
      path(g, [L0, R0, DR, DL]); g.fillStyle = "#2a2a44"; g.fill();
      const HL = pr(40, 0, R + 0.9), HR = pr(-40, 0, R + 0.9); path(g, [L0, R0, HR, HL]); g.fillStyle = "#e0b02a"; g.fill();
      g.fillStyle = "#17142a"; for (let x = -40; x < 40; x += 1.6) { const a = pr(x, 0, R), b = pr(x + 0.8, 0, R), c2 = pr(x + 1.3, 0, R + 0.9), d = pr(x + 0.5, 0, R + 0.9); path(g, [a, b, c2, d]); g.fill(); }
      g.strokeStyle = "#0e0a1e"; g.lineWidth = 6; for (const h of [0.6, 1.15]) { const a = pr(40, h, 15), b = pr(-40, h, 15); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      for (let x = -30; x <= 30; x += 2.5) { const a = pr(x, 0, 15), b = pr(x, 1.15, 15); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.fillStyle = "#ff4a3a"; g.fillRect(b.x - 5, b.y - 12, 10, 10); }
      g.restore();
      // the slab of deck they stood on: gone from under them, flat and then tipping, down the shaft
      const d = 0.25 + 0.085 * f * f, tip = 0.035 * f, hs = 3.3, cs = Math.cos(tip), sn = Math.sin(tip);
      const P = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map(([x, z]) => [x, -d + z * sn, z * cs]), top = P.map((p) => pr(...p)), bot = P.map((p) => pr(p[0], p[1] - 0.22, p[2]));
      if (d < 60) {
        path(g, top); g.fillStyle = "#3c3d5c"; g.fill(); g.strokeStyle = "#0c0a18"; g.lineWidth = 5; g.stroke();
        g.strokeStyle = "#26273e"; g.lineWidth = 4; for (let k = 1; k < 6; k++) { const u = k / 6, a = top[0], b = top[1], c2 = top[3], e = top[2]; g.beginPath(); g.moveTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u); g.lineTo(c2.x + (e.x - c2.x) * u, c2.y + (e.y - c2.y) * u); g.stroke(); }
        path(g, [top[0], top[1], bot[1], bot[0]]); g.fillStyle = "#e0b02a"; g.fill(); g.strokeStyle = "#0c0a18"; g.lineWidth = 5; g.stroke();
      }
    },
    post: { flash: f === 0 ? 0.12 : 0, bloom: 0.6, vignette: 0.5, contrast: 0.32 } };
}
export default shot("hang", { cutOn: "strings", plates: plates("tane.hang"), row: ROW,
  marks: [{ at: EV.down - CUT.hang, what: "all four look down", on: "strings" }, { at: EV.out - CUT.hang, what: "all four look at us", on: "strings" }], frame });
