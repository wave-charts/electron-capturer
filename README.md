# electron-video-recorder
Capture Electron's window and export as video


# Requirements

- `ffmpeg`
  
  if you have [FFmpeg](https://www.ffmpeg.org/) installed, make sure to set the `FFMPEG_PATH` environment variable;

  Or, install [@ffmpeg-installer/ffmpeg](https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg)
- `electron`

# Install

```shell
npm i electron-video-recorder
```

# Use

With Electron's [Offscreen] API, you can export videos in the background:

```js
const fs = require("fs");
const { capture } = require("electron-video-recorder");
const { app, BrowserWindow } = require("electron");

const win = new BrowserWindow({
  webPreferences: { offscreen: true },
  show: false,
});

capture(win, { savePath: 'capture.mp4', fps: 25 }).then(handle => {
  handle.stop().then(() => {
    const buffer = fs.readFileSync('capture.mp4');
    win.close();
    win.destroy();
  });
})
```

Or with async func:

```js
const fs = require("fs");
const { capture } = require("electron-video-recorder");
const { app, BrowserWindow } = require("electron");

const win = new BrowserWindow({
  webPreferences: { offscreen: true },
  show: false,
});

const handle = await capture(win, { savePath: 'capture.mp4', fps: 25 });
// Set up your custom stop event
await new Promise((r) => setTimeout(r, 10000));
const buffer = fs.readFileSync('capture.mp4');
win.close();
win.destroy();
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

# Reference

> This library is referenced from [playwright-video] 


[BrowserWindow]: https://www.electronjs.org/zh/docs/latest/api/browser-window 'BrowserWindow'
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object 'Object'
[String]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type 'String'
[Number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type 'Number'
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise 'Promise'
[playwright-video]: https://github.com/qawolf/playwright-video 'PlaywrightVideo'
[Offscreen]: https://www.electronjs.org/zh/docs/latest/tutorial/offscreen-rendering 'Offscreen'