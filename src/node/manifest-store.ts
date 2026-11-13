import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MANIFEST_PATH, emptyManifest, type Manifest, type ManifestEntry } from "../core/spec.js";

/**
 * Reads/writes public/magichour/manifest.json. Writes are serialized and atomic
 * (tmp file + rename) so the Studio never fetches a half-written file.
 */
export class ManifestStore {
  readonly file: string;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(readonly publicDir: string) {
    this.file = path.join(publicDir, MANIFEST_PATH);
  }

  async read(): Promise<Manifest> {
    try {
      const json = JSON.parse(await readFile(this.file, "utf8")) as Manifest;
      return json?.assets ? json : emptyManifest();
    } catch {
      return emptyManifest();
    }
  }

  async ensureExists(): Promise<void> {
    if (existsSync(this.file)) return;
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(emptyManifest(), null, 2));
  }

  async get(hash: string): Promise<ManifestEntry | undefined> {
    return (await this.read()).assets[hash];
  }

  update(hash: string, patch: Partial<ManifestEntry> & Pick<ManifestEntry, "kind" | "status">): Promise<void> {
    const run = async () => {
      const m = await this.read();
      const prev = m.assets[hash];
      const next: ManifestEntry = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      if (patch.status !== "error") delete next.error;
      m.assets[hash] = next;
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmp, JSON.stringify(m, null, 2));
      await rename(tmp, this.file);
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }
}
