import React, { useState, useEffect } from 'react';
import { X, Terminal, ArrowRight, Download, Copy, Check } from 'lucide-react';
import { StreamData } from '../../types';
import { api } from '../../services/api';

interface StreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  captureId: string | null;
  initialStreamId?: number;
}

export const StreamModal: React.FC<StreamModalProps> = ({
  isOpen,
  onClose,
  captureId,
  initialStreamId = 0
}) => {
  const [streamId, setStreamId] = useState(initialStreamId);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [format, setFormat] = useState<'ascii' | 'hex' | 'raw'>('ascii');
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && captureId) {
      loadStream();
    }
  }, [isOpen, captureId, streamId, protocol]);

  const loadStream = async () => {
    if (!captureId) return;
    setLoading(true);
    try {
      const data = await api.getStream(captureId, streamId, protocol);
      setStreamData(data);
    } catch {
      setStreamData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (!streamData) return;
    const text = streamData.messages
      .map((m) => `[${m.direction.toUpperCase()}] ${m.src} -> ${m.dst}\n${format === 'hex' ? m.payload_hex : (format === 'raw' ? m.payload_raw : m.payload_ascii)}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!streamData) return;
    const text = streamData.messages
      .map((m) => `[${m.direction.toUpperCase()}] ${m.src} -> ${m.dst}\n${format === 'hex' ? m.payload_hex : (format === 'raw' ? m.payload_raw : m.payload_ascii)}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream_${protocol}_${streamId}.txt`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl flex flex-col text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm text-white">
              Follow {protocol.toUpperCase()} Stream #{streamId}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Stream Selector */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 text-[11px]">Stream:</span>
              <input
                type="number"
                min="0"
                value={streamId}
                onChange={(e) => setStreamId(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs"
              />
            </div>

            {/* Protocol */}
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300"
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>

            {/* Format Toggle */}
            <div className="flex bg-slate-900 rounded border border-slate-700 p-0.5">
              {(['ascii', 'hex', 'raw'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`px-2 py-0.5 rounded text-[11px] uppercase transition-colors ${
                    format === fmt ? 'bg-purple-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyAll}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Copy All"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Download Stream"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stream Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#0a0e17]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Reconstructing stream chunks...
            </div>
          ) : !streamData || streamData.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="font-semibold text-slate-400 mb-1">No payload data found in Stream #{streamId}.</p>
              <p className="text-[11px]">Try switching the stream ID or selecting a different TCP/UDP conversation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {streamData.messages.map((msg, i) => {
                const isClient = msg.direction === 'client_to_server';
                const payload =
                  format === 'hex'
                    ? msg.payload_hex
                    : format === 'raw'
                    ? msg.payload_raw
                    : msg.payload_ascii;

                return (
                  <div
                    key={i}
                    className={`rounded-lg p-3 border leading-relaxed ${
                      isClient
                        ? 'bg-sky-950/30 border-sky-800/40 text-sky-200 ml-0 mr-12'
                        : 'bg-rose-950/30 border-rose-800/40 text-rose-200 ml-12 mr-0'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b pb-1 mb-2 border-inherit text-[10px] opacity-75 font-semibold">
                      <span>{isClient ? 'CLIENT → SERVER' : 'SERVER → CLIENT'}</span>
                      <span>{msg.src} → {msg.dst} ({msg.length} bytes)</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] select-text">
                      {payload}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
