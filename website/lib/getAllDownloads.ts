import fs from "fs";
import path from "path";

export interface DownloadRelease {
  version: string;
  filename: string;
  href: string;
  fileSize: number;
}

function compareVersions(a: string, b: string): number {
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get all available downloads from the public/downloads directory
 * Returns releases sorted by version (newest first)
 */
export function getAllDownloads(): DownloadRelease[] {
  const downloadsDir = path.join(process.cwd(), "public", "downloads");
  const releases: DownloadRelease[] = [];

  try {
    const files = fs.readdirSync(downloadsDir);

    for (const file of files) {
      if (!file.endsWith(".zip")) continue;

      const match = file.match(/lazyfrog-(\d+\.\d+\.\d+)\.zip$/);
      if (!match) continue;

      const version = match[1];
      const filePath = path.join(downloadsDir, file);

      // Get file size
      let fileSize = 0;
      try {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      } catch {
        // If we can't get size, default to 0
      }

      releases.push({
        version,
        filename: file,
        href: `/downloads/${file}`,
        fileSize,
      });
    }
  } catch (error) {
    console.error("Error reading downloads directory:", error);
    return [];
  }

  // Sort by version (newest first)
  releases.sort((a, b) => compareVersions(b.version, a.version));

  return releases;
}

/**
 * Format file size for display
 */
export { formatFileSize };
