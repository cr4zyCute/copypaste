import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, User, Search, X, Calendar, Copy, Check, Briefcase, MessageCircle } from 'lucide-react';

export interface NameEntry {
  id: string;
  name: string;
  jobPosition?: string;
  sent?: boolean;
  timestamp: number;
  addedAt: string; // ISO date string (YYYY-MM-DD)
}

interface SimpleListProps {
  names: NameEntry[];
  setNames: React.Dispatch<React.SetStateAction<NameEntry[]>>;
  names2: NameEntry[];
  setNames2: React.Dispatch<React.SetStateAction<NameEntry[]>>;
}

export const SimpleList: React.FC<SimpleListProps> = ({ names, setNames, names2, setNames2 }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list1' | 'list2'>('list1');
  const [nameInput, setNameInput] = useState('');
  const [jobPositionInput, setJobPositionInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Current active list data
  const currentNames = activeSubTab === 'list1' ? names : names2;
  const setCurrentNames = activeSubTab === 'list1' ? setNames : setNames2;

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [namesCopied, setNamesCopied] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = nameInput.trim();
    const jobPosition = jobPositionInput.trim() || undefined;

    if (!name) return;

    const today = new Date().toISOString().split('T')[0];
    const newEntry: NameEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      jobPosition,
      timestamp: Date.now(),
      addedAt: today,
    };

    setCurrentNames([newEntry, ...currentNames]);
    setNameInput('');
    setJobPositionInput('');
    setSelectedDate(today); // Switch to today when adding
    inputRef.current?.focus();
  };

  const handleCopyMessage = async (entry: NameEntry) => {
    const firstName = entry.name.split(' ')[0];
    const message = `Hi ${firstName}, I work with service businesses like HVAC, plumbing, and facilities teams to smooth out dispatch chaos and after-hours coverage. Always interested in learning how others handle the labor crunch. 

Happy to connect.`;
    
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(entry.id);
      
      // Persistently mark as sent
      setCurrentNames(prev => prev.map(n => n.id === entry.id ? { ...n, sent: true } : n));
      
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleDelete = (id: string) => {
    setCurrentNames(currentNames.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear the entire list?')) {
      setCurrentNames([]);
    }
  };

  const handleCopyNames = async () => {
    if (currentNames.length === 0) return;
    try {
      const allNames = currentNames.map(n => n.name);
      await navigator.clipboard.writeText(allNames.join('\n'));
      setNamesCopied(true);
      setTimeout(() => setNamesCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy names:', err);
    }
  };

  const availableDates = React.useMemo(() => {
    const dates = new Set<string>();
    currentNames.forEach(n => dates.add(n.addedAt));
    // Always include today
    dates.add(new Date().toISOString().split('T')[0]);
    return Array.from(dates).sort().reverse();
  }, [currentNames]);

  const filteredNames = React.useMemo(() => {
    return currentNames.filter(n => 
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      n.addedAt === selectedDate
    );
  }, [currentNames, searchQuery, selectedDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Sub-tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 flex gap-1">
          <button
            onClick={() => setActiveSubTab('list1')}
            className={`
              px-6 py-2 rounded-lg text-sm font-medium transition-all
              ${activeSubTab === 'list1' 
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                : 'text-zinc-500 hover:text-zinc-300'}
            `}
          >
            Manual List 1
          </button>
          <button
            onClick={() => setActiveSubTab('list2')}
            className={`
              px-6 py-2 rounded-lg text-sm font-medium transition-all
              ${activeSubTab === 'list2' 
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                : 'text-zinc-500 hover:text-zinc-300'}
            `}
          >
            Manual List 2
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">
                {activeSubTab === 'list1' ? 'Manual Name List 1' : 'Manual Name List 2'}
              </h3>
              <p className="text-sm text-zinc-500">
                {activeSubTab === 'list1' 
                  ? 'Add and track names manually' 
                  : 'Add names and company info for personalized messages'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentNames.length > 0 && (
              <>
                <button
                  onClick={handleCopyNames}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                    ${namesCopied 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'}
                  `}
                >
                  {namesCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {namesCopied ? 'Copied!' : 'Copy Names'}
                </button>
               
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Input Section */}
          <form onSubmit={handleAddName} className="space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-[2]">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={activeSubTab === 'list1' ? "Name and Position (e.g., Linkon - VP of Sales)..." : "Name and Position..."}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {activeSubTab === 'list2' && (
                <div className="relative flex-[2]">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={jobPositionInput}
                    onChange={(e) => setJobPositionInput(e.target.value)}
                    placeholder="Company name..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </form>

          {/* Search and Date Filter Section */}
          <div className="space-y-3">
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

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
              <div className="flex gap-1">
                {availableDates.map(date => {
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const count = currentNames.filter(n => n.addedAt === date).length;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2
                        ${selectedDate === date 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}
                      `}
                    >
                      {isToday ? 'Today' : date}
                      <span className={`
                        px-1.5 py-0.5 rounded-full text-[10px] 
                        ${selectedDate === date ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}
                      `}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden min-h-[300px] flex flex-col">
            <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">
                {filteredNames.length} {filteredNames.length === 1 ? 'Name' : 'Names'} Showing
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
                        animate={{ opacity: entry.sent ? 0.85 : 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/80 transition-all border border-transparent hover:border-zinc-800 ${entry.sent ? 'bg-zinc-900/10' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-500/20">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-200 font-medium block">{entry.name}</span>
                              {entry.sent && (
                                <span className="flex items-center gap-1 text-[9px] bg-green-500/10 text-green-500/80 px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-tight font-bold">
                                  <Check className="w-2.5 h-2.5" />
                                  Sent
                                </span>
                              )}
                            </div>
                            {entry.jobPosition && (
                              <span className="text-[10px] text-zinc-500 block">
                                {activeSubTab === 'list2' ? `Company: ${entry.jobPosition}` : entry.jobPosition}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleCopyMessage(entry)}
                            className={`p-1.5 rounded-md transition-all ${
                              copiedId === entry.id 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'text-zinc-600 hover:text-blue-400 hover:bg-zinc-800'
                            }`}
                            title="Copy connect message"
                          >
                            {copiedId === entry.id ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="Remove name"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
