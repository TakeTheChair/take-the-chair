// Generates the banknote-style artwork in public/art.
// Run with: npm run art
import { writeFileSync, mkdirSync } from "node:fs";

const INK = "#173A2B";
const VAULT = "#0C241A";
const PAPER = "#D6DDC8";
const PAPER_LIGHT = "#E2E8D6";
const RIBBON = "#3553C9";
const f = (n) => Math.round(n * 10) / 10;

function rosette({ cx, cy, R, amp, n, lines, amp2 = 0, m = 0, sx = 1, sy = 1, steps = 900, stroke, width, opacity }) {
  let out = `<g fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}">`;
  for (let k = 0; k < lines; k++) {
    const ph = (k / lines) * Math.PI * 2;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = R + amp * Math.sin(n * t + ph) + amp2 * Math.sin(m * t - ph);
      d += (i ? "L" : "M") + f(cx + r * sx * Math.cos(t)) + " " + f(cy + r * sy * Math.sin(t));
    }
    out += `<path d="${d}Z"/>`;
  }
  return out + "</g>";
}

function waves({ w, y, amp, period, lines, amp2, period2, stroke, width, opacity }) {
  let out = `<g fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}">`;
  for (let k = 0; k < lines; k++) {
    const ph = (k / lines) * Math.PI * 2;
    let d = "";
    for (let x = 0; x <= w; x += 2) {
      const yy = y + amp * Math.sin((x / period) * Math.PI * 2 + ph) + amp2 * Math.sin((x / period2) * Math.PI * 2 - ph);
      d += (x === 0 ? "M" : "L") + x + " " + f(yy);
    }
    out += `<path d="${d}"/>`;
  }
  return out + "</g>";
}

// Original executive chair mark, drawn in a 200 x 240 box.
function chair({ x, y, w, fill, stroke = null, strokeW = 0, gap = null }) {
  const s = w / 200;
  const st = stroke ? ` stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"` : "";
  const gp = !stroke && gap ? ` stroke="${gap}" stroke-width="6"` : st;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
<path${st} d="M64 10 H136 Q160 10 160 34 V126 H40 V34 Q40 10 64 10 Z"/>
${!stroke && gap ? `<path d="M70 44 H130 M70 78 H130" stroke="${gap}" stroke-width="4" stroke-linecap="round" fill="none"/>` : ""}
<path${gp} d="M18 104 Q18 94 28 94 H48 V150 H28 Q18 150 18 140 Z"/>
<path${gp} d="M182 104 Q182 94 172 94 H152 V150 H172 Q182 150 182 140 Z"/>
<path${gp} d="M36 124 H164 Q176 124 176 136 V150 Q176 162 164 162 H36 Q24 162 24 150 V136 Q24 124 36 124 Z"/>
<path${st} d="M92 162 H108 V198 H92 Z"/>
<path${st} d="M100 194 L34 214 V224 L100 206 L166 224 V214 Z"/>
<circle${st} cx="36" cy="230" r="8"/><circle${st} cx="164" cy="230" r="8"/><circle${st} cx="100" cy="222" r="8"/>
</g>`;
}

mkdirSync("public/art", { recursive: true });

// Seamless horizontal guilloche band (tiles every 600px).
writeFileSync(
  "public/art/wave.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="40" viewBox="0 0 600 40">${waves({
    w: 600, y: 20, amp: 8, period: 100, lines: 12, amp2: 3, period2: 30, stroke: INK, width: 0.6, opacity: 0.45,
  })}</svg>`
);

// Portrait frame: the banknote portrait is a chair.
{
  const W = 340, H = 420, cx = 170, cy = 210;
  let hatch = "";
  for (let y = 30; y < 400; y += 5) hatch += `<line x1="0" x2="${W}" y1="${y}" y2="${y}"/>`;
  writeFileSync(
    "public/art/portrait.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<clipPath id="o"><ellipse cx="${cx}" cy="${cy}" rx="150" ry="188"/></clipPath>
<pattern id="h" patternUnits="userSpaceOnUse" width="4.2" height="4.2"><rect width="4.2" height="2.1" fill="${INK}"/></pattern>
</defs>
${rosette({ cx, cy, R: 100, sx: 1.62, sy: 2.02, amp: 5, n: 48, lines: 14, steps: 1000, stroke: INK, width: 0.7, opacity: 0.85 })}
<ellipse cx="${cx}" cy="${cy}" rx="158" ry="197" fill="none" stroke="${INK}" stroke-width="1.6"/>
<ellipse cx="${cx}" cy="${cy}" rx="150" ry="188" fill="${PAPER_LIGHT}"/>
<g clip-path="url(#o)"><g stroke="${INK}" stroke-width="0.6" opacity="0.16">${hatch}</g>
${rosette({ cx, cy, R: 120, amp: 60, n: 7, lines: 10, steps: 700, stroke: INK, width: 0.5, opacity: 0.14 })}</g>
${chair({ x: 75, y: 70, w: 190, fill: "url(#h)", stroke: INK, strokeW: 3.6 })}
</svg>`
  );
}

// Round emblem used as the logo.
writeFileSync(
  "public/art/emblem.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<defs><clipPath id="i"><circle cx="200" cy="200" r="122"/></clipPath></defs>
<circle cx="200" cy="200" r="200" fill="${VAULT}"/>
${rosette({ cx: 200, cy: 200, R: 158, amp: 13, n: 26, lines: 14, steps: 900, stroke: PAPER, width: 0.9, opacity: 0.8 })}
<circle cx="200" cy="200" r="128" fill="none" stroke="${PAPER}" stroke-width="1.4"/>
<circle cx="200" cy="200" r="122" fill="${VAULT}"/>
<g clip-path="url(#i)"><rect x="176" y="0" width="48" height="400" fill="${RIBBON}"/></g>
${chair({ x: 137, y: 122, w: 126, fill: PAPER, gap: VAULT })}
</svg>`
);
console.log("Art written to public/art");
