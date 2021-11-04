const { BrowserWindow } = require("electron/main");
const path = require("path");
const fs = require("fs");
const { capture } = require("../dist");
require("../.get-platform");

let fps = 25;
let duration = 4;
let width = 800;
let height = 600;
let niceness = 0;
let format = "mp4";
const outputDir = path.join(__dirname, "output");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

module.exports.capture = (win = new BrowserWindow(), cfg) => {
  if (cfg.width) width = cfg.width;
  if (cfg.height) height = cfg.height;
  if (cfg.fps) fps = cfg.fps;
  if (cfg.duration) duration = cfg.duration;
  if (cfg.format) format = cfg.format;
  if (cfg.niceness) niceness = cfg.niceness;

  return new Promise((resolve) => {
    const ctx = win.webContents;
    ctx.setFrameRate(fps);

    const output = path.join(outputDir, "captured." + format);
    capture(win, {
      savePath: output,
      fps,
      format,
      niceness,
    }).then((captureHandle) => {
      setTimeout(() => {
        captureHandle.stop().then(() => {
          console.log("ReadFile...");
          const buffer = fs.readFileSync(output);
          win.close();
          win.destroy();
          resolve(buffer);
        });
      }, duration * 1000);
    });
  });
};
