import express from "express";
import bodyParser from "body-parser";
import fs from "fs";

import { getVideoInfo, downloadVideo } from "./reddit.js";
import { DOWNLOADS_FOLDER } from "./utils.js";

const DOWNLOAD_URL = "/videos";

// delete old downloads every hour
setInterval(() => {
  console.log("running deleter");
  fs.readdirSync(DOWNLOADS_FOLDER).forEach((file) => {
    console.log("checking file: ", file);
    const isOlder = fs.statSync(`${DOWNLOADS_FOLDER}/${file}`).ctime < Date.now() - 1000 * 60 * 60;
    if (isOlder) {
      fs.unlinkSync(`${DOWNLOADS_FOLDER}/${file}`);
    }
  });
}, 1000 * 60 * 60);

const app = express();

app.use(bodyParser.json());

app.use(DOWNLOAD_URL, express.static("downloads"));

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.post("/video_data", (req, res) => {
  console.log(req.body);
  if (!req.body.url) return res.status(400).json({ success: false, error: "No URL provided" });

  getVideoInfo(req.body.url)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.status(500).json({ success: false, error: err.message });
    });
});

app.post("/download", (req, res) => {
  if (!req.body.url) return res.status(400).json({ success: false, error: "No URL provided" });

  downloadVideo(req.body)
    .then((fileName) => {
      res.json({ downloadUrl: `${DOWNLOAD_URL}/${fileName}` });
    })
    .catch((err) => {
      res.status(500).json({ success: false, error: err.message });
    });
});

app.listen(3000, () => {
  console.log("Express server is listening on port 3000!");
});
