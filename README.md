# electron-capturer
Capture Electron's window and export as video


# Requirements

- `ffmpeg`
  
  if you have [FFmpeg](https://www.ffmpeg.org/) installed, make sure to set the `FFMPEG_PATH` environment variable;

  Or, install [@ffmpeg-installer/ffmpeg](https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg)
- `electron`

# Install

```shell
npm i electron-capturer
```

# Use

```js
const fs = require("fs");
const { capture } = require("electron-capturer");
const { app, BrowserWindow } = require("electron");

app.whenReady().then(() => {
  app.on("activate", () => {
    const win = new BrowserWindow({
      width: 800,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    capture(win, { savePath: 'capture.mp4', fps: 25 }).then(handle => {
      handle.stop().then(() => {
        const buffer = fs.readFileSync('capture.mp4');
        win.close();
        win.destroy();
      });
    })
  });
});
```

# API
#### capture(win, [options])

- `win`<[BrowserWindow]>: window to be captured 
- `options`<[Object]>
  - `savePath`<[String]>: path to save the exported video;
  - `fps`<[Number]>: The frames per secord, defaluts to `25`;
- returns: <[Promise]<[VideoCapture](#classvideocapture)>>

#### class:VideoCapture

Core class of capture, created when call `capture(win)`, and return an instance;

#### VideoCapture.stop()

Manually stop capturing.

This method will automatically be called when `BrowserWindow` is `closed` or `destroyed`

```js
const capture = await capture(win, "capture.mp4");
await new Promise(r => setTimeout(r, 5000));
await capture.stop();
```


# Demo

There's an Electron example in project, Clone the project and run:

```shell
yarn dev
```


[BrowserWindow]: https://www.electronjs.org/zh/docs/latest/api/browser-window 'BrowserWindow'
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object 'Object'
[String]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type 'String'
[Number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type 'Number'
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise 'Promise'

