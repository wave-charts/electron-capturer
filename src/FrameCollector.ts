import { pkgName } from "./utils";
import { BrowserWindow } from "electron";
import { Debugger, WebContents } from "electron/main";
import { EventEmitter } from "events";
import { CaptureOptions } from "./VideoCapture";
import Debug from "debug";

const debug = new Debug(`${pkgName}:FrameCollector`);

export interface ScreencastFrame {
  data: Buffer;
  received: number;
  timestamp: number;
}

export class FrameCollector extends EventEmitter {
  public static async create(
    browserWindow: BrowserWindow,
    options?: CaptureOptions
  ): Promise<FrameCollector> {
    const collector = new FrameCollector(browserWindow, options);
    return collector;
  }

  public _clients: Array<Debugger>;
  private _originalWindow: BrowserWindow;
  private _stoppedTimestamp: number;
  private _endedPromise: Promise<void>;

  constructor(browserWindow: BrowserWindow, options: CaptureOptions) {
    super();
    this._clients = [];
    this._originalWindow = browserWindow;
  }

  private _getActiveClient(): Debugger | null {
    return this._clients[this._clients.length - 1];
  }

  private _listenForFrames(client: Debugger): void {
    this._endedPromise = new Promise((resolve) => {
      client.on("message", async (event, method, payload) => {
        if (method === "Page.screencastFrame") {
          if (!payload.metadata.timestamp) {
            debug("skipping frame without timestamp");
            return;
          }

          if (
            this._stoppedTimestamp &&
            payload.metadata.timestamp > this._stoppedTimestamp
          ) {
            debug("all frames received");
            resolve();
            return;
          }

          debug(`received frame with timestamp ${payload.metadata.timestamp}`);

          const ackPromise = client.sendCommand("Page.screencastFrameAck", {
            sessionId: payload.sessionId,
          });

          this.emit("screencastframe", {
            data: Buffer.from(payload.data, "base64"),
            received: Date.now(),
            timestamp: payload.metadata.timestamp,
          });

          try {
            // capture error so it does not propagate to the user
            // most likely it is due to the active page closing
            await ackPromise;
          } catch (e) {
            debug("error sending screencastFrameAck %j", (e as any).message);
          }
        }
      });
    });
  }

  private async _activeWindow(win: BrowserWindow): Promise<void> {
    debug("activating window: ");
    let client;
    try {
      client = await this._buildClient(win.webContents);
    } catch (e) {
      // capture error so it does not propagate to the user
      // this is most likely due to the page not being open
      // long enough to attach the CDP session
      debug("error building client %j", (e as any).message);
      return;
    }

    const previousClient = this._getActiveClient();

    if (previousClient) {
      await previousClient.sendCommand("Page.stopScreencast");
    }

    this._clients.push(client);
    this._listenForFrames(client);

    try {
      await client.sendCommand("Page.startScreencast", {
        everyNthFrame: 1,
      });
    } catch (e) {
      // capture error so it does not propagate to the user
      // this is most likely due to the page not being open
      // long enough to start recording after attaching the CDP session
      this._deactivateWindow(win);
      debug("error activating page %j", (e as any).message);
    }
  }

  private async _deactivateWindow(win: BrowserWindow): Promise<void> {
    debug("deactivating page: ");

    this._clients.pop();

    const previousClient = this._getActiveClient();
    try {
      // capture error so it does not propagate to the user
      // most likely it is due to the original page closing
      await previousClient.sendCommand("Page.startScreencast", {
        everyNthFrame: 1,
      });
    } catch (e) {
      debug("error reactivating previous page %j", (e as any).message);
    }
  }

  private async _buildClient(ctx: WebContents): Promise<Debugger> {
    const client = ctx.debugger;
    client.attach("1.1");
    return client;
  }

  public async stop(): Promise<number> {
    debug("Stop Collect");
    if (this._stoppedTimestamp) {
      throw new Error(`Already stopped at ${this._stoppedTimestamp}`);
    }
    this._stoppedTimestamp = Date.now() / 1000;

    await Promise.race([
      this._endedPromise,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

    try {
      debug("detaching client");
      for (const client of this._clients) {
        await client.detach();
      }
    } catch (e) {
      debug("error detaching client", (e as any).message);
    }
    return this._stoppedTimestamp;
  }

  public async start(): Promise<void> {
    debug("Start Collect");
    await this._activeWindow(this._originalWindow);
  }
}
