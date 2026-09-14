import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Bookmark, MessageSquare, Sparkles, Terminal } from 'lucide-react';
import { PacketSummary } from '../../types';

interface PacketTableProps {
  packets: PacketSummary[];
  selectedPacketNo: number | null;
  onSelectPacket: (packetNo: number) => void;
  onToggleMark: (packetNo: number, marked: boolean) => void;
  onAddComment: (packetNo: number) => void;
  onExplainWithAi: (packetNo: number) => void;
  onFollowStream: (packetNo: number) => void;
}

export const PacketTable: React.FC<PacketTableProps> = ({
  packets,
  selectedPacketNo,
  onSelectPacket,
  onToggleMark,
  onAddComment,
  onExplainWithAi,
  onFollowStream
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: packets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 15
  });

  // Handle keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedPacketNo === null && packets.length > 0) {
          onSelectPacket(packets[0].packet_no);
        } else {
          const idx = packets.findIndex((p) => p.packet_no === selectedPacketNo);
          if (idx !== -1 && idx < packets.length - 1) {
            onSelectPacket(packets[idx + 1].packet_no);
            rowVirtualizer.scrollToIndex(idx + 1);
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = packets.findIndex((p) => p.packet_no === selectedPacketNo);
        if (idx > 0) {
          onSelectPacket(packets[idx - 1].packet_no);
          rowVirtualizer.scrollToIndex(idx - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPacketNo, packets, onSelectPacket, rowVirtualizer]);

  // Protocol styling helper
  const getProtoClass = (proto: string) => {
    const p = proto.toUpperCase();
    if (p.includes('TCP')) return 'text-sky-400 bg-sky-950/40 border-sky-800/40';
    if (p.includes('UDP')) return 'text-purple-400 bg-purple-950/40 border-purple-800/40';
    if (p.includes('HTTP')) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    if (p.includes('DNS')) return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    if (p.includes('TLS')) return 'text-pink-400 bg-pink-950/40 border-pink-800/40';
    if (p.includes('ICMP')) return 'text-slate-300 bg-slate-800/60 border-slate-700/40';
    if (p.includes('ARP')) return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
    return 'text-slate-400 bg-slate-900 border-slate-800';
  };

  if (packets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
        <p className="text-slate-400 font-semibold mb-1">No Packets Displayed</p>
        <p>Open a PCAP file or start a live packet capture from the top toolbar.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] select-none text-xs font-mono overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center bg-[#111827] border-b border-slate-800 text-slate-400 font-semibold text-[11px] py-1.5 px-2 select-none shadow-sm z-10">
        <div className="w-12 shrink-0 text-center">No.</div>
        <div className="w-20 shrink-0 text-right pr-3">Time</div>
        <div className="w-36 shrink-0 pl-1 truncate">Source</div>
        <div className="w-36 shrink-0 pl-1 truncate">Destination</div>
        <div className="w-20 shrink-0 text-center">Protocol</div>
        <div className="w-16 shrink-0 text-right pr-3">Length</div>
        <div className="flex-1 pl-2 truncate">Info</div>
        <div className="w-16 shrink-0 text-center">Actions</div>
      </div>

      {/* Virtualized Body */}
      <div ref={parentRef} className="flex-1 overflow-y-auto relative">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const p = packets[virtualRow.index];
            const isSelected = p.packet_no === selectedPacketNo;

            return (
              <div
                key={p.packet_no}
                onClick={() => onSelectPacket(p.packet_no)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center px-2 cursor-pointer border-b transition-colors ${
                  isSelected
                    ? 'bg-sky-950/70 border-sky-600/60 text-white'
                    : p.marked
                    ? 'bg-amber-950/30 border-slate-800/60 text-amber-200 hover:bg-amber-950/50'
                    : virtualRow.index % 2 === 0
                    ? 'bg-[#0b0f19] border-slate-900/80 hover:bg-slate-850 text-slate-300'
                    : 'bg-[#0e1422] border-slate-900/80 hover:bg-slate-850 text-slate-300'
                }`}
              >
                {/* No. */}
                <div className="w-12 shrink-0 text-center flex items-center justify-center space-x-1">
                  {p.marked && <Bookmark className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                  <span>{p.packet_no}</span>
                </div>

                {/* Time */}
                <div className="w-20 shrink-0 text-right pr-3 text-slate-400 text-[11px]">
                  {p.time_delta.toFixed(4)}
                </div>

                {/* Source */}
                <div className="w-36 shrink-0 pl-1 truncate text-slate-200">
                  {p.src_ip}
                  {p.src_port ? `:${p.src_port}` : ''}
                </div>

                {/* Destination */}
                <div className="w-36 shrink-0 pl-1 truncate text-slate-200">
                  {p.dst_ip}
                  {p.dst_port ? `:${p.dst_port}` : ''}
                </div>

                {/* Protocol Badge */}
                <div className="w-20 shrink-0 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getProtoClass(p.protocol)}`}>
                    {p.protocol}
                  </span>
                </div>

                {/* Length */}
                <div className="w-16 shrink-0 text-right pr-3 text-slate-400 text-[11px]">
                  {p.length}
                </div>

                {/* Info summary */}
                <div className="flex-1 pl-2 truncate text-[11px] flex items-center space-x-1.5">
                  <span className="truncate">{p.info}</span>
                  {p.comment && (
                    <span title={`Comment: ${p.comment}`}>
                      <MessageSquare className="w-3 h-3 text-sky-400 shrink-0 inline" />
                    </span>
                  )}
                </div>

                {/* Quick Row Actions */}
                <div className="w-16 shrink-0 flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onExplainWithAi(p.packet_no)}
                    title="Explain with AI"
                    className="p-1 rounded hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onFollowStream(p.packet_no)}
                    title="Follow Stream"
                    className="p-1 rounded hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Terminal className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onToggleMark(p.packet_no, !p.marked)}
                    title={p.marked ? "Unmark Packet" : "Mark Packet"}
                    className={`p-1 rounded transition-colors ${
                      p.marked ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
