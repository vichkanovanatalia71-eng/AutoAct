"use client";

import React from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
  source: "youtube" | "vimeo" | "upload";
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s?]+)/
  );
  return match?.[1] || null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] || null;
}

export function VideoPlayer({ url, title, source }: VideoPlayerProps) {
  if (source === "youtube") {
    const videoId = extractYouTubeId(url);
    if (!videoId) return <p className="text-red-500">Невірний YouTube URL</p>;
    return (
      <div className="rounded-xl overflow-hidden border">
        {title && (
          <div className="border-b px-4 py-2 text-sm font-medium text-gray-700">
            {title}
          </div>
        )}
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={title || "Video"}
          />
        </div>
      </div>
    );
  }

  if (source === "vimeo") {
    const videoId = extractVimeoId(url);
    if (!videoId) return <p className="text-red-500">Невірний Vimeo URL</p>;
    return (
      <div className="rounded-xl overflow-hidden border">
        {title && (
          <div className="border-b px-4 py-2 text-sm font-medium text-gray-700">
            {title}
          </div>
        )}
        <div className="aspect-video">
          <iframe
            src={`https://player.vimeo.com/video/${videoId}`}
            className="w-full h-full"
            allowFullScreen
            title={title || "Video"}
          />
        </div>
      </div>
    );
  }

  // Upload / direct video
  return (
    <div className="rounded-xl overflow-hidden border">
      {title && (
        <div className="border-b px-4 py-2 text-sm font-medium text-gray-700">
          {title}
        </div>
      )}
      <video
        src={url}
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        className="w-full"
      >
        Ваш браузер не підтримує відео.
      </video>
    </div>
  );
}
