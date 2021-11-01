import { setFfmpegPath as setFluentFfmpegPath } from "fluent-ffmpeg";
const pkg = require("../package.json");

export const getFfmpegFromModule = (): string | null => {
  try {
    const ffmpeg = require("@ffmpeg-installer/ffmpeg");
    console.log({ ffmpeg });
    if (ffmpeg.path) return ffmpeg.path;
  } catch (e) {
    console.log(e);
  }
  return null;
};

export const getFfmpegPath = (): string | null =>
  process.env.FFMPEG_PATH || getFfmpegFromModule();

export const ensureFfmpegPath = (): void => {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    throw new Error(
      "FFmpeg path not set. Set the FFMPEG_PATH env variable or install @ffmpeg-installer/ffmpeg as a dependency."
    );
  }

  setFluentFfmpegPath(ffmpegPath);
};

export const pkgName = pkg.name;
