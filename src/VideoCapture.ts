import { VideoWritter } from "./VideoWritter";
import { BrowserWindow } from "electron";
import { FrameCollector, ScreencastFrame } from "./FrameCollector";
import { SortedFrameQueue } from "./SortedFrameQueue";
import Debug from "debug";
import { pkgName } from "./utils";

const debug = new Debug(`${pkgName}:VideoCapture`);

export interface CaptureOptions {
  savePath?: string;
  fps?: number;
  queueSize?: number;
}

interface StartArgs {
  browserWindow: BrowserWindow;
  options?: CaptureOptions;
}

interface ConstructorArgs {
  browserWindow: BrowserWindow;
  collector: FrameCollector;
  queue: SortedFrameQueue;
  writer: VideoWritter;
}

export class VideoCapture {
  public static async start({
    browserWindow,
    options,
  }: StartArgs): Promise<VideoCapture> {
    const collector = await FrameCollector.create(browserWindow, options);
    const queue = new SortedFrameQueue(options.queueSize);
    const writer = await VideoWritter.create(options);

    const capture = new VideoCapture({
      browserWindow,
      collector,
      queue,
      writer,
    });
    await collector.start();

    return capture;
  }

  private _collector: FrameCollector;
  private _queue: SortedFrameQueue;
  private _writer: VideoWritter;
  private _stopped = false;
  private _previousFrame: ScreencastFrame = null;

  protected constructor({
    browserWindow,
    collector,
    queue,
    writer,
  }: ConstructorArgs) {
    this._collector = collector;
    this._queue = queue;
    this._writer = writer;

    this._writer.on("ffmpegerror", (error) => {
      this.stop();
    });

    browserWindow.on("close", () => this.stop());
    this._listenToFrames();
  }

  private _listenToFrames(): void {
    this._collector.on("screencastframe", (frame: ScreencastFrame) => {
      debug(`collected frame from screencast: ${frame.timestamp}`);
      this._queue.insert(frame);
    });

    this._queue.on("sortedframes", (frames) => {
      debug(`received ${frames.length} frames from queue`);
      frames.forEach((frame) => this._writePreviousFrame(frame));
    });
  }

  private _writePreviousFrame(currentFrame: ScreencastFrame): void {
    // write the previous frame based on the duration between it and the current frame
    if (this._previousFrame) {
      const durationSeconds =
        currentFrame.timestamp - this._previousFrame.timestamp;
      this._writer.write(this._previousFrame.data, durationSeconds);
    }

    this._previousFrame = currentFrame;
  }

  private _writeFinalFrameUpToTimestamp(stoppedTimestamp: number): void {
    if (!this._previousFrame) return;
    const durationSeconds = stoppedTimestamp - this._previousFrame.timestamp;
    this._writer.write(this._previousFrame.data, durationSeconds);
  }

  public async stop(): Promise<void> {
    if (this._stopped) return;

    this._stopped = true;
    const stoppedTimestamp = await this._collector.stop();
    this._queue.drain();
    this._writeFinalFrameUpToTimestamp(stoppedTimestamp);
    return this._writer.stop();
  }
}
