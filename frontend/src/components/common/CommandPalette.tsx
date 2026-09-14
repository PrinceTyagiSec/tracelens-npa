import React, { useState, useEffect } from 'react';
import {
  Search, FileUp, HardDrive, Play, Square, BarChart2, Shield,
  Terminal, Sparkles, Settings, X
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-24 z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-mono text-xs select-none">
        {/* Search Input */}
        <div className="flex items-center px-3 py-2.5 bg-slate-900 border-b border-slate-800">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search actions (Ctrl+K)..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
            autoFocus
          />
          <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No matching commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <span className={idx === selectedIndex ? 'text-white' : 'text-slate-400'}>
                    {cmd.icon}
                  </span>
                  <span className="truncate">{cmd.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase ${
                    idx === selectedIndex ? 'bg-sky-700 text-sky-200' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {cmd.category}
                  </span>
                </div>

                {cmd.shortcut && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    idx === selectedIndex ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
