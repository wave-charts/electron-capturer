const { BrowserWindow } = require("electron/main");
const path = require("path");
const fs = require("fs");
const { capture } = require("../dist");
require("../.get-platform");

let fps = 25;
let duration = 4;
let width = 800;
let height = 600;
const outputDir = path.join(__dirname, "output");
const output = path.join(outputDir, "captured.mp4");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

module.exports.capture = (win = new BrowserWindow(), cfg) => {
  if (cfg.width) width = cfg.width;
  if (cfg.height) height = cfg.height;
  if (cfg.fps) fps = cfg.fps;
  if (cfg.duration) duration = cfg.duration;

  return new Promise((resolve) => {
    const ctx = win.webContents;
    ctx.setFrameRate(fps);

    capture(win, {
      savePath: output,
      fps,
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
