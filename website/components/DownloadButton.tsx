import { Download } from "lucide-react";

export default function DownloadButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors shadow-lg"
    >
      <Download size={24} />
      {label}
    </a>
  );
}
