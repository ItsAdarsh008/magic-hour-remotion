import { copyFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { OUTPUT_EXT, OUTPUT_TYPE, type JobSpec } from "../core/spec.js";
import { ffmpeg, getDuration, hasBinary } from "./media.js";

/** A spec whose inputs have been replaced by local file paths or URLs. */
export type ResolvedSpec = JobSpec & { name: string };

export type BackendResult = { file: string; projectId?: string; credits?: number };

export interface Backend {
  readonly label: string;
  run(spec: ResolvedSpec): Promise<BackendResult>;
}

const tmpDir = () => mkdtemp(path.join(os.tmpdir(), "magichour-"));

/** Works out start/end seconds the way Magic Hour's video endpoints want them. */
const window = async (spec: { trim?: { start?: number; end?: number } }, lengthOf: string, clampTo?: string) => {
  const start = spec.trim?.start ?? 0;
  let end = spec.trim?.end ?? start + (await getDuration(lengthOf));
  if (clampTo && clampTo !== lengthOf) {
    const max = await getDuration(clampTo).catch(() => Infinity);
    end = Math.min(end, max);
  }
  return { startSeconds: start, endSeconds: Math.round(end * 100) / 100 };
};

// ---------------------------------------------------------------------------
// Real backend: the official magic-hour Node SDK
// ---------------------------------------------------------------------------

export class MagicHourBackend implements Backend {
  readonly label = "Magic Hour API";
  private client: any;

  constructor(private apiKey: string) {}

  private async sdk() {
    if (!this.client) {
      const { Client } = await import("magic-hour");
      this.client = new Client({ token: this.apiKey });
    }
    return this.client;
  }

  async run(spec: ResolvedSpec): Promise<BackendResult> {
    const v1 = (await this.sdk()).v1;
    const downloadDirectory = await tmpDir();
    const opts = { waitForCompletion: true, downloadOutputs: true, downloadDirectory };
    const name = spec.name;
    let res: any;

    switch (spec.kind) {
      case "lip-sync": {
        const audio = spec.audio as string;
        const video = spec.video as string;
        res = await v1.lipSync.generate(
          {
            name,
            assets: { videoSource: "file", videoFilePath: video, audioFilePath: audio },
            ...(await window(spec, audio, video)),
            maxFpsLimit: spec.maxFps,
            style: spec.mode ? { generationMode: spec.mode } : undefined,
          },
          opts,
        );
        break;
      }
      case "face-swap": {
        const video = spec.video as string;
        res = await v1.faceSwap.generate(
          {
            name,
            assets: { videoSource: "file", videoFilePath: video, imageFilePath: spec.face as string, faceSwapMode: "all-faces" },
            ...(await window(spec, video)),
          },
          opts,
        );
        break;
      }
      case "talking-photo": {
        const audio = spec.audio as string;
        res = await v1.aiTalkingPhoto.generate(
          {
            name,
            assets: { imageFilePath: spec.image as string, audioFilePath: audio },
            ...(await window(spec, audio)),
            resolution: spec.resolution,
          },
          opts,
        );
        break;
      }
      case "video-upscale": {
        const video = spec.video as string;
        res = await v1.aiVideoUpscaler.generate(
          { name, assets: { videoFilePath: video }, resolution: spec.resolution, ...(await window(spec, video)) },
          opts,
        );
        break;
      }
      case "image-to-video": {
        res = await v1.imageToVideo.generate(
          {
            name,
            assets: { imageFilePath: spec.image as string },
            endSeconds: spec.seconds,
            model: spec.model,
            resolution: spec.resolution,
            style: spec.prompt ? { prompt: spec.prompt } : undefined,
          },
          opts,
        );
        break;
      }
      case "voice": {
        res = await v1.aiVoiceGenerator.generate(
          { name, style: { prompt: spec.text, voiceName: spec.voice, language: spec.language, speed: spec.speed } },
          opts,
        );
        break;
      }
      case "remove-background": {
        res = await v1.imageBackgroundRemover.generate(
          {
            name,
            assets: { imageFilePath: spec.image as string, backgroundImageFilePath: spec.background as string | undefined },
          },
          opts,
        );
        break;
      }
    }

    if (!res || res.status !== "complete") {
      const msg = res?.error?.message ?? `status: ${res?.status ?? "unknown"}`;
      throw new Error(`Magic Hour ${spec.kind} failed (${msg})${res?.id ? ` — project ${res.id}` : ""}`);
    }
    const file = res.downloadedPaths?.[0];
    if (!file) {
      throw new Error(
        `Magic Hour finished project ${res.id} but the file did not download` +
          (res.downloadErrors?.length ? ` (${res.downloadErrors[0]?.error ?? "unknown error"})` : "") +
          `. The result is in your Magic Hour library; nothing needs to be regenerated.`,
      );
    }
    return { file, projectId: res.id, credits: res.creditsCharged ?? res.credits_charged };
  }
}

// ---------------------------------------------------------------------------
// Mock backend: free, offline, uses ffmpeg. For building templates, CI and demos.
// ---------------------------------------------------------------------------

export class MockBackend implements Backend {
  readonly label = "mock (no API calls)";

  async run(spec: ResolvedSpec): Promise<BackendResult> {
    const dir = await tmpDir();
    const out = path.join(dir, `out.${OUTPUT_EXT[OUTPUT_TYPE[spec.kind]]}`);
    const haveFfmpeg = await hasBinary("ffmpeg");
    const enc = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast"];
    // Simulate API latency so the Studio's "generating…" state is visible.
    await new Promise((r) => setTimeout(r, Number(process.env.MAGICHOUR_MOCK_DELAY_MS ?? 1500)));

    switch (spec.kind) {
      case "lip-sync":
      case "talking-photo": {
        const audio = spec.audio as string;
        const visual = (spec.kind === "lip-sync" ? spec.video : spec.image) as string;
        const { startSeconds, endSeconds } = await window(spec, audio);
        const len = String(endSeconds - startSeconds);
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        const visualIn = spec.kind === "talking-photo" ? ["-loop", "1", "-i", visual] : ["-stream_loop", "-1", "-i", visual];
        await ffmpeg([...visualIn, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-t", len, ...enc, "-c:a", "aac", "-shortest", out]);
        break;
      }
      case "face-swap":
      case "video-upscale": {
        await copyFile(spec.video as string, out);
        break;
      }
      case "image-to-video": {
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        const frames = Math.round(spec.seconds * 30);
        await ffmpeg([
          "-loop", "1", "-i", spec.image as string,
          "-vf", `scale=1920:-2,zoompan=z='min(zoom+0.0015,1.3)':d=${frames}:s=1920x1080:fps=30`,
          "-t", String(spec.seconds), ...enc, out,
        ]);
        break;
      }
      case "voice": {
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        // ~2.6 words/second, a soft tone so you can hear timing.
        const seconds = Math.max(1, spec.text.trim().split(/\s+/).length / 2.6);
        await ffmpeg(["-f", "lavfi", "-i", `sine=frequency=220:duration=${seconds.toFixed(2)}`, "-af", "volume=0.15", out]);
        break;
      }
      case "remove-background": {
        await copyFile(spec.image as string, out);
        break;
      }
    }
    return { file: out, projectId: "mock", credits: 0 };
  }
}
