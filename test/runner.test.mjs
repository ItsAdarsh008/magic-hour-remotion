import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { MagicRunner, hashSpec, outputFileFor } from "../dist/node/index.js";

const setup = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mh-test-"));
  await writeFile(path.join(dir, "host.mp4"), "video");
  const calls = [];
  const backend = {
    label: "fake",
    async run(spec) {
      calls.push(spec);
      if (spec.kind === "voice" && spec.text === "fail") throw new Error("boom");
      const f = path.join(dir, `tmp-${calls.length}`);
      await writeFile(f, spec.kind);
      return { file: f, projectId: `p${calls.length}`, credits: 5 };
    },
  };
  const runner = new MagicRunner({ publicDir: dir, backend, log: () => {} });
  return { dir, calls, runner };
};

test("hash ignores key order and undefined values", () => {
  const a = hashSpec({ kind: "voice", text: "hi", voice: "v", speed: undefined });
  const b = hashSpec({ voice: "v", text: "hi", kind: "voice" });
  assert.equal(a, b);
  assert.notEqual(a, hashSpec({ kind: "voice", text: "hi!", voice: "v" }));
  assert.notEqual(a, hashSpec({ kind: "voice", text: "hi", voice: "v", cacheKey: "2" }));
});

test("nested specs run first and their output feeds the parent", async () => {
  const { dir, calls, runner } = await setup();
  const voice = { kind: "voice", text: "Ship it today", voice: "me" };
  const file = await runner.ensure({ kind: "lip-sync", video: "host.mp4", audio: voice });
  assert.deepEqual(calls.map((c) => c.kind), ["voice", "lip-sync"]);
  assert.equal(calls[1].audio, path.join(dir, outputFileFor(voice)));
  assert.equal(calls[1].video, path.join(dir, "host.mp4"));
  assert.ok(existsSync(path.join(dir, file)));
  const manifest = JSON.parse(await readFile(path.join(dir, "magichour/manifest.json"), "utf8"));
  assert.equal(Object.values(manifest.assets).filter((e) => e.status === "done").length, 2);
});

test("identical specs are generated once (cache + in-flight dedupe)", async () => {
  const { calls, runner } = await setup();
  const spec = { kind: "voice", text: "same", voice: "me" };
  await Promise.all([runner.ensure(spec), runner.ensure({ ...spec })]);
  await runner.ensure(spec);
  assert.equal(calls.length, 1);
});

test("failures are recorded and not retried unless asked", async () => {
  const { calls, runner } = await setup();
  const spec = { kind: "voice", text: "fail", voice: "me" };
  await assert.rejects(runner.ensure(spec), /boom/);
  await assert.rejects(runner.ensure(spec), /boom/);
  assert.equal(calls.length, 1);
  await assert.rejects(runner.ensure(spec, { retryErrors: true }), /boom/);
  assert.equal(calls.length, 2);
});

test("missing input files fail clearly without calling the API", async () => {
  const { calls, runner } = await setup();
  await assert.rejects(runner.ensure({ kind: "face-swap", video: "nope.mp4", face: "me.png" }), /Input not found: public\/nope.mp4/);
  assert.equal(calls.length, 0);
});
