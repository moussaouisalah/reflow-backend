import express from "express";
import bodyParser from "body-parser";

import { getVideoInfo, downloadVideo } from "./reddit.js";

const app = express();

app.use(bodyParser.json());

app.use("/videos", express.static("downloads"));

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
  console.log(req.body);
  if (!req.body.url) return res.status(400).json({ success: false, error: "No URL provided" });

  downloadVideo(req.body)
    .then((path) => {
      res.json({ downloadUrl: path });
    })
    .catch((err) => {
      res.status(500).json({ success: false, error: err.message });
    });
});

app.listen(3000, () => {
  console.log("Express server is listening on port 3000!");
});
