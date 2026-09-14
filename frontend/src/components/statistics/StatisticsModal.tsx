import React, { useState, useEffect } from 'react';
import {
  X, BarChart2, Globe, Users, Network, TrendingUp, Filter, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { EndpointStat, ConversationStat, ProtocolTreeNode, IOGraphPoint } from '../../types';
import { api } from '../../services/api';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  captureId: string | null;
  onApplyFilter: (filterExpr: string) => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  captureId,
  onApplyFilter
}) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'conversations' | 'protocols' | 'iograph'>('endpoints');
  const [endpoints, setEndpoints] = useState<EndpointStat[]>([]);
  const [conversations, setConversations] = useState<ConversationStat[]>([]);
  const [protocolTree, setProtocolTree] = useState<ProtocolTreeNode[]>([]);
  const [ioPoints, setIoPoints] = useState<IOGraphPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && captureId) {
      loadTabData();
    }
  }, [isOpen, captureId, activeTab]);

  const loadTabData = async () => {
    if (!captureId) return;
    setLoading(true);
    try {
      if (activeTab === 'endpoints') {
        const data = await api.getEndpoints(captureId);
        setEndpoints(data);
      } else if (activeTab === 'conversations') {
        const data = await api.getConversations(captureId);
        setConversations(data);
      } else if (activeTab === 'protocols') {
        const data = await api.getProtocolHierarchy(captureId);
        setProtocolTree(data);
      } else if (activeTab === 'iograph') {
        const data = await api.getIOGraph(captureId);
        setIoPoints(data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const renderProtocolNode = (node: ProtocolTreeNode, depth: number = 0) => {
    return (
      <React.Fragment key={node.protocol + depth}>
        <div
          className="flex items-center py-1.5 px-3 border-b border-slate-850 hover:bg-slate-800/40 text-xs font-mono"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          <span className="font-semibold text-sky-300 w-48 truncate">{node.name}</span>
          <span className="w-24 text-right pr-4 text-slate-300">{node.packets.toLocaleString()}</span>
          <span className="w-20 text-right pr-4 text-slate-400">{node.percent_packets}%</span>
          <span className="w-28 text-right pr-4 text-slate-300">{(node.bytes / 1024).toFixed(1)} KB</span>
          <span className="w-20 text-right pr-4 text-slate-400">{node.percent_bytes}%</span>
        </div>
        {node.children && node.children.map((child) => renderProtocolNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm text-white">Network Traffic Statistics</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadTabData}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 py-2 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === 'endpoints'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Endpoints</span>
          </button>

          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === 'conversations'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Conversations</span>
          </button>

          <button
            onClick={() => setActiveTab('protocols')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === 'protocols'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-emerald-400" />
            <span>Protocol Hierarchy</span>
          </button>

          <button
            onClick={() => setActiveTab('iograph')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === 'iograph'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>I/O Traffic Graph</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>Calculating statistics...</span>
            </div>
          ) : (
            <>
              {/* Endpoints Table */}
              {activeTab === 'endpoints' && (
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <div className="flex items-center bg-slate-900 border-b border-slate-800 py-2 px-3 text-slate-400 font-semibold text-[11px]">
                    <div className="w-44">IP Address</div>
                    <div className="w-36">Locality</div>
                    <div className="w-24 text-right pr-4">Packets</div>
                    <div className="w-28 text-right pr-4">Bytes</div>
                    <div className="w-24 text-right pr-4">Tx Packets</div>
                    <div className="w-24 text-right pr-4">Rx Packets</div>
                    <div className="flex-1 text-center">Action</div>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh]">
                    {endpoints.map((ep, i) => (
                      <div
                        key={i}
                        className="flex items-center py-2 px-3 border-b border-slate-900 hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="w-44 text-sky-300 font-semibold">{ep.ip}</div>
                        <div className="w-36 text-slate-400">{ep.country}</div>
                        <div className="w-24 text-right pr-4 text-slate-200 font-bold">{ep.packets.toLocaleString()}</div>
                        <div className="w-28 text-right pr-4 text-slate-300">{(ep.bytes / 1024).toFixed(1)} KB</div>
                        <div className="w-24 text-right pr-4 text-slate-400">{ep.packets_sent}</div>
                        <div className="w-24 text-right pr-4 text-slate-400">{ep.packets_recv}</div>
                        <div className="flex-1 text-center">
                          <button
                            onClick={() => {
                              onApplyFilter(`ip.addr == ${ep.ip}`);
                              onClose();
                            }}
                            className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px]"
                          >
                            Filter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations Table */}
              {activeTab === 'conversations' && (
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <div className="flex items-center bg-slate-900 border-b border-slate-800 py-2 px-3 text-slate-400 font-semibold text-[11px]">
                    <div className="w-20">Protocol</div>
                    <div className="w-48">Host A</div>
                    <div className="w-48">Host B</div>
                    <div className="w-24 text-right pr-4">Packets</div>
                    <div className="w-28 text-right pr-4">Bytes</div>
                    <div className="w-24 text-right pr-4">Duration</div>
                    <div className="flex-1 text-center">Action</div>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh]">
                    {conversations.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center py-2 px-3 border-b border-slate-900 hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="w-20 text-amber-400 font-bold">{c.protocol}</div>
                        <div className="w-48 text-sky-300 truncate">{c.host_a}:{c.port_a || '*'}</div>
                        <div className="w-48 text-purple-300 truncate">{c.host_b}:{c.port_b || '*'}</div>
                        <div className="w-24 text-right pr-4 text-slate-200 font-bold">{c.packets}</div>
                        <div className="w-28 text-right pr-4 text-slate-300">{(c.bytes / 1024).toFixed(1)} KB</div>
                        <div className="w-24 text-right pr-4 text-slate-400">{c.duration}s</div>
                        <div className="flex-1 text-center">
                          <button
                            onClick={() => {
                              onApplyFilter(`ip.addr == ${c.host_a} && ip.addr == ${c.host_b}`);
                              onClose();
                            }}
                            className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px]"
                          >
                            Filter Conv
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol Hierarchy */}
              {activeTab === 'protocols' && (
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <div className="flex items-center bg-slate-900 border-b border-slate-800 py-2 px-3 text-slate-400 font-semibold text-[11px]">
                    <div className="w-48 pl-3">Protocol</div>
                    <div className="w-24 text-right pr-4">Packets</div>
                    <div className="w-20 text-right pr-4">% Packets</div>
                    <div className="w-28 text-right pr-4">Bytes</div>
                    <div className="w-20 text-right pr-4">% Bytes</div>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh]">
                    {protocolTree.map((root) => renderProtocolNode(root, 0))}
                  </div>
                </div>
              )}

              {/* I/O Traffic Graph */}
              {activeTab === 'iograph' && (
                <div className="h-[60vh] flex flex-col space-y-2">
                  <div className="text-slate-400 text-xs">
                    Network Traffic Timeline (Packets & Protocols over Time)
                  </div>
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ioPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="packets" name="All Packets" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="tcp_packets" name="TCP" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="udp_packets" name="UDP" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="dns_packets" name="DNS" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="http_packets" name="HTTP" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
