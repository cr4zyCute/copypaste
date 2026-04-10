import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Trash2, Plus, User, Settings, Edit2, X, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

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
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  
  // Duplicate warning states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [pendingEntry, setPendingEntry] = useState<NameEntry | null>(null);
  const [isRealtimeDuplicate, setIsRealtimeDuplicate] = useState(false);
  
  const [messageTemplate, setMessageTemplate] = useState(() => 
    localStorage.getItem('quick_connect_msg') || 
    "Thanks for connecting, {{name}}. I hope you're having a productive week so far.\nI’m curious—with how hard it is to find reliable admin staff right now, are you handling your after-hours and overflow calls in-house, or is that responsibility falling on your technicians?\nI’d love to get your perspective on how teams your size are adapting to these staffing challenges."
  );
  
  const [tempMsg, setTempMsg] = useState(messageTemplate);

  const handleSaveMessage = () => {
    setMessageTemplate(tempMsg);
    localStorage.setItem('quick_connect_msg', tempMsg);
    setShowEditMessageModal(false);
  };

  const handleOpenEditMessage = () => {
    setTempMsg(messageTemplate);
    setShowEditMessageModal(true);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time duplicate check
  useEffect(() => {
    const input = nameInput.trim();
    if (!input || input.length < 2) {
      setIsRealtimeDuplicate(false);
      return;
    }

    const firstName = input.split(/\s+/)[0];
    const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    
    const duplicate = names.some(n => n.name.toLowerCase() === formattedName.toLowerCase());
    setIsRealtimeDuplicate(duplicate);
  }, [nameInput, names]);

  // Update local storage whenever names change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  }, [names]);

  const getMessage = (firstName: string) => {
    return messageTemplate.replace(/{{name}}/g, firstName);
  };

  const handleAddName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = nameInput.trim();
    if (!trimmedInput) return;

    // Extract first name: split by space and take the first part
    const firstName = trimmedInput.split(/\s+/)[0];
    
    // Capitalize first letter just in case
    const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    // Check for duplicate
    const isDuplicate = names.some(n => n.name.toLowerCase() === formattedName.toLowerCase());

    const newEntry: NameEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: formattedName,
      timestamp: Date.now(),
    };

    if (isDuplicate) {
      setDuplicateName(formattedName);
      setPendingEntry(newEntry);
      setShowDuplicateModal(true);
      return;
    }

    addEntry(newEntry);
  };

  const addEntry = (entry: NameEntry) => {
    setNames([entry, ...names]);
    setNameInput('');
    inputRef.current?.focus();
  };

  const confirmDuplicateAdd = () => {
    if (pendingEntry) {
      addEntry(pendingEntry);
      setPendingEntry(null);
      setDuplicateName('');
      setShowDuplicateModal(false);
    }
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
    setShowClearAllModal(true);
  };

  const confirmClearAll = () => {
    setNames([]);
    setShowClearAllModal(false);
  };

  const getRecentDateKey = (timestamp: number) => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  const formatRecentGroupDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).replace(',', '');
  };

  const recentDateCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    names.forEach((n) => {
      const key = getRecentDateKey(n.timestamp);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [names]);

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
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Add Names
              </h2>
              <button
                onClick={handleOpenEditMessage}
                className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-all"
                title="Edit message template"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
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
                className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all ${
                  isRealtimeDuplicate 
                    ? 'border-amber-500/50 focus:ring-amber-500/30 text-amber-200' 
                    : 'border-zinc-800 focus:ring-blue-500/50 focus:border-blue-500/50'
                }`}
              />
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                  isRealtimeDuplicate ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                } disabled:bg-zinc-800 disabled:text-zinc-600`}
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {isRealtimeDuplicate && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400 font-medium z-10 backdrop-blur-sm flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>This name is already in your list</span>
                  </motion.div>
                )}
              </AnimatePresence>
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
          
          <ConfirmationModal
            isOpen={showClearAllModal}
            onClose={() => setShowClearAllModal(false)}
            onConfirm={confirmClearAll}
            title="Clear All Names"
            message="Are you sure you want to clear all names from the list? This action cannot be undone."
          />

          <ConfirmationModal
            isOpen={showDuplicateModal}
            onClose={() => {
              setShowDuplicateModal(false);
              setPendingEntry(null);
              setDuplicateName('');
            }}
            onConfirm={confirmDuplicateAdd}
            title="Duplicate Found"
            message={`"${duplicateName}" is already in your list. Do you want to add it anyway?`}
            confirmText="Add Anyway"
            cancelText="Cancel"
            variant="warning"
          />
        </motion.div>

        {/* Edit Message Modal */}
        <AnimatePresence>
          {showEditMessageModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEditMessageModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-400" />
                    Edit Quick Connect Template
                  </h3>
                  <button
                    onClick={() => setShowEditMessageModal(false)}
                    className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-400">Message Template</label>
                    <span className="text-[10px] text-zinc-600">Use {"{{name}}"} for first name</span>
                  </div>
                  <textarea
                    value={tempMsg}
                    onChange={(e) => setTempMsg(e.target.value)}
                    rows={8}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-sans whitespace-pre-wrap"
                    placeholder="Type your template here..."
                  />
                </div>

                <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
                  <button
                    onClick={() => setShowEditMessageModal(false)}
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMessage}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
              {names.map((n, index) => (
                <React.Fragment key={n.id}>
                  {(index === 0 || getRecentDateKey(names[index - 1].timestamp) !== getRecentDateKey(n.timestamp)) && (
                    <div className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-px bg-zinc-800/80 flex-1" />
                        <span className="text-[11px] font-semibold text-zinc-500">
                          {formatRecentGroupDate(n.timestamp)}
                          <span className="ml-2 text-zinc-600 font-medium">
                            ({recentDateCounts[getRecentDateKey(n.timestamp)] || 0})
                          </span>
                        </span>
                        <div className="h-px bg-zinc-800/80 flex-1" />
                      </div>
                    </div>
                  )}
                  <div className="px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 truncate">
                    {n.name}
                  </div>
                </React.Fragment>
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
