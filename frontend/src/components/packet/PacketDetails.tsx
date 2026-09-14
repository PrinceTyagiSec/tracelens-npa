import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { ProtocolLayer } from '../../types';

interface PacketDetailsProps {
  layers: ProtocolLayer[];
  packetNo: number | null;
  onExplainWithAi?: (packetNo: number) => void;
}

export const PacketDetails: React.FC<PacketDetailsProps> = ({
  layers,
  packetNo,
  onExplainWithAi
}) => {
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});

  const toggleLayer = (layerName: string) => {
    setExpandedLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {};
    layers.forEach((l) => (allExp[l.name] = true));
    setExpandedLayers(allExp);
  };

  const handleCollapseAll = () => {
    setExpandedLayers({});
  };

  if (!packetNo || layers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 font-mono text-xs select-none">
        <Layers className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
        <p>Select a packet to view protocol layers and dissected fields.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1321] text-xs font-mono select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111827] border-b border-slate-800 text-slate-300">
        <div className="flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-200">Packet {packetNo} Dissection Tree</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          {onExplainWithAi && (
            <button
              onClick={() => onExplainWithAi(packetNo)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Explain with AI</span>
            </button>
          )}
          <button
            onClick={handleExpandAll}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Layers Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.map((layer, idx) => {
          const isExpanded = expandedLayers[layer.name] ?? idx < 2; // Expand top 2 by default
          const fieldEntries = Object.entries(layer.fields);

          return (
            <div key={idx} className="border border-slate-800/80 rounded bg-slate-900/50 overflow-hidden">
              {/* Layer Summary Header */}
              <div
                onClick={() => toggleLayer(layer.name)}
                className="flex items-center px-2 py-1.5 bg-slate-850/70 hover:bg-slate-800/60 cursor-pointer text-slate-200 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                )}
                <span className="font-semibold text-sky-300 text-[11px] truncate">
                  {layer.summary || layer.name}
                </span>
              </div>

              {/* Collapsed Fields */}
              {isExpanded && fieldEntries.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-950/40 border-t border-slate-850 space-y-1">
                  {fieldEntries.map(([key, val], fIdx) => (
                    <div key={fIdx} className="flex items-start text-[11px] leading-relaxed">
                      <span className="text-slate-400 w-52 shrink-0 truncate select-text pr-2" title={key}>
                        {key}:
                      </span>
                      <span className="text-slate-200 flex-1 break-all select-text font-medium">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
