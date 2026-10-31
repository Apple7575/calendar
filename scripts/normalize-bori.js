const fs = require("node:fs");
const path = require("node:path");

// Bodymovin scalar keyframes use one-element arrays, including rotation and opacity.
// The supplied v1 pack used bare numbers in s/e. Static scalar k values stay numbers.
// Source ZIP stays untouched; this script normalizes only the app's copied assets.
const results = [];
for (const state of ["blink", "tap", "success", "failure", "focus"]) {
  const file = path.join(__dirname, "..", "assets", "bori", `bori_${state}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let fixed = 0;
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.a === 1 && Array.isArray(value.k)) {
      for (const frame of value.k) {
        if (!frame || typeof frame !== "object" || typeof frame.t !== "number") continue;
        for (const key of ["s", "e"]) if (typeof frame[key] === "number") { frame[key] = [frame[key]]; fixed++; }
      }
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(data);
  if (fixed) fs.writeFileSync(file, JSON.stringify(data));
  results.push({ state, normalizedValues: fixed });
}
console.log(JSON.stringify(results));
