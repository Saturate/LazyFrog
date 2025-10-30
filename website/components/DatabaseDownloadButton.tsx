import { Download } from 'lucide-react';
import { MissionRecord } from '@lazyfrog/types';

interface DatabaseDownloadButtonProps {
  missions: MissionRecord[];
  isLoading: boolean;
}

export function DatabaseDownloadButton({ missions, isLoading }: DatabaseDownloadButtonProps) {
  const handleDownload = () => {
    // Convert array back to object keyed by postId
    const database = missions.reduce((acc, mission) => {
      acc[mission.postId] = mission;
      return acc;
    }, {} as Record<string, MissionRecord>);

    const json = JSON.stringify(database, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `missions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const estimatedSize = formatFileSize(
    new Blob([JSON.stringify(missions)]).size
  );

  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-3 px-6 py-3 bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 rounded-full font-medium cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-medium transition-colors shadow-lg hover:shadow-xl"
    >
      <Download className="w-5 h-5" />
      <div className="text-left">
        <div>Download Database</div>
        <div className="text-xs opacity-90">
          {missions.length.toLocaleString()} missions • {estimatedSize}
        </div>
      </div>
    </button>
  );
}
