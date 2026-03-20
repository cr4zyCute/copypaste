import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, User, Search, X } from 'lucide-react';

interface NameEntry {
  id: string;
  name: string;
  timestamp: number;
}

const STORAGE_KEY = 'simple_manual_list';

export const SimpleList: React.FC = () => {
  const [nameInput, setNameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [names, setNames] = useState<NameEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  }, [names]);

  const handleAddName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    const newEntry: NameEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: trimmed,
      timestamp: Date.now(),
    };

    setNames([newEntry, ...names]);
    setNameInput('');
    inputRef.current?.focus();
  };

  const handleDelete = (id: string) => {
    setNames(names.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear the entire list?')) {
      setNames([]);
    }
  };

  const filteredNames = names.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">Manual Name List</h3>
              <p className="text-sm text-zinc-500">Add and track names manually</p>
            </div>
          </div>
          
          {names.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800 rounded-lg hover:border-red-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Input Section */}
          <form onSubmit={handleAddName} className="flex gap-3">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter a name..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              Add Name
            </button>
          </form>

          {/* Search Section */}
          {names.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search list..."
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-10 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* List Section */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden min-h-[300px] flex flex-col">
            <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">
                {filteredNames.length} {filteredNames.length === 1 ? 'Name' : 'Names'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar p-2">
              <AnimatePresence initial={false}>
                {filteredNames.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-[250px] flex flex-col items-center justify-center text-zinc-600 text-sm gap-3 italic"
                  >
                    <User className="w-8 h-8 opacity-10" />
                    {searchQuery ? 'No names match your search' : 'No names added yet'}
                  </motion.div>
                ) : (
                  <div className="space-y-1">
                    {filteredNames.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/80 transition-all border border-transparent hover:border-zinc-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-500/20">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-zinc-200 font-medium">{entry.name}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                          title="Remove name"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
