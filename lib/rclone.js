import { spawn } from "node:child_process";

export function which(cmd) {
  const safe = String(cmd || "").replace(/[^a-zA-Z0-9._+-]/g, "");
  if (!safe) return Promise.resolve("");
  return new Promise((r) => {
    const child = spawn("bash", ["-lc", `command -v ${safe}`], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (c) => r(c === 0 ? out.trim() : ""));
  });
}

export function assertRemote(name) {
  const n = String(name || "").trim();
  if (!n || !/^[A-Za-z0-9._@+-]+$/.test(n) || n.length > 64) throw new Error("invalid rclone remote name");
  return n;
}

export function assertRemotePath(remotePath) {
  // remote:path form
  const s = String(remotePath || "").trim();
  if (!s || s.includes("\0") || s.includes("..")) throw new Error("invalid remote path");
  if (!/^[A-Za-z0-9._@+-]+:/.test(s) && !s.startsWith(":")) {
    // allow remote: or remote:folder
    throw new Error("path must be remote:path (e.g. s3:bucket/prefix)");
  }
  const remote = s.split(":")[0];
  if (remote) assertRemote(remote);
  if (s.length > 500) throw new Error("path too long");
  return s;
}

export function run(bin, args, { timeoutMs = 60_000, maxOut = 80_000 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("timeout"));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d;
      if (stdout.length > maxOut * 2) child.kill("SIGKILL");
    });
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      clearTimeout(t);
      resolvePromise({
        code,
        stdout: stdout.slice(0, maxOut),
        stderr: stderr.slice(0, 4000),
        truncated: stdout.length > maxOut,
      });
    });
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function rcloneStatus() {
  return { ok: true, rclone: (await which("rclone")) || null };
}

export async function rcloneListRemotes({ timeoutMs } = {}) {
  const bin = (await which("rclone")) || "rclone";
  const r = await run(bin, ["listremotes"], { timeoutMs: timeoutMs || 15_000, maxOut: 20_000 });
  if (r.code !== 0) throw new Error(`rclone listremotes failed: ${r.stderr || r.code}`);
  const remotes = r.stdout
    .split("\n")
    .map((s) => s.trim().replace(/:$/, ""))
    .filter(Boolean);
  return { ok: true, remotes };
}

export async function rcloneLsf({ remotePath, maxEntries = 100, timeoutMs, maxOut = 60_000 } = {}) {
  const path = assertRemotePath(remotePath);
  const n = Math.min(500, Math.max(1, Number(maxEntries) || 100));
  const bin = (await which("rclone")) || "rclone";
  // lsf is listing only — no transfer
  const r = await run(bin, ["lsf", "-R", "--max-depth", "3", path], { timeoutMs: timeoutMs || 60_000, maxOut });
  if (r.code !== 0) throw new Error(`rclone lsf failed: ${r.stderr || r.code}`);
  const entries = r.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, n);
  return { ok: true, path, count: entries.length, truncated: r.truncated || entries.length >= n, entries };
}

export async function rcloneAbout({ remote, timeoutMs } = {}) {
  const name = assertRemote(remote);
  const bin = (await which("rclone")) || "rclone";
  const r = await run(bin, ["about", `${name}:`, "--json"], { timeoutMs: timeoutMs || 30_000, maxOut: 20_000 });
  if (r.code !== 0) {
    // some remotes lack about
    const r2 = await run(bin, ["about", `${name}:`], { timeoutMs: timeoutMs || 30_000, maxOut: 20_000 });
    if (r2.code !== 0) throw new Error(`rclone about failed: ${r2.stderr || r2.code}`);
    return { ok: true, remote: name, output: r2.stdout };
  }
  let json;
  try {
    json = JSON.parse(r.stdout || "{}");
  } catch {
    json = null;
  }
  return { ok: true, remote: name, about: json, output: json ? null : r.stdout };
}
