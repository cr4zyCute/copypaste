import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Trash2, Plus, User } from 'lucide-react';

interface NameEntry {
  id: string;
  name: string;
  timestamp: number;
}

const STORAGE_KEY = 'quick_connect_names';

export const Messenger: React.FC = () => {
  const [nameInput, setNameInput] = useState('');
  const [names, setNames] = useState<NameEntry[]>(() => {
    // Initialize from local storage
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local storage whenever names change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  }, [names]);

  const getMessage = (firstName: string) => {
    return `Thanks for connecting, ${firstName}. I hope you're having a productive week so far.

I’m curious—with how hard it is to find reliable admin staff right now, are you currently handling your after-hours and overflow calls in-house, or is that responsibility falling on your on-call technicians? 

I’ve been chatting with several team leads in your space, and many are finding it increasingly difficult to balance technical work with customer service during peak times. I'd love to get your perspective on how teams your size are adapting to these staffing challenges.`;
  };

  const handleAddName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = nameInput.trim();
    if (!trimmedInput) return;

    // Extract first name: split by space and take the first part
    const firstName = trimmedInput.split(/\s+/)[0];
    
    // Capitalize first letter just in case
    const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    const newEntry: NameEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: formattedName,
      timestamp: Date.now(),
    };

    setNames([newEntry, ...names]);
    setNameInput('');
    inputRef.current?.focus();
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDelete = (id: string) => {
    setNames(names.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Clear all names?')) {
      setNames([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Side: Input & Stats */}
      <div className="lg:col-span-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Add Names
            </h2>
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-400 border border-zinc-700">
              {names.length} {names.length === 1 ? 'Name' : 'Names'}
            </span>
          </div>

          <form onSubmit={handleAddName} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Paste full name here..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 px-1">
              Press Enter to add to the list
            </p>
          </form>

          {names.length > 0 && (
            <button
              onClick={handleClearAll}
              className="mt-6 w-full py-2 text-sm text-zinc-500 hover:text-red-400 flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </motion.div>

        {/* Name List for Quick Reference */}
        {names.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden lg:block bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 overflow-hidden"
          >
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">
              Recent Names
            </h3>
            <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
              {names.map((n) => (
                <div key={n.id} className="px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 truncate">
                  {n.name}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Right Side: Generated Messages */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="popLayout">
          {names.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-64 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600 space-y-4"
            >
              <div className="p-4 bg-zinc-900 rounded-full">
                <User className="w-8 h-8 opacity-20" />
              </div>
              <p>Add a name to generate messages</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {names.map((entry) => {
                const message = getMessage(entry.name);
                const isCopied = copiedId === entry.id;

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="font-medium text-zinc-200">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(entry.id, message)}
                          className={`
                            p-2 rounded-lg transition-all flex items-center gap-2 text-sm
                            ${isCopied 
                              ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/50' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}
                          `}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 bg-zinc-800 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm">
                      {message}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
