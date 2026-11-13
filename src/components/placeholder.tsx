import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { LABEL, type JobKind, type MagicInput } from "../core/spec.js";
import type { MagicAssetState } from "./use-magic-asset.js";

export const resolveSrc = (input: string) =>
  /^https?:\/\//.test(input) ? input : staticFile(input.replace(/^\/+/, ""));

const STATUS_TEXT: Record<MagicAssetState["status"], string> = {
  queued: "queued",
  running: "generating",
  done: "ready",
  error: "failed",
  missing: "not generated",
  collect: "scanning",
};

/** Small pill shown over the source footage while Magic Hour works. Never appears in final renders. */
export const MagicBadge: React.FC<{ kind: JobKind; state: MagicAssetState }> = ({ kind, state }) => {
  const frame = useCurrentFrame();
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(frame / 8));
  const isError = state.status === "error";
  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 18px",
        borderRadius: 999,
        background: "rgba(12,12,16,0.72)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${isError ? "rgba(255,90,90,0.6)" : "rgba(255,255,255,0.18)"}`,
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 22,
        maxWidth: "80%",
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          flexShrink: 0,
          background: isError ? "#ff5a5a" : "#b48cff",
          opacity: isError ? 1 : pulse,
          boxShadow: isError ? undefined : "0 0 14px #b48cff",
        }}
      />
      <span style={{ fontWeight: 600 }}>Magic Hour</span>
      <span style={{ opacity: 0.75 }}>
        {LABEL[kind]} · {STATUS_TEXT[state.status]}
        {isError && state.error ? ` — ${state.error}` : "…"}
      </span>
    </div>
  );
};

/** Shows the original footage (or a neutral panel) with the badge on top. */
export const MagicPlaceholder: React.FC<{
  kind: JobKind;
  state: MagicAssetState;
  source?: MagicInput;
  sourceType: "video" | "image" | "none";
  style?: React.CSSProperties;
}> = ({ kind, state, source, sourceType, style }) => {
  const canPreview = typeof source === "string" && sourceType !== "none";
  return (
    <AbsoluteFill style={style}>
      {canPreview && sourceType === "video" ? (
        <OffthreadVideo src={resolveSrc(source as string)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : canPreview && sourceType === "image" ? (
        <Img src={resolveSrc(source as string)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(circle at 30% 20%, #2a2140 0%, #121018 60%, #0b0a0f 100%)",
          }}
        />
      )}
      <MagicBadge kind={kind} state={state} />
    </AbsoluteFill>
  );
};
