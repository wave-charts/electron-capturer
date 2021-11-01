import { EventEmitter } from "events";
import { CaptureOptions } from "./VideoCapture";
import { ensureDir } from "fs-extra";
import { dirname } from "path";
import { PassThrough } from "stream";
import { ensureFfmpegPath, pkgName } from "./utils";
import ffmpeg from "fluent-ffmpeg";
import Debug from "debug";

const debug = new Debug(`${pkgName}:VideoWritter`);

export class VideoWritter extends EventEmitter {
  public static async create(options?: CaptureOptions): Promise<VideoWritter> {
    const { savePath } = options;
    if (savePath) await ensureDir(dirname(savePath));
    return new VideoWritter(options);
  }

  private _endedPromise: Promise<void>;
  private _fps = 25;
  private _receivedFrame = false;
  private _stopped = false;
  private _stream: PassThrough = new PassThrough();

  protected constructor(options?: CaptureOptions) {
    super();

    ensureFfmpegPath();
    const opt = Object.assign({}, options);
    const { fps, savePath } = opt;
    if (fps) this._fps = fps;
    this._writeVideo(savePath);
  }

  private _writeVideo(savePath: string): void {
    debug(`write video to ${savePath}`);
    this._endedPromise = new Promise((resolve, reject) => {
      ffmpeg({ source: this._stream, priority: 20 })
        .videoCodec("libx264")
        .inputFormat("image2pipe")
        .inputFPS(this._fps)
        .outputOptions("-preset ultrafast")
        .outputOptions("-pix_fmt yuv420p")
        .on("error", (e) => {
          this.emit("ffmpegerror", e.message);
          // do not reject as a result of not having frames
          if (
            !this._receivedFrame &&
            e.message.includes("pipe:0: End of file")
          ) {
            resolve();
            return;
          }
          reject(`error capturing video: ${e.message}`);
        })
        .on("end", () => {
          resolve();
        })
        .save(savePath);
    });
  }

  public stop(): Promise<void> {
    if (this._stopped) return this._endedPromise;
    debug("End Stream");
    this._stopped = true;
    this._stream.end();
    debug("resolving stream ...");
    return this._endedPromise;
  }

  public write(data: Buffer, durationSeconds = 1): void {
    this._receivedFrame = true;
    const numFrames = Math.max(1, Math.round(durationSeconds * this._fps));
    debug(`write ${numFrames} frames for duration ${durationSeconds}s`);
    for (let i = 0; i < numFrames; i++) {
      this._stream.write(data);
    }
  }
}
