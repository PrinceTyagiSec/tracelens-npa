import React from 'react';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import { PacketSummary } from '../../types';

interface StatusBarProps {
  totalPackets: number;
  filteredPackets: number;
  selectedPacket: PacketSummary | null;
  captureFilename: string | null;
  isCapturing: boolean;
  packetRate: number;
  byteRate: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalPackets,
  filteredPackets,
  selectedPacket,
  captureFilename,
  isCapturing,
  packetRate,
  byteRate
}) => {
  return (
    <footer className="bg-[#0f172a] border-t border-slate-800 px-3 py-1 text-slate-400 font-mono text-[11px] flex items-center justify-between select-none z-20">
      <div className="flex items-center space-x-4">
        {/* Active Capture */}
        <div className="flex items-center space-x-1.5 truncate max-w-xs">
          <span className="text-slate-500">File:</span>
          <span className="text-slate-200 font-semibold truncate">
            {captureFilename || 'No capture loaded'}
          </span>
        </div>

        {/* Packet Counts */}
        <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
          <span>
            Packets: <span className="text-sky-300 font-bold">{totalPackets.toLocaleString()}</span>
          </span>
          {filteredPackets !== totalPackets && (
            <span>
              Displayed: <span className="text-emerald-400 font-bold">{filteredPackets.toLocaleString()}</span> ({((filteredPackets / Math.max(1, totalPackets)) * 100).toFixed(1)}%)
            </span>
          )}
        </div>

        {/* Selected Packet Info */}
        {selectedPacket && (
          <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
            <span>
              Selected: <span className="text-amber-300 font-bold">#{selectedPacket.packet_no}</span>
            </span>
            <span className="text-slate-500">[{selectedPacket.protocol}, {selectedPacket.length} bytes]</span>
          </div>
        )}

        {/* Live Capture Rate */}
        {isCapturing && (
          <div className="flex items-center space-x-2 border-l border-slate-800 pl-3 text-emerald-400 font-semibold">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>{packetRate} pkts/s</span>
            <span>({(byteRate / 1024).toFixed(1)} KB/s)</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3 text-slate-500 text-[10px]">
        <span><strong className="text-slate-400">Ctrl+K</strong> Palette</span>
        <span><strong className="text-slate-400">Ctrl+Shift+A</strong> AI Copilot</span>
        <span><strong className="text-slate-400">↑/↓</strong> Navigate</span>
        <span className="text-sky-500/80">TraceLens NPA</span>
      </div>
    </footer>
  );
};
