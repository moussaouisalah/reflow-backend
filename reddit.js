import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { path } from "@ffmpeg-installer/ffmpeg";
import fs from "fs";

ffmpeg.setFfmpegPath(path);

const resolutions = ["1080", "720", "480", "360", "240", "96"];

async function extractVideoInfo(url) {
  let fetchUrl = url.split("?")[0];
  if (!fetchUrl.endsWith(".json")) fetchUrl += ".json";

  const json = await (await fetch(fetchUrl)).json();

  const postData = json[0].data.children[0].data;
  const mediaData = postData.media.reddit_video;
  const fallbackUrl = mediaData.fallback_url.split("?")[0];

  console.log("postData", postData);

  const info = {
    fallbackUrl,
    isMP4: fallbackUrl.endsWith(".mp4"),
    url: postData.url,
    isVideo: postData.is_video,
    duration: mediaData.duration,
    title: postData.title,
    thumbnail: postData.thumbnail,
  };

  return info;
}

function extractAudioUrl(videoInfo) {
  return videoInfo.isMP4 ? `${videoInfo.url}/DASH_audio.mp4` : `${videoInfo.url}/audio`;
}

async function hasAudioTrack(videoInfo) {
  const res = await fetch(extractAudioUrl(videoInfo));
  return res.status === 200;
}

function getBestResolution(videoInfo) {
  return videoInfo.fallbackUrl.split("_")[1].split(".")[0];
}

function getAvailableResolutions(videoInfo) {
  return resolutions.slice(resolutions.indexOf(getBestResolution(videoInfo)));
}

function extractVideoUrl(videoInfo, resolution) {
  if (resolution === undefined) return videoInfo.fallbackUrl;
  if (videoInfo.isMP4) resolution += ".mp4";
  return `${videoInfo.fallbackUrl.split("_")[0]}_${resolution}`;
}

export async function getVideoInfo(url) {
  let videoInfo;
  try {
    videoInfo = await extractVideoInfo(url);
  } catch (err) {
    throw new Error("Invalid URL");
  }
  try {
    const hasAudio = await hasAudioTrack(videoInfo);
    const availableResolutions = getAvailableResolutions(videoInfo);
    const bestResolution = getBestResolution(videoInfo);

    const data = {
      ...videoInfo,
      hasAudio,
      availableResolutions,
      bestResolution,
    };

    console.log(data);

    return data;
  } catch (err) {
    console.log(err);
    throw new Error("An error occurred while fetching the video info");
  }
}

export async function downloadVideo({ url, resolution, includeAudio = true }) {
  let videoInfo;
  try {
    videoInfo = await extractVideoInfo(url);
  } catch (err) {
    throw new Error("Invalid URL");
  }

  const randomId = Math.random().toString(36).substring(7);
  const outputFile = `./downloads/${randomId}.mp4`;
  const downloader = ffmpeg();
  const resolutions = getAvailableResolutions(videoInfo);

  if (resolution === undefined) resolution = getBestResolution(videoInfo);

  if (!resolutions.includes(resolution)) throw new Error("Invalid resolution");

  if (!fs.existsSync("./downloads")) fs.mkdirSync("./downloads");

  downloader.output(outputFile).addInput(extractVideoUrl(videoInfo, resolution));

  if (includeAudio && (await hasAudioTrack(videoInfo))) {
    const audioUrl = extractAudioUrl(videoInfo);
    downloader.addInput(audioUrl);
  }

  console.log("downloading...");

  return new Promise((resolve, reject) => {
    downloader
      .on("end", () => {
        console.log("downloaded");
        resolve(outputFile);
      })
      .on("error", (err) => {
        console.log(err);
        reject("An error occurred while downloading the video");
      })
      .run();
  });
}
