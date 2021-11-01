const { capture } = require("./capture");
const { app, BrowserWindow, ipcMain } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
  return win;
}

function createOffscreenWindow(cfg = {}) {
  const options = Object.assign(
    {
      webPreferences: { offscreen: true },
      show: false,
      width: 800,
      height: 600,
    },
    cfg
  );
  console.log({ options });
  const win = new BrowserWindow(options);
  const dftUrl = "https://github.com";
  win.loadURL(cfg.url || dftUrl);
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle("capture", async (e, cfg = {}) => {
    const offscreenWindow = createOffscreenWindow({
      width: cfg.width,
      height: cfg.height,
    });
    return await capture(offscreenWindow, cfg);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
