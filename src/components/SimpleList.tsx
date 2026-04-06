import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, User, Search, X, Calendar, Copy, Check, Briefcase, MessageCircle, Link as LinkIcon, UserCircle, Bell, ExternalLink, Settings, Edit2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

export interface NameEntry {
  id: string;
  name: string;
  jobPosition?: string;
  link?: string;
  sent?: boolean;
  connected?: boolean;
  connectedAt?: number;
  followUpDone?: boolean;
  timestamp: number;
  addedAt: string; // ISO date string (YYYY-MM-DD)
}

interface SimpleListProps {
  names: NameEntry[];
  setNames: React.Dispatch<React.SetStateAction<NameEntry[]>>;
  names2: NameEntry[];
  setNames2: React.Dispatch<React.SetStateAction<NameEntry[]>>;
  onAddToImportantList: (entry: NameEntry, source: 'Manual List 1' | 'Manual List 2') => void;
  isInImportantList: (entry: NameEntry, source: 'Manual List 1' | 'Manual List 2') => boolean;
}

export const SimpleList: React.FC<SimpleListProps> = ({
  names,
  setNames,
  names2,
  setNames2,
  onAddToImportantList,
  isInImportantList
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list1' | 'list2' | 'reminders'>('list1');
  const [nameInput, setNameInput] = useState('');
  const [jobPositionInput, setJobPositionInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pastedLink, setPastedLink] = useState<string | null>(null);
  const [copiedId1, setCopiedId1] = useState<string | null>(null);
  const [copiedId2, setCopiedId2] = useState<string | null>(null);
  const [copiedNameId, setCopiedNameId] = useState<string | null>(null);
  const [copiedCompanyId, setCopiedCompanyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'connected' | 'none'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | '1' | '2' | '3' | 'done'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showEditMessagesModal, setShowEditMessagesModal] = useState(false);

  const [message1Template, setMessage1Template] = useState(() => 
    localStorage.getItem('manual_list_msg1') || 
    "Hi {{name}}, I work with service businesses like HVAC, plumbing, and facilities teams to smooth out dispatch chaos and after-hours coverage. Always interested in learning how others handle the labor crunch. \n\nHappy to connect."
  );
  const [message2Template, setMessage2Template] = useState(() => 
    localStorage.getItem('manual_list_msg2') || 
    "Hi {{name}}, I work with ops leaders to smooth out dispatch chaos. Always looking to see how other teams handle the labor crunch. Happy to connect."
  );
  
  const [tempMsg1, setTempMsg1] = useState(message1Template);
  const [tempMsg2, setTempMsg2] = useState(message2Template);

  const [dailyNotes1, setDailyNotes1] = useState<Record<string, string>>(() => 
    JSON.parse(localStorage.getItem('manual_list1_daily_notes') || '{}')
  );
  const [dailyNotes2, setDailyNotes2] = useState<Record<string, string>>(() => 
    JSON.parse(localStorage.getItem('manual_list2_daily_notes') || '{}')
  );

  const handleUpdateNote = (val: string) => {
    if (selectedDate === 'all') return;
    
    if (activeSubTab === 'list1') {
      const newNotes = { ...dailyNotes1, [selectedDate]: val };
      setDailyNotes1(newNotes);
      localStorage.setItem('manual_list1_daily_notes', JSON.stringify(newNotes));
    } else if (activeSubTab === 'list2') {
      const newNotes = { ...dailyNotes2, [selectedDate]: val };
      setDailyNotes2(newNotes);
      localStorage.setItem('manual_list2_daily_notes', JSON.stringify(newNotes));
    }
  };

  const handleSaveMessages = () => {
    setMessage1Template(tempMsg1);
    setMessage2Template(tempMsg2);
    localStorage.setItem('manual_list_msg1', tempMsg1);
    localStorage.setItem('manual_list_msg2', tempMsg2);
    setShowEditMessagesModal(false);
  };

  const handleOpenEditMessages = () => {
    setTempMsg1(message1Template);
    setTempMsg2(message2Template);
    setShowEditMessagesModal(true);
  };
  
  // Current active list data
  const currentNames = activeSubTab === 'list1' ? names : activeSubTab === 'list2' ? names2 : [];
  const setCurrentNames = activeSubTab === 'list1' ? setNames : setNames2;

  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');
  const [namesCopied, setNamesCopied] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddName = (e?: React.FormEvent) => {
    e?.preventDefault();
    let name = nameInput.trim();
    const jobPosition = jobPositionInput.trim() || undefined;

    if (!name) return;

    // Use pasted link if available, otherwise check if URL is in the name string
    let finalLink = pastedLink;
    
    // Always check for URL in the name string to clean it up
    const urlMatch = name.match(/((?:https?:\/\/|www\.)[^\s]+)/);
    if (urlMatch) {
      if (!finalLink) {
        let url = urlMatch[0];
        if (url.startsWith('www.')) url = 'https://' + url;
        finalLink = url;
      }
      name = name.replace(urlMatch[0], '').trim();
    }
    
    // Clean up any trailing/leading separators
    name = name.replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '').trim();

    const today = new Date().toISOString().split('T')[0];
    const newEntry: NameEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      link: finalLink || undefined,
      jobPosition,
      timestamp: Date.now(),
      addedAt: today,
    };

    setCurrentNames([newEntry, ...currentNames]);
    setNameInput('');
    setJobPositionInput('');
    setPastedLink(null);
    setSelectedDate(today); // Switch to today when adding
    inputRef.current?.focus();
  };

  const updateEntryGlobal = (id: string, updater: (n: NameEntry) => NameEntry) => {
    if (names.some(n => n.id === id)) {
      setNames(prev => prev.map(n => n.id === id ? updater(n) : n));
    } else if (names2.some(n => n.id === id)) {
      setNames2(prev => prev.map(n => n.id === id ? updater(n) : n));
    }
  };

  const handleCopyMessage1 = async (entry: NameEntry) => {
    const firstName = entry.name.split(' ')[0];
    const message = message1Template.replace(/{{name}}/g, firstName);
    
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId1(entry.id);
      
      // Persistently mark as sent
      updateEntryGlobal(entry.id, n => ({ ...n, sent: true }));
      
      setTimeout(() => setCopiedId1(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleCopyMessage2 = async (entry: NameEntry) => {
    const firstName = entry.name.split(' ')[0];
    const message = message2Template.replace(/{{name}}/g, firstName);
    
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId2(entry.id);
      
      // Persistently mark as sent
      updateEntryGlobal(entry.id, n => ({ ...n, sent: true }));
      
      setTimeout(() => setCopiedId2(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleCopyNameOnly = async (entry: NameEntry) => {
    // Extract just the name part by splitting on common separators
    let nameOnly = entry.name;
    const smartMatch = entry.name.match(/^(.+?)\s*[\-–—|]\s*(.+)$/);
    if (smartMatch) {
      nameOnly = smartMatch[1].trim();
    } else if (entry.name.includes(',')) {
      nameOnly = entry.name.split(',')[0].trim();
    }

    try {
      await navigator.clipboard.writeText(nameOnly);
      setCopiedNameId(entry.id);
      setTimeout(() => setCopiedNameId(null), 2000);
    } catch (err) {
      console.error('Failed to copy name:', err);
    }
  };

  const handleCopyLink = async (entry: NameEntry) => {
    if (!entry.link) return;
    try {
      await navigator.clipboard.writeText(entry.link);
      setCopiedCompanyId(entry.id); // Re-using state for visual feedback
      setTimeout(() => setCopiedCompanyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDelete = (id: string) => {
    setEntryToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      setNames(prev => prev.filter(n => n.id !== entryToDelete));
      setNames2(prev => prev.filter(n => n.id !== entryToDelete));
      setEntryToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleToggleConnected = (id: string) => {
    updateEntryGlobal(id, n => {
      const isConnected = !n.connected;
      return { 
        ...n, 
        connected: isConnected,
        connectedAt: isConnected ? Date.now() : undefined,
        followUpDone: false // Reset done status when re-connecting
      };
    });
  };

  const handleToggleFollowUpDone = (id: string) => {
    updateEntryGlobal(id, n => ({
      ...n,
      followUpDone: !n.followUpDone
    }));
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

  const getDiffDays = (connectedAt: number) => {
    // Create Date objects and set hours to 0 to compare purely by day
    const connectedDate = new Date(connectedAt);
    connectedDate.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(connectedDate);
    targetDate.setDate(targetDate.getDate() + 3);
    
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - nowDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getFollowUpFilterDate = (offsetDays: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  };

  const getReminderStatus = (entry: NameEntry) => {
    if (!entry.connectedAt) return { text: '', color: '', isDue: false };
    if (entry.followUpDone) return { text: 'Done', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', isDue: false };
    
    const diffDays = getDiffDays(entry.connectedAt);
    
    if (diffDays > 1) return { text: `In ${diffDays} days`, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', isDue: false };
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', isDue: false };
    if (diffDays === 0) return { text: 'Today', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', isDue: true };
    return { text: `Overdue (${Math.abs(diffDays)}d)`, color: 'text-red-400 bg-red-500/10 border-red-500/20', isDue: true };
  };

  const filteredNames = React.useMemo(() => {
    if (activeSubTab === 'reminders') {
      return [...names, ...names2]
        .filter(n => {
          if (!n.connected) return false;
          
          const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesSearch) return false;

          if (followUpFilter === 'all') return true;
          if (followUpFilter === 'done') return !!n.followUpDone;
          
          // For countdown filters (1, 2, 3), exclude those already done
          if (n.followUpDone) return false;
          
          const diffDays = getDiffDays(n.connectedAt!);
          return diffDays === parseInt(followUpFilter);
        })
        .sort((a, b) => (a.connectedAt || 0) - (b.connectedAt || 0));
    }

    return currentNames.filter(n => {
      const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Show ALL if 'all' is selected, otherwise match date
      const matchesDate = selectedDate === 'all' || n.addedAt === selectedDate;
      
      let matchesStatus = true;
      if (activeSubTab === 'list2') {
        if (statusFilter === 'sent') {
          matchesStatus = !!n.sent && !n.connected;
        } else if (statusFilter === 'connected') {
          matchesStatus = !!n.connected;
        } else if (statusFilter === 'none') {
          matchesStatus = !n.sent && !n.connected;
        }
      }

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [names, names2, currentNames, searchQuery, selectedDate, statusFilter, activeSubTab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6 relative"
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
          <button
            onClick={() => setActiveSubTab('reminders')}
            className={`
              px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${activeSubTab === 'reminders' 
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                : 'text-zinc-500 hover:text-zinc-300'}
            `}
          >
            <Bell className="w-4 h-4" />
            Follow-ups
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              {activeSubTab === 'reminders' ? <Bell className="w-6 h-6 text-blue-400" /> : <UserPlus className="w-6 h-6 text-blue-400" />}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                {activeSubTab === 'list1' ? 'Manual Name List 1' : activeSubTab === 'list2' ? 'Manual Name List 2' : 'Follow-ups'}
                {activeSubTab === 'list2' && (
                  <button
                    onClick={handleOpenEditMessages}
                    className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-all"
                    title="Edit message templates"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </h3>
              <p className="text-sm text-zinc-500">
                {activeSubTab === 'reminders' 
                  ? 'Track your connections and follow up in 3 days' 
                  : activeSubTab === 'list1' 
                    ? 'Add and track names manually' 
                    : 'Add names and company info for personalized messages'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeSubTab !== 'reminders' && currentNames.length > 0 && (
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
          {activeSubTab !== 'reminders' && (
            <form onSubmit={handleAddName} className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-[2]">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (!e.target.value) setPastedLink(null);
                    }}
                    onPaste={(e) => {
                      let htmlLink: string | null = null;
                      const html = e.clipboardData.getData('text/html');
                      if (html) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        const anchor = doc.querySelector('a');
                        if (anchor && anchor.href) {
                          htmlLink = anchor.href;
                          setPastedLink(htmlLink);
                        }
                      }
                      const text = e.clipboardData.getData('text/plain');
                      if (!htmlLink) {
                        const urlMatch = text.match(/((?:https?:\/\/|www\.)[^\s]+)/);
                        if (urlMatch) {
                          let url = urlMatch[0];
                          if (url.startsWith('www.')) url = 'https://' + url;
                          setPastedLink(url);
                        }
                      }
                    }}
                    placeholder={activeSubTab === 'list1' ? "Name and Position (e.g., Linkon - VP of Sales)..." : "Name and Position..."}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  {pastedLink && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400" title="Link captured">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
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
          )}

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

            {activeSubTab !== 'reminders' && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedDate('all')}
                    className={`
                      whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2
                      ${selectedDate === 'all' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}
                    `}
                  >
                    All History
                    <span className={`
                      px-1.5 py-0.5 rounded-full text-[10px] 
                      ${selectedDate === 'all' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}
                    `}>
                      {currentNames.length}
                    </span>
                  </button>
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
            )}
          </div>

          {/* List Section */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden min-h-[300px] flex flex-col">
            <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 whitespace-nowrap">
                  {filteredNames.length} {activeSubTab !== 'list2' && (filteredNames.length === 1 ? 'Name' : 'Names')} Showing
                </span>
                
                {selectedDate !== 'all' && activeSubTab !== 'reminders' && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap">Note:</span>
                    <input
                      type="text"
                      value={(activeSubTab === 'list1' ? dailyNotes1 : dailyNotes2)[selectedDate] || ''}
                      onChange={(e) => handleUpdateNote(e.target.value)}
                      placeholder="Add a daily note..."
                      className="bg-transparent border-none text-[11px] text-zinc-400 placeholder-zinc-700 focus:outline-none focus:ring-0 p-0 w-full truncate italic"
                    />
                  </div>
                )}
              </div>

              {activeSubTab === 'list2' && (
                <div className="flex items-center gap-1 bg-zinc-950/50 p-1 rounded-lg border border-zinc-800/50">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      statusFilter === 'all' 
                        ? 'bg-zinc-800 text-zinc-200 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('sent')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      statusFilter === 'sent' 
                        ? 'bg-zinc-800 text-green-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Sent
                  </button>
                  <button
                    onClick={() => setStatusFilter('connected')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      statusFilter === 'connected' 
                        ? 'bg-zinc-800 text-blue-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Connected
                  </button>
                  <button
                    onClick={() => setStatusFilter('none')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      statusFilter === 'none' 
                        ? 'bg-zinc-800 text-amber-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    No Activity
                  </button>
                </div>
              )}
              {activeSubTab === 'reminders' && (
                <div className="flex items-center gap-1 bg-zinc-950/50 p-1 rounded-lg border border-zinc-800/50 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setFollowUpFilter('all')}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap min-w-[76px] ${
                      followUpFilter === 'all' 
                        ? 'bg-zinc-800 text-zinc-200 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">All</span>
                    <span className="block text-[9px] mt-1 opacity-80 leading-none">{getFollowUpFilterDate(0)}</span>
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('3')}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap min-w-[76px] ${
                      followUpFilter === '3' 
                        ? 'bg-zinc-800 text-blue-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">3 Days</span>
                    <span className="block text-[9px] mt-1 opacity-80 leading-none">{getFollowUpFilterDate(3)}</span>
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('2')}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap min-w-[76px] ${
                      followUpFilter === '2' 
                        ? 'bg-zinc-800 text-amber-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">2 Days</span>
                    <span className="block text-[9px] mt-1 opacity-80 leading-none">{getFollowUpFilterDate(2)}</span>
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('1')}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap min-w-[76px] ${
                      followUpFilter === '1' 
                        ? 'bg-zinc-800 text-orange-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">1 Day</span>
                    <span className="block text-[9px] mt-1 opacity-80 leading-none">{getFollowUpFilterDate(1)}</span>
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('done')}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap min-w-[76px] ${
                      followUpFilter === 'done' 
                        ? 'bg-zinc-800 text-emerald-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">Done</span>
                    <span className="block text-[9px] mt-1 opacity-80 leading-none">{getFollowUpFilterDate(0)}</span>
                  </button>
                </div>
              )}
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
                        animate={{ opacity: entry.sent && activeSubTab !== 'reminders' ? 0.85 : 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/80 transition-all border border-transparent hover:border-zinc-800 ${entry.sent && activeSubTab !== 'reminders' ? 'bg-zinc-900/10' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {activeSubTab === 'reminders' ? (
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-500/20">
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                const source = activeSubTab === 'list1' ? 'Manual List 1' : 'Manual List 2';
                                onAddToImportantList(entry, source);
                              }}
                              disabled={isInImportantList(entry, activeSubTab === 'list1' ? 'Manual List 1' : 'Manual List 2')}
                              className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                                isInImportantList(entry, activeSubTab === 'list1' ? 'Manual List 1' : 'Manual List 2')
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 cursor-not-allowed'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-400/40'
                              }`}
                              title={isInImportantList(entry, activeSubTab === 'list1' ? 'Manual List 1' : 'Manual List 2') ? 'Already in Important List' : 'Add to Important List'}
                            >
                              {entry.name.charAt(0).toUpperCase()}
                              {isInImportantList(entry, activeSubTab === 'list1' ? 'Manual List 1' : 'Manual List 2') && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-zinc-900 flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </span>
                              )}
                            </button>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              {entry.link ? (
                                <a 
                                  href={entry.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sm text-zinc-200 font-medium block hover:text-blue-400 transition-colors"
                                >
                                  {entry.name}
                                </a>
                              ) : (
                                <span className="text-sm text-zinc-200 font-medium block">{entry.name}</span>
                              )}
                              {activeSubTab === 'reminders' ? (
                                <span className="flex items-center gap-1 text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 uppercase tracking-tight font-bold">
                                  Pending
                                </span>
                              ) : (
                                <>
                                  {entry.sent && !entry.connected && (
                                    <span className="flex items-center gap-1 text-[9px] bg-green-500/10 text-green-500/80 px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-tight font-bold">
                                      <Check className="w-2.5 h-2.5" />
                                      Sent
                                    </span>
                                  )}
                                  {entry.connected && (
                                    <span className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase tracking-tight font-bold">
                                      <LinkIcon className="w-2.5 h-2.5" />
                                      Connected
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {entry.jobPosition && (
                              <span className="text-[10px] text-zinc-500 block">
                                {activeSubTab === 'list2' ? `Company: ${entry.jobPosition}` : entry.jobPosition}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {activeSubTab === 'reminders' ? (
                          <div className="flex items-center gap-2">
                            {entry.link && (
                              <a
                                href={entry.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-600 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-all"
                                title="Open link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {entry.connectedAt && (
                              <span className={`px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getReminderStatus(entry).color}`}>
                                {getReminderStatus(entry).text}
                              </span>
                            )}
                            {!entry.followUpDone && (
                              <button
                                onClick={() => handleToggleFollowUpDone(entry.id)}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-md transition-all"
                                title="Mark Done"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleConnected(entry.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all"
                              title="Remove from follow-ups"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {entry.link && (
                              <a
                                href={entry.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-600 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-all"
                                title="Open link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {entry.link && (
                              <button
                                onClick={() => handleCopyLink(entry)}
                                className={`p-1.5 rounded-md transition-all ${
                                  copiedCompanyId === entry.id 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'text-zinc-600 hover:text-blue-400 hover:bg-zinc-800'
                                }`}
                                title="Copy link"
                              >
                                {copiedCompanyId === entry.id ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyNameOnly(entry)}
                              className={`p-1.5 rounded-md transition-all ${
                                copiedNameId === entry.id 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'text-zinc-600 hover:text-blue-400 hover:bg-zinc-800'
                              }`}
                              title="Copy just the name"
                            >
                              {copiedNameId === entry.id ? <Check className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                            </button>
                            {activeSubTab !== 'list1' && (
                              <>
                                <button
                                  onClick={() => handleToggleConnected(entry.id)}
                                  className={`p-1.5 rounded-md transition-all ${
                                    entry.connected
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'text-zinc-600 hover:text-blue-400 hover:bg-zinc-800'
                                  }`}
                                  title={entry.connected ? "Mark as not connected" : "Mark as connected"}
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleCopyMessage1(entry)}
                                  className={`p-1.5 rounded-md transition-all relative ${
                                    copiedId1 === entry.id 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'text-zinc-600 hover:text-blue-400 hover:bg-zinc-800'
                                  }`}
                                  title="Copy connect message 1"
                                >
                                  {copiedId1 === entry.id ? <Check className="w-4 h-4" /> : (
                                    <>
                                      <MessageCircle className="w-4 h-4" />
                                      {activeSubTab === 'list2' && (
                                        <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-500 text-white w-3 h-3 flex items-center justify-center rounded-full">1</span>
                                      )}
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                            {activeSubTab === 'list2' && (
                              <button
                                onClick={() => handleCopyMessage2(entry)}
                                className={`p-1.5 rounded-md transition-all relative ${
                                  copiedId2 === entry.id 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'text-zinc-600 hover:text-blue-400 hover:bg-zinc-800'
                                }`}
                                title="Copy connect message 2"
                              >
                                {copiedId2 === entry.id ? <Check className="w-4 h-4" /> : (
                                  <>
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-purple-500 text-white w-3 h-3 flex items-center justify-center rounded-full">2</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all"
                              title="Remove name"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEntryToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Entry"
        message="Are you sure you want to remove this entry? This action cannot be undone."
      />

      {/* Edit Messages Modal */}
      <AnimatePresence>
        {showEditMessagesModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditMessagesModal(false)}
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
                  Edit Message Templates
                </h3>
                <button
                  onClick={() => setShowEditMessagesModal(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-400">Message 1 Template</label>
                    <span className="text-[10px] text-zinc-600">Use {"{{name}}"} for first name</span>
                  </div>
                  <textarea
                    value={tempMsg1}
                    onChange={(e) => setTempMsg1(e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-sans whitespace-pre-wrap"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-400">Message 2 Template</label>
                    <span className="text-[10px] text-zinc-600">Use {"{{name}}"} for first name</span>
                  </div>
                  <textarea
                    value={tempMsg2}
                    onChange={(e) => setTempMsg2(e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-sans whitespace-pre-wrap"
                  />
                </div>
              </div>

              <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditMessagesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMessages}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
