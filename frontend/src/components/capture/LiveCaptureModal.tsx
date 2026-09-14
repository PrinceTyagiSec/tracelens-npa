import React, { useState, useEffect } from 'react';
import { Play, Square, Pause, RotateCcw, X, Radio, Activity, Filter, Cpu } from 'lucide-react';
import { NetworkInterface } from '../../types';
import { api } from '../../services/api';

interface LiveCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCapturing: boolean;
  isPaused: boolean;
  onStartCapture: (interfaceId: string, bpfFilter: string, snaplen: number) => void;
  onPauseCapture: () => void;
  onResumeCapture: () => void;
  onStopCapture: () => void;
  captureStats: {
    total_packets: number;
    total_bytes: number;
    packet_rate: number;
    byte_rate: number;
    duration: number;
  };
}

export const LiveCaptureModal: React.FC<LiveCaptureModalProps> = ({
  isOpen,
  onClose,
  isCapturing,
  isPaused,
  onStartCapture,
  onPauseCapture,
  onResumeCapture,
  onStopCapture,
  captureStats
}) => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [bpfFilter, setBpfFilter] = useState('');
  const [snaplen, setSnaplen] = useState(65535);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInterfaces();
    }
  }, [isOpen]);

  const loadInterfaces = async () => {
    setLoadingInterfaces(true);
    try {
      const list = await api.getInterfaces();
      setInterfaces(list);
      if (list.length > 0 && !selectedInterface) {
        // Default to Ethernet or Loopback or first
        const def = list.find((i) => i.name.toLowerCase().includes('ethernet') || i.name.toLowerCase().includes('loopback')) || list[0];
        setSelectedInterface(def.id);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingInterfaces(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-sm text-white">Live Packet Capture Engine</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Interface Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>Network Interface:</span>
              <button
                onClick={loadInterfaces}
                className="text-sky-400 hover:underline text-[11px] font-normal"
              >
                Refresh Interfaces
              </button>
            </label>

            {loadingInterfaces ? (
              <div className="text-slate-500 py-2">Scanning network interfaces...</div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {interfaces.map((iface) => (
                  <div
                    key={iface.id}
                    onClick={() => !isCapturing && setSelectedInterface(iface.id)}
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                      selectedInterface === iface.id
                        ? 'bg-sky-950/60 border-sky-500 text-sky-200 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    } ${isCapturing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{iface.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                      ID #{iface.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BPF Capture Filter */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center space-x-1">
              <Filter className="w-3 h-3 text-sky-400" />
              <span>Capture Filter (BPF):</span>
            </label>
            <input
              type="text"
              value={bpfFilter}
              disabled={isCapturing}
              onChange={(e) => setBpfFilter(e.target.value)}
              placeholder="e.g. tcp port 80, udp port 53, host 192.168.1.1 (leave blank for all packets)"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500 disabled:opacity-50 font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Capture filters run in Npcap/kernel space to discard packets before they reach memory.
            </span>
          </div>

          {/* Snap length */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Snap Length (bytes):
            </label>
            <input
              type="number"
              value={snaplen}
              disabled={isCapturing}
              onChange={(e) => setSnaplen(parseInt(e.target.value) || 65535)}
              className="w-32 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-sky-500 disabled:opacity-50 font-mono"
            />
          </div>

          {/* Live Metrics Display */}
          {isCapturing && (
            <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-center">
                <span className="text-slate-500 text-[10px] block">Packets</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {captureStats.total_packets.toLocaleString()}
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 text-[10px] block">Data</span>
                <span className="text-sky-400 font-bold text-sm">
                  {(captureStats.total_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 text-[10px] block">Packet Rate</span>
                <span className="text-amber-400 font-bold text-sm">
                  {captureStats.packet_rate} /s
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 text-[10px] block">Duration</span>
                <span className="text-purple-400 font-bold text-sm">
                  {captureStats.duration}s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-[#0f172a] border-t border-slate-800 flex items-center justify-between">
          <div className="text-slate-400 text-[11px] flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>{isCapturing ? (isPaused ? 'Capture Paused' : 'Capturing in real-time...') : 'Ready to capture'}</span>
          </div>

          <div className="flex items-center space-x-2">
            {!isCapturing ? (
              <button
                onClick={() => onStartCapture(selectedInterface, bpfFilter, snaplen)}
                disabled={!selectedInterface}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Capture</span>
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={onResumeCapture}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={onPauseCapture}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}
                <button
                  onClick={onStopCapture}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
