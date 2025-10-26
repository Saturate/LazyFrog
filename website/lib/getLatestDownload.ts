import fs from "fs";
import path from "path";

function compareVersions(a: string, b: string) {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

export function getLatestDownload() {
  const downloadsDir = path.join(process.cwd(), "public", "downloads");
  let newest = null as null | { filename: string; version: string };
  try {
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (!file.endsWith(".zip")) continue;
      const m = file.match(/lazyfrog-(\d+\.\d+\.\d+)\.zip$/);
      if (!m) continue;
      const version = m[1];
      if (!newest || compareVersions(version, newest.version) > 0) {
        newest = { filename: file, version };
      }
    }
  } catch {
    // ignore; fall back below
  }
  if (!newest) {
    return {
      href: "/downloads/lazyfrog-0.10.0.zip",
      version: "0.10.0",
    };
  }
  return {
    href: `/downloads/${newest.filename}`,
    version: newest.version,
  };
}
