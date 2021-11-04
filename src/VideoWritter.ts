import { EventEmitter } from "events";
import { CaptureOptions } from "./VideoCapture";
import { ensureDir } from "fs-extra";
import { dirname } from "path";
import { PassThrough } from "stream";
import { ensureFfmpegPath, pkgName } from "./utils";
import ffmpeg from "fluent-ffmpeg";
import Debug from "debug";

const debug = new Debug(`${pkgName}:VideoWritter`);

export type ExportFormat = "gif" | "mp4";

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
  private _format: ExportFormat = "mp4";
  private _niceness: number = 0;

  protected constructor(options?: CaptureOptions) {
    super();

    ensureFfmpegPath();
    const opt = Object.assign({}, options);
    const { fps, savePath, format } = opt;
    if (fps) this._fps = fps;
    if (format) this._format = format;
    if (opt.niceness)
      this._niceness = Math.min(20, Math.max(-20, parseInt(opt.niceness + "")));
    this._writeVideo(savePath);
  }

  private _ensureFilename(savePath: string) {
    const arr = savePath.split(".").reverse();
    const ext = arr[0];
    const format = this._format;
    const checks = ["mp4", "gif"];
    for (let check of checks) {
      if (format === check) {
        if (ext !== check) {
          arr[0] = check;
          savePath = arr.reverse().join(".");
        }
        break;
      }
    }
    return savePath;
  }

  private _writeVideo(savePath: string): void {
    savePath = this._ensureFilename(savePath);
    debug(`write video to ${savePath}`);
    this._endedPromise = new Promise((resolve, reject) => {
      if (this._format === "mp4") {
        ffmpeg({ source: this._stream, niceness: this._niceness })
          .videoCodec("libx264")
          .inputFormat("image2pipe")
          .inputFPS(this._fps)
          .fps(this._fps)
          .format("mp4")
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
      } else if (this._format === "gif") {
        ffmpeg({ source: this._stream, niceness: this._niceness })
          .videoCodec("gif")
          .inputFPS(this._fps)
          .fps(this._fps)
          .size("50%")
          .format("gif")
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
            reject(`error capturing GIF: ${e.message}`);
          })
          .on("end", () => {
            resolve();
          })
          .save(savePath);
      } else {
        reject("unexcpted format");
      }
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
