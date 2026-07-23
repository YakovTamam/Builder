"use client";

import { wazeUrl, type WazeTarget } from "@/lib/waze";

// A convenient "navigate in Waze" button. Renders nothing when the project has
// neither an address nor coordinates to navigate to. Opens the Waze deep link
// in a new tab (the Waze app on mobile, waze.com on desktop).
export default function WazeButton({
  target,
  className,
}: {
  target: WazeTarget;
  className?: string;
}) {
  const url = wazeUrl(target);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors text-white px-4 py-2 text-sm font-medium"
      }
    >
      <span aria-hidden>🚗</span>
      נווט ב-Waze
    </a>
  );
}
