import { BrowserWindow } from "electron";
import { CaptureOptions, VideoCapture } from "./VideoCapture";

export const capture = (
  browserWindow: BrowserWindow,
  options?: CaptureOptions
): Promise<VideoCapture> => {
  return VideoCapture.start({ browserWindow, options });
};
