"use client";

import React, { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  http_request: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  condition: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
  transform: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
  email: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700" },
  set_variable: { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-700" },
  delay: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" },
  loop: { bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-700" },
  webhook: { bg: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-700" },
  cron: { bg: "bg-lime-50", border: "border-lime-300", text: "text-lime-700" },
};

interface WorkflowNode {
  id: string;
  type: string;
  config?: Record<string, unknown>;
  next?: string[];
  next_true?: string[];
  next_false?: string[];
}

export function WorkflowDiagram({ nodes }: { nodes: WorkflowNode[] }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!nodes || nodes.length === 0) {
    return <p className="text-gray-500 text-sm">Немає вузлів для відображення</p>;
  }

  const content = (
    <div className="flex flex-col items-center gap-2 py-6">
      {nodes.map((node, i) => {
        const colors = NODE_COLORS[node.type] || {
          bg: "bg-gray-50",
          border: "border-gray-300",
          text: "text-gray-700",
        };

        const hasTrue = node.next_true && node.next_true.length > 0;
        const hasFalse = node.next_false && node.next_false.length > 0;
        const isConditional = hasTrue || hasFalse;

        return (
          <React.Fragment key={node.id}>
            <div
              className={`w-56 rounded-lg border-2 ${colors.border} ${colors.bg} p-3 text-center shadow-sm`}
            >
              <div
                className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}
              >
                {node.type.replace(/_/g, " ")}
              </div>
              <div className="text-sm font-medium text-gray-800 mt-1">
                {node.id}
              </div>
              {(() => {
                const url = node.config?.url;
                return url ? (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    {String(url)}
                  </div>
                ) : null;
              })()}
              {isConditional && (
                <div className="mt-2 flex justify-center gap-3 text-xs">
                  {hasTrue && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                      True: {node.next_true!.join(", ")}
                    </span>
                  )}
                  {hasFalse && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                      False: {node.next_false!.join(", ")}
                    </span>
                  )}
                </div>
              )}
            </div>
            {i < nodes.length - 1 && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-300" />
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-300" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div
      className={`relative rounded-xl border bg-white ${
        fullscreen ? "fixed inset-0 z-50 overflow-auto" : ""
      }`}
    >
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="rounded-lg bg-white border p-2 shadow-sm hover:bg-gray-50"
          title={fullscreen ? "Згорнути" : "Повноекранний режим"}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className={`overflow-auto ${fullscreen ? "h-full" : "max-h-[500px]"}`}>
        {content}
      </div>
    </div>
  );
}
