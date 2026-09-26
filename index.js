import { rcloneStatus, rcloneListRemotes, rcloneLsf, rcloneAbout } from "./lib/rclone.js";

export const name = "dsh-wsl-rclone";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  if (config.enabled === false) {
    console.log("[dsh-wsl-rclone] disabled");
    return;
  }
  const timeoutMs = positive(config.timeoutMs, 60_000);
  const allowedRemotes = Array.isArray(config.allowedRemotes) ? config.allowedRemotes.map(String) : [];
  console.log(`[dsh-wsl-rclone] allowedRemotes=${allowedRemotes.length || "any (list/lsf/about only)"}`);

  ctx.systemPrompt.section({
    name: "tool:rclone",
    order: 136,
    text: "dsh-wsl-rclone is read-only: listremotes / lsf / about. No copy/sync/delete/move. Prefer allowedRemotes in config for egress control. Never paste rclone.conf secrets into chat.",
  });

  function guardRemote(remoteOrPath) {
    if (!allowedRemotes.length) return;
    const remote = String(remoteOrPath || "").split(":")[0];
    if (!allowedRemotes.includes(remote)) throw new Error(`remote not in allowedRemotes: ${remote}`);
  }

  ctx.tools.register({
    name: "rclone_status",
    description: "Whether rclone is on PATH; version, remote count, allowedRemotes.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }] },
    timeoutMs: 10_000,
    isConcurrencySafe: () => true,
    async execute() {
      return { ...(await rcloneStatus()), allowedRemotes };
    },
    presentCall: () => ({ card: "generic", title: "rclone status" }),
    presentResult: (_a, r) => ({ card: "generic", title: "rclone status", content: r.content }),
  });

  ctx.tools.register({
    name: "rclone_listremotes",
    description: "List configured rclone remotes (names only).",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [
        { type: "text", text: v.ok === false ? v.error : (v.remotes || []).map((x) => `${x}:`).join("\n") || "(none)" },
      ],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute() {
      try {
        const r = await rcloneListRemotes({ timeoutMs });
        if (allowedRemotes.length) {
          r.remotes = (r.remotes || []).filter((x) => allowedRemotes.includes(x));
        }
        return r;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "rclone remotes" }),
    presentResult: (_a, r) => ({ card: "generic", title: "rclone remotes", content: r.content }),
  });

  ctx.tools.register({
    name: "rclone_lsf",
    description: "List remote files (rclone lsf, capped depth). Path like s3:bucket/prefix. No transfer.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["path"],
      properties: {
        path: { type: "string", description: "remote:path" },
        maxEntries: { type: "number" },
      },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [
        {
          type: "text",
          text: v.ok === false ? v.error : [`rclone_lsf count=${v.count}`, ...(v.entries || [])].join("\n"),
        },
      ],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        guardRemote(args.path);
        return await rcloneLsf({ remotePath: args.path, maxEntries: args.maxEntries, timeoutMs });
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "rclone lsf" }),
    presentResult: (_a, r) => ({ card: "generic", title: "rclone lsf", content: r.content }),
  });

  ctx.tools.register({
    name: "rclone_about",
    description: "rclone about <remote>: (quota/usage when supported).",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["remote"],
      properties: { remote: { type: "string" } },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [
        { type: "text", text: v.ok === false ? v.error : JSON.stringify(v.about || v.output, null, 2) },
      ],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        guardRemote(args.remote);
        return await rcloneAbout({ remote: args.remote, timeoutMs });
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "rclone about" }),
    presentResult: (_a, r) => ({ card: "generic", title: "rclone about", content: r.content }),
  });
}

function positive(v, fb) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fb;
}
