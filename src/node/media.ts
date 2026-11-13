import { spawn } from "node:child_process";

const run = (cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", (err) => resolve({ code: -1, stdout, stderr: String(err) }));
    p.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });

export const hasBinary = async (bin: string) => (await run(bin, ["-version"])).code === 0;

/** Duration in seconds of a local file or URL. Uses ffprobe, then Remotion's own probe. */
export const getDuration = async (file: string): Promise<number> => {
  const r = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = parseFloat(r.stdout.trim());
  if (r.code === 0 && Number.isFinite(seconds)) return seconds;

  try {
    const { getVideoMetadata } = await import("@remotion/renderer");
    const meta = await getVideoMetadata(file);
    if (meta.durationInSeconds) return meta.durationInSeconds;
  } catch {
    // fall through
  }
  throw new Error(
    `Could not read the duration of ${file}. Install ffprobe, or pass trim={{ end: <seconds> }} on the component.`,
  );
};

export const ffmpeg = async (args: string[]) => {
  const r = await run("ffmpeg", ["-y", "-loglevel", "error", ...args]);
  if (r.code !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-400)}`);
};
