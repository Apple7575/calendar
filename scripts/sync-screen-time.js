// Both native targets compile the same state/locking implementation.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "modules/routine-screen-time/ios/ScreenTimeState.swift");
const destination = path.join(root, "targets/screentime/ScreenTimeState.swift");
const content = fs.readFileSync(source);
if (process.argv.includes("--check")) {
  if (!fs.existsSync(destination) || !content.equals(fs.readFileSync(destination))) {
    throw new Error("Run node scripts/sync-screen-time.js before building.");
  }
} else {
  fs.writeFileSync(destination, content);
}
