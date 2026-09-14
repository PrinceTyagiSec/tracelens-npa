import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, XCircle, Sparkles, X, Filter } from 'lucide-react';
import { api } from '../../services/api';

interface DisplayFilterBarProps {
  currentFilter: string;
  onApplyFilter: (filterExpr: string) => void;
  onClearFilter: () => void;
  onAiGenerateFilter: (prompt: string) => Promise<string | null>;
}

export const DisplayFilterBar: React.FC<DisplayFilterBarProps> = ({
  currentFilter,
  onApplyFilter,
  onClearFilter,
  onAiGenerateFilter
}) => {
  const [inputVal, setInputVal] = useState(currentFilter);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completions, setCompletions] = useState<{ filter: string; desc: string }[]>([]);
  const [showCompletions, setShowCompletions] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    setInputVal(currentFilter);
  }, [currentFilter]);

  // Validate filter on change
  useEffect(() => {
    if (!inputVal.trim()) {
      setIsValid(null);
      setErrorMessage(null);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.validateFilter(inputVal);
        setIsValid(res.valid);
        setErrorMessage(res.error);
      } catch {
        setIsValid(null);
      }
    }, 400);

    return () => clearTimeout(debounceTimer.current);
  }, [inputVal]);

  // Load completions
  const handleFocus = async () => {
    try {
      const res = await api.getFilterAutocomplete(inputVal);
      setCompletions(res);
      setShowCompletions(true);
    } catch {
      // Ignore
    }
  };

  const handleSelectCompletion = (comp: string) => {
    setInputVal(comp);
    setShowCompletions(false);
    onApplyFilter(comp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowCompletions(false);
      onApplyFilter(inputVal);
    } else if (e.key === 'Escape') {
      setShowCompletions(false);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const generated = await onAiGenerateFilter(aiPrompt);
      if (generated) {
        setInputVal(generated);
        setShowAiInput(false);
        setAiPrompt('');
        onApplyFilter(generated);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="bg-[#0b0f19] border-b border-slate-800 px-3 py-1.5 flex flex-col space-y-1.5 text-xs relative">
      <div className="flex items-center space-x-2">
        <div className="flex items-center text-slate-400 pl-1 font-mono text-[11px] select-none">
          <Filter className="w-3.5 h-3.5 mr-1 text-sky-400" />
          <span>Display Filter:</span>
        </div>

        {/* Filter Input */}
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="e.g. tcp.port == 443 || http || dns || ip.src == 192.168.1.10"
            className={`w-full bg-slate-900 border rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none transition-colors ${
              isValid === true
                ? 'border-emerald-500/50 focus:border-emerald-500'
                : isValid === false
                ? 'border-rose-500/60 focus:border-rose-500'
                : 'border-slate-700 focus:border-sky-500'
            }`}
          />

          {/* Validation Status Indicator */}
          <div className="absolute right-2 flex items-center space-x-1.5">
            {inputVal && (
              <button
                onClick={() => {
                  setInputVal('');
                  onClearFilter();
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isValid === true && (
              <span title="Valid display filter syntax">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </span>
            )}
            {isValid === false && (
              <span title={errorMessage || 'Invalid filter syntax'}>
                <XCircle className="w-4 h-4 text-rose-400" />
              </span>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showCompletions && completions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-md shadow-2xl z-50 py-1">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800 font-semibold">
                Suggested Filters
              </div>
              {completions.map((c, i) => (
                <div
                  key={i}
                  onMouseDown={() => handleSelectCompletion(c.filter)}
                  className="px-2.5 py-1.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-mono text-sky-300 font-medium">{c.filter}</span>
                  <span className="text-slate-400 text-[11px]">{c.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Apply Button */}
        <button
          onClick={() => onApplyFilter(inputVal)}
          className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors select-none"
        >
          Apply
        </button>

        {/* Clear Button */}
        <button
          onClick={() => {
            setInputVal('');
            onClearFilter();
          }}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors select-none"
        >
          Clear
        </button>

        {/* Generate with AI button */}
        <button
          onClick={() => setShowAiInput(!showAiInput)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded border transition-colors select-none ${
            showAiInput
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-purple-400 border-slate-800'
          }`}
          title="Generate filter expression from natural language"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Filter</span>
        </button>
      </div>

      {/* AI Natural Language Filter Input */}
      {showAiInput && (
        <form onSubmit={handleAiSubmit} className="flex items-center space-x-2 bg-purple-950/30 border border-purple-500/20 rounded p-1.5">
          <Sparkles className="w-4 h-4 text-purple-400 ml-1 shrink-0" />
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ask AI in plain English: e.g. 'Show me failed HTTP requests from 192.168.1.10' or 'Find all DNS queries'"
            className="w-full bg-transparent text-purple-100 placeholder-purple-300/40 text-xs focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={isAiGenerating || !aiPrompt.trim()}
            className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium shrink-0 transition-colors"
          >
            {isAiGenerating ? 'Generating...' : 'Propose Filter'}
          </button>
        </form>
      )}

      {/* Error message banner if invalid */}
      {errorMessage && isValid === false && (
        <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded font-mono">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
