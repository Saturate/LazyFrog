import { Download, Package, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { getAllDownloads, formatFileSize } from "@/lib/getAllDownloads";
import { getLatestDownload } from "@/lib/getLatestDownload";

export const dynamic = "force-static";
export const revalidate = false; // Build-time only
export const runtime = "nodejs";

export default function DownloadsPage() {
  const releases = getAllDownloads();
  const { version: latestVersion } = getLatestDownload();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-zinc-900 dark:to-emerald-950">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-600 rounded-full">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-400">
                All Releases
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Download any version of LazyFrog
              </p>
            </div>
          </div>
        </div>

        {/* No Releases Found */}
        {releases.length === 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No releases found
            </p>
          </div>
        )}

        {/* Releases List */}
        {releases.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Version
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Browser
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Size
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((release) => {
                    const isLatest = release.version === latestVersion && release.browser === 'chrome';
                    return (
                      <tr
                        key={release.filename}
                        className="border-b border-gray-100 dark:border-zinc-700 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <code className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                              v{release.version}
                            </code>
                            {isLatest && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                                <Check size={12} />
                                Latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium capitalize">
                            {release.browser}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">
                            {formatFileSize(release.fileSize)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <a
                            href={release.href}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download size={16} />
                            Download
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Installation Instructions
          </h3>
          <p className="text-blue-700 dark:text-blue-200 text-sm">
            After downloading, extract the ZIP file and load it as an unpacked
            extension in Chrome. See the{" "}
            <Link
              href="/"
              className="underline hover:text-blue-600 dark:hover:text-blue-100"
            >
              homepage
            </Link>{" "}
            for detailed installation instructions.
          </p>
        </div>
      </div>
    </div>
  );
}
