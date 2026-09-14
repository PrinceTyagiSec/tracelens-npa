import React, { useState } from 'react';
import { Binary, Copy, Check } from 'lucide-react';

interface PacketBytesProps {
  hexDump: string;
  asciiDump: string;
  rawHex: string;
  packetNo: number | null;
}

export const PacketBytes: React.FC<PacketBytesProps> = ({
  hexDump,
  asciiDump,
  rawHex,
  packetNo
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRaw = () => {
    if (!rawHex) return;
    navigator.clipboard.writeText(rawHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!packetNo || !hexDump) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 font-mono text-xs select-none">
        <Binary className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
        <p>Select a packet to view raw hexadecimal and ASCII byte representation.</p>
      </div>
    );
  }

  const hexLines = hexDump.split('\n');
  const asciiLines = asciiDump.split('\n');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-xs font-mono select-text overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111827] border-b border-slate-800 text-slate-300 select-none">
        <div className="flex items-center space-x-2">
          <Binary className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-200">Packet {packetNo} Bytes ({Math.floor(rawHex.length / 2)} bytes)</span>
        </div>

        <button
          onClick={handleCopyRaw}
          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy Hex'}</span>
        </button>
      </div>

      {/* Hex + ASCII Combined Grid */}
      <div className="flex-1 overflow-auto p-2 leading-relaxed text-[11px]">
        <div className="min-w-fit">
          {hexLines.map((hLine, idx) => (
            <div key={idx} className="flex hover:bg-slate-800/40 rounded px-1 transition-colors">
              {/* Hex line */}
              <span className="text-sky-300 mr-4 select-all font-mono">
                {hLine}
              </span>
              {/* ASCII line */}
              <span className="text-emerald-400 select-all font-mono border-l border-slate-800 pl-3">
                {asciiLines[idx] || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
