import React, { useState, useEffect } from 'react';
import { X, Sparkles, Download, Copy, Check, Printer, RefreshCw, Shield } from 'lucide-react';
import { api } from '../../services/api';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  captureId: string | null;
}

export const AiReportModal: React.FC<AiReportModalProps> = ({
  isOpen,
  onClose,
  captureId
}) => {
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && captureId && !reportMarkdown) {
      handleGenerateReport();
    }
  }, [isOpen, captureId]);

  const handleGenerateReport = async () => {
    if (!captureId) return;
    setLoading(true);
    try {
      const res = await api.generateAiReport(captureId);
      setReportMarkdown(res.markdown || '');
    } catch (err: any) {
      setReportMarkdown('Failed to generate report: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TraceLens_Security_Report_${captureId}.md`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-4xl h-[90vh] overflow-hidden shadow-2xl flex flex-col text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-sm text-white">AI Security & Traffic Analysis Report</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>

            <button
              onClick={handleDownloadMd}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-auto p-6 bg-[#0a0e17] text-slate-200 select-text leading-relaxed">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="font-semibold text-slate-300">Generating comprehensive security report with Ollama...</p>
              <p className="text-[11px]">Compiling network topology, security findings, and remediation steps.</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
              {reportMarkdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
