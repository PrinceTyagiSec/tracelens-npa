import React, { useState, useEffect } from 'react';
import {
  X, Shield, AlertTriangle, Sparkles, Download, ExternalLink, RefreshCw, Key, Search, Bug
} from 'lucide-react';
import { SecurityFinding, RiskScore, IocItem } from '../../types';
import { api } from '../../services/api';

interface SecurityFindingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  captureId: string | null;
  onSelectPacket: (packetNo: number) => void;
  onAskAiAboutFinding: (finding: SecurityFinding) => void;
}

export const SecurityFindingsPanel: React.FC<SecurityFindingsPanelProps> = ({
  isOpen,
  onClose,
  captureId,
  onSelectPacket,
  onAskAiAboutFinding
}) => {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [iocs, setIocs] = useState<IocItem[]>([]);
  const [activeTab, setActiveTab] = useState<'findings' | 'iocs'>('findings');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && captureId) {
      loadSecurityData();
    }
  }, [isOpen, captureId]);

  const loadSecurityData = async () => {
    if (!captureId) return;
    setLoading(true);
    try {
      const [fData, rData, iocData] = await Promise.all([
        api.getSecurityFindings(captureId),
        api.getRiskScore(captureId),
        api.getIocs(captureId)
      ]);
      setFindings(fData);
      setRisk(rData);
      setIocs(iocData);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'LOW':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-sm text-white">Network Security & Threat Analysis</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadSecurityData}
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

        {/* Risk Score Banner */}
        {risk && (
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Score Gauge */}
              <div className="flex items-center space-x-2">
                <div
                  className={`text-2xl font-black px-3 py-1 rounded-lg border ${
                    risk.score >= 70
                      ? 'bg-rose-950/60 border-rose-600 text-rose-400'
                      : risk.score >= 40
                      ? 'bg-amber-950/60 border-amber-600 text-amber-400'
                      : 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                  }`}
                >
                  {risk.score} / 100
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-semibold">
                    Network Risk Assessment
                  </span>
                  <span
                    className={`font-bold text-xs uppercase ${
                      risk.level === 'CRITICAL' || risk.level === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {risk.level} RISK
                  </span>
                  <span className="text-slate-500 text-[10px] ml-1.5">({risk.label})</span>
                </div>
              </div>

              {/* Detections Summary */}
              <div className="flex items-center space-x-2 border-l border-slate-800 pl-4 text-[11px]">
                <span className="text-slate-400">Detections:</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {risk.findings_count.CRITICAL || 0} Critical
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {risk.findings_count.HIGH || 0} High
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {risk.findings_count.MEDIUM || 0} Medium
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('findings')}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  activeTab === 'findings'
                    ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                Security Findings ({findings.length})
              </button>
              <button
                onClick={() => setActiveTab('iocs')}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  activeTab === 'iocs'
                    ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                Indicators (IOCs) ({iocs.length})
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>Analyzing traffic and security heuristics...</span>
            </div>
          ) : activeTab === 'findings' ? (
            findings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Shield className="w-8 h-8 text-emerald-400/40 mb-2" />
                <p className="font-semibold text-slate-300">No anomalous security findings detected.</p>
                <p className="text-[11px]">All observed traffic conforms to normal baseline patterns.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map((f) => (
                  <div
                    key={f.id}
                    className="border border-slate-800 rounded-lg p-3.5 bg-slate-950/60 hover:border-slate-700 transition-colors flex flex-col space-y-2.5"
                  >
                    {/* Title & Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(f.severity)}`}>
                          {f.severity}
                        </span>
                        <span className="font-bold text-slate-100 text-sm">{f.title}</span>
                        <span className="text-slate-500 text-[11px]">({f.category})</span>
                      </div>

                      <button
                        onClick={() => onAskAiAboutFinding(f)}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI</span>
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-slate-300 text-xs leading-relaxed">{f.description}</p>

                    {/* Evidence */}
                    {f.evidence && (
                      <div className="bg-slate-900 border border-slate-850 rounded p-2 text-[11px] font-mono text-slate-200">
                        <span className="text-slate-400 font-semibold block mb-0.5 text-[10px] uppercase">
                          Evidence:
                        </span>
                        <pre className="whitespace-pre-wrap select-text">{f.evidence}</pre>
                      </div>
                    )}

                    {/* Affected Packets & Hosts */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">Affected Packets:</span>
                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                          {f.affected_packets.map((pNo) => (
                            <button
                              key={pNo}
                              onClick={() => {
                                onSelectPacket(pNo);
                                onClose();
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold hover:underline"
                            >
                              #{pNo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-slate-400">
                        <span>Hosts: </span>
                        <span className="text-slate-200 font-medium">{f.affected_hosts.join(', ')}</span>
                      </div>
                    </div>

                    {/* Why it matters & Recommendation */}
                    <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-850 space-y-1">
                      <div>
                        <span className="text-amber-400 font-semibold">Impact: </span>
                        <span>{f.why_it_matters}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-semibold">Remediation: </span>
                        <span>{f.recommendation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* IOCs View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">
                  Extracted Indicators of Compromise & Interest (IPs, Domains, URLs, User-Agents)
                </span>
                <div className="flex items-center space-x-1">
                  <a
                    href={`/api/captures/${captureId}/analysis/iocs/export?format=csv`}
                    download
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </a>
                  <a
                    href={`/api/captures/${captureId}/analysis/iocs/export?format=json`}
                    download
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </a>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <div className="flex items-center bg-slate-900 border-b border-slate-800 py-2 px-3 text-slate-400 font-semibold text-[11px]">
                  <div className="w-28">Type</div>
                  <div className="w-64">Indicator Value</div>
                  <div className="flex-1">Context</div>
                  <div className="w-28 text-center">First Seen</div>
                  <div className="w-20 text-right pr-3">Occurrences</div>
                </div>
                <div className="overflow-y-auto max-h-[55vh]">
                  {iocs.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center py-2 px-3 border-b border-slate-900 hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="w-28">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 font-bold uppercase">
                          {item.type}
                        </span>
                      </div>
                      <div className="w-64 text-slate-200 font-bold truncate select-text">{item.value}</div>
                      <div className="flex-1 text-slate-400 truncate">{item.context}</div>
                      <div className="w-28 text-center">
                        <button
                          onClick={() => {
                            onSelectPacket(item.first_seen_packet);
                            onClose();
                          }}
                          className="text-sky-400 hover:underline"
                        >
                          Packet #{item.first_seen_packet}
                        </button>
                      </div>
                      <div className="w-20 text-right pr-3 text-slate-300 font-bold">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
