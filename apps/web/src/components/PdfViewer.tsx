"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface PdfViewerProps {
  url: string;
  title?: string;
}

export function PdfViewer({ url, title }: PdfViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {title && (
        <div className="border-b px-4 py-2 text-sm font-medium text-gray-700">
          {title}
        </div>
      )}

      {/* Custom navigation bar */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>PDF документ</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="rounded p-1 hover:bg-gray-200 disabled:opacity-40"
            disabled={zoom <= 50}
            title="Зменшити"
          >
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </button>
          <span className="min-w-[3rem] text-center text-xs text-gray-600">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded p-1 hover:bg-gray-200 disabled:opacity-40"
            disabled={zoom >= 200}
            title="Збільшити"
          >
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      <div
        className="relative"
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: "none" }}
      >
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full"
          style={{ height: `${6 * zoom}px` }}
          title={title || "PDF Document"}
        />
      </div>
    </div>
  );
}
