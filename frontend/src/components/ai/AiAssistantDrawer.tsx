import React, { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Send, Bot, User, Trash2, ShieldCheck, ChevronRight, CornerDownRight, Cpu
} from 'lucide-react';
import { api } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  referenced_packets?: number[];
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  captureId: string | null;
  selectedPacketNo: number | null;
  onSelectPacket: (packetNo: number) => void;
  initialPrompt?: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  captureId,
  selectedPacketNo,
  onSelectPacket,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am your TraceLens AI network copilot. I analyze real captured traffic offline using your local Ollama model. Ask me anything about this capture, suspicious traffic, protocols, or specific packets."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadAiModels();
      if (initialPrompt) {
        handleSendMessage(initialPrompt);
      }
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAiModels = async () => {
    try {
      const status = await api.getAiStatus();
      if (status.models && status.models.length > 0) {
        setModels(status.models);
        setSelectedModel(status.default_model || status.models[0]);
      }
    } catch {
      // Ignore
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || !captureId || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const history = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
      const res = await api.chatWithAi({
        message: text,
        capture_id: captureId,
        selected_packet_no: selectedPacketNo || undefined,
        history
      });

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.reply,
        referenced_packets: res.referenced_packets
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: 'Error communicating with local Ollama: ' + (err.response?.data?.detail || err.message)
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderContentWithCitations = (content: string, packets?: number[]) => {
    // Replace markdown bold, headings and packet numbers
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs select-text">
        {lines.map((line, i) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={i} className="font-bold text-sky-400 text-sm mt-2 mb-1 border-b border-slate-800 pb-0.5">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={i} className="font-bold text-white text-base mt-3 mb-1">
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <div key={i} className="flex items-start space-x-1.5 pl-2">
                <span className="text-sky-400 font-bold">•</span>
                <span>{line.replace('- ', '')}</span>
              </div>
            );
          }
          return <p key={i}>{line}</p>;
        })}

        {/* Clickable packet citations pills */}
        {packets && packets.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-1.5 flex-wrap gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Jump to packet:</span>
            {packets.map((pNo) => (
              <button
                key={pNo}
                onClick={() => onSelectPacket(pNo)}
                className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold border border-sky-500/40 text-[11px] transition-colors"
              >
                Packet #{pNo}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[#0f172a] border-l border-slate-700 shadow-2xl z-50 flex flex-col font-mono text-xs select-none">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0b0f19] border-b border-slate-800 text-slate-200">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Network AI Assistant</span>
            <div className="flex items-center space-x-1 text-[10px] text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>Offline Local Processing (Ollama)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Model selector */}
          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setMessages([messages[0]])}
            title="Clear Chat"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Packet Indicator */}
      {selectedPacketNo && (
        <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            Active Context: <span className="text-sky-300 font-semibold">Packet #{selectedPacketNo}</span>
          </span>
          <button
            onClick={() => handleSendMessage(`Explain packet #${selectedPacketNo} in detail`)}
            className="text-sky-400 hover:underline flex items-center space-x-1"
          >
            <span>Ask about this packet</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0e17]">
        {messages.map((m) => {
          const isAi = m.role === 'assistant';
          return (
            <div key={m.id} className={`flex items-start space-x-2.5 ${isAi ? '' : 'flex-row-reverse space-x-reverse'}`}>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isAi ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-xl p-3 max-w-[85%] border shadow-md ${
                  isAi
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-sky-600 border-sky-500 text-white select-text'
                }`}
              >
                {isAi ? renderContentWithCitations(m.content, m.referenced_packets) : m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-400 text-xs flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Analyzing capture evidence with Ollama...</span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 py-2 bg-slate-900 border-t border-slate-850 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => handleSendMessage("What happened in this capture?")}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 whitespace-nowrap shrink-0 border border-slate-700/60"
        >
          What happened?
        </button>
        <button
          onClick={() => handleSendMessage("What are the most suspicious things in this capture?")}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 whitespace-nowrap shrink-0 border border-slate-700/60"
        >
          Find threats
        </button>
        <button
          onClick={() => handleSendMessage("Were any plaintext credentials transmitted?")}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 whitespace-nowrap shrink-0 border border-slate-700/60"
        >
          Credential check
        </button>
        <button
          onClick={() => handleSendMessage("Show me all DNS activity and any abnormal queries.")}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 whitespace-nowrap shrink-0 border border-slate-700/60"
        >
          DNS analysis
        </button>
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-[#0b0f19] border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about this network capture..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputValue.trim()}
          className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
