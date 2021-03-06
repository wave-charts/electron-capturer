import { EventEmitter } from "events";
import { ScreencastFrame } from "./FrameCollector";

import Debug from "debug";
import { pkgName } from "./utils";
const debug = new Debug(`${pkgName}:SortedFrameQueue`);

export class SortedFrameQueue extends EventEmitter {
  public _frames = [];
  private _size = 40;

  constructor(size?: number) {
    super();
    if (size) this._size = size;
  }

  private _emitFrames(frames: ScreencastFrame[]): void {
    debug(`emitting ${frames.length} frames`);

    this.emit("sortedframes", frames);
  }

  private _findInsertionIndex(timestamp: number): number {
    if (this._frames.length === 0) return 0;

    let i: number;
    let frame: ScreencastFrame;

    for (i = this._frames.length - 1; i >= 0; i--) {
      frame = this._frames[i];
      if (timestamp > frame.timestamp) break;
    }

    return i + 1;
  }

  public insert(frame: ScreencastFrame): void {
    // If the queue is already full, send half of the frames for processing first
    if (this._frames.length === this._size) {
      const numberOfFramesToSplice = Math.floor(this._size / 2);
      const framesToProcess = this._frames.splice(0, numberOfFramesToSplice);

      this._emitFrames(framesToProcess);
    }

    const insertionIndex = this._findInsertionIndex(frame.timestamp);

    if (insertionIndex === this._frames.length) {
      debug(`inserting frame into queue at end: ${frame.timestamp}`);
      // If this frame is in order, push it
      this._frames.push(frame);
    } else {
      debug(
        `inserting frame into queue at index ${insertionIndex}: ${frame.timestamp}`
      );
      // If this frame is out of order, splice it in
      this._frames.splice(insertionIndex, 0, frame);
    }
  }

  public drain(): void {
    debug("draining queue");
    this._emitFrames(this._frames);
    this._frames = [];
  }
}
