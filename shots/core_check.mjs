// Is Noor untouched? node shots/core_check.mjs [--json]
// Walks every frame Noor is adrift in the lattice and measures how near each beam of the grid (shots/core_cast.js
// beamsAt) comes to their skeleton (every joint of the drift pose, and the points between). Prints, per beam that
// comes within a metre, how near and on which song frame; exits 1 if any beam comes nearer than 5 cm (a hit), or if
// one of the three that are meant to miss by a hair does not come within 25 cm within two frames of its own note.
import { solve } from "../engine/body.js";
import { actorPose } from "../engine/actions.js";
import { EV, P, noorAt, beamsAt } from "./core_cast.js";
const seg = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2))); return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t); };
const best = {};
for (let F = EV.off; F < EV.land; F++) {
  const n = noorAt(F), J = solve(P, actorPose({ who: "noor", action: "core_drift", phase: 0, x: n.x, y: n.y, z: n.z })).J, pts = [];
  const chain = [J.crown, J.head, J.headBase, J.neckBase, J.chest, J.waist, J.hips]; for (const s of ["L", "R"]) chain.push(J[s].sh, J[s].elbow, J[s].wrist, J[s].hand, J[s].hip, J[s].knee, J[s].ankle, J[s].toe, J[s].heel);
  for (const p of chain) pts.push(p); for (let i = 0; i + 1 < 7; i++) pts.push(chain[i].map((v, k) => (v + chain[i + 1][k]) / 2));
  for (const b of beamsAt(F)) { const d = Math.min(...pts.map((p) => seg(p, b.a, b.b))); if (!best[b.i] || d < best[b.i].d) best[b.i] = { i: b.i, kind: b.kind, d: +d.toFixed(3), F }; }
}
const rows = Object.values(best).filter((r) => r.d < 1), fails = [];
for (const r of Object.values(best)) if (r.d < 0.05) fails.push(`beam ${r.i} (${r.kind}) passes ${r.d} m from Noor's skeleton on ${r.F}`);
EV.miss.forEach((on, i) => { const r = best[i]; if (!r || r.d > 0.25 || Math.abs(r.F - on) > 2) fails.push(`the miss on ${on} is ${r?.d} m off on ${r?.F}`); });
if (process.argv.includes("--json")) console.log(JSON.stringify({ rows, fails })); else { for (const r of rows) console.log(`beam ${String(r.i).padStart(2)} ${r.kind.padEnd(5)} nearest ${r.d.toFixed(3)} m on ${r.F}`); console.log(fails.length ? fails.join("\n") : "Noor is untouched"); }
process.exit(fails.length ? 1 : 0);
