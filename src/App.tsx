import { useState, useEffect, useMemo } from 'react';
import { ExcelUploader } from './components/ExcelUploader';
import { DataViewer } from './components/DataViewer';
import { MessageCleaner } from './components/MessageCleaner';
import { Messenger } from './components/Messenger';
import { EODGenerator } from './components/EODGenerator';
import { DocxPromptReader } from './components/DocxPromptReader';
import { SimpleList, type NameEntry } from './components/SimpleList';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Sparkles, MessageSquare, ClipboardList, FileText, ListTodo, Bell, X } from 'lucide-react';

type Row = Record<string, unknown>;

const SIMPLE_LIST_STORAGE_KEY = 'simple_manual_list';
const SIMPLE_LIST_2_STORAGE_KEY = 'simple_manual_list_2';

function App() {
  const [data, setData] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'excel' | 'cleaner' | 'messenger' | 'eod' | 'prompt' | 'list'>('excel');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<'up' | 'down'>('down');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Follow-up logic shared with App
  const getReminderStatus = (entry: NameEntry) => {
    if (!entry.connectedAt) return { text: '', color: '', isDue: false };
    if (entry.followUpDone) return { text: 'Done', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', isDue: false };
    
    const connectedDate = new Date(entry.connectedAt);
    connectedDate.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(connectedDate);
    targetDate.setDate(targetDate.getDate() + 3);
    
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - nowDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) return { text: `In ${diffDays} days`, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', isDue: false };
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', isDue: false };
    if (diffDays === 0) return { text: 'Today', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', isDue: true };
    return { text: `Overdue (${Math.abs(diffDays)}d)`, color: 'text-red-400 bg-red-500/10 border-red-500/20', isDue: true };
  };

  // Lifted state from SimpleList.tsx
  const [names, setNames] = useState<NameEntry[]>(() => {
    const saved = localStorage.getItem(SIMPLE_LIST_STORAGE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((entry: any) => ({
        ...entry,
        addedAt: entry.addedAt || new Date(entry.timestamp).toISOString().split('T')[0]
      }));
    } catch {
      return [];
    }
  });

  const [names2, setNames2] = useState<NameEntry[]>(() => {
    const saved = localStorage.getItem(SIMPLE_LIST_2_STORAGE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((entry: any) => ({
        ...entry,
        addedAt: entry.addedAt || new Date(entry.timestamp).toISOString().split('T')[0]
      }));
    } catch {
      return [];
    }
  });

  const activeFollowUps = useMemo(() => {
    const allNames = [...names, ...names2];
    return allNames.filter(n => {
      return n.connected && !n.followUpDone;
    });
  }, [names, names2]);

  const dueFollowUpsCount = useMemo(() => {
    return activeFollowUps.filter(n => getReminderStatus(n).isDue).length;
  }, [activeFollowUps, getReminderStatus]);

  // Global Toast State
  const [lastDismissedCount, setLastDismissedCount] = useState(() => {
    return Number(localStorage.getItem('global_toast_dismissed_count') || 0);
  });

  const [lastDismissedDueCount, setLastDismissedDueCount] = useState(() => {
    return Number(localStorage.getItem('global_toast_dismissed_due_count') || 0);
  });

  const dismissGlobalToast = () => {
    setLastDismissedCount(activeFollowUps.length);
    setLastDismissedDueCount(dueFollowUpsCount);
    localStorage.setItem('global_toast_dismissed_count', String(activeFollowUps.length));
    localStorage.setItem('global_toast_dismissed_due_count', String(dueFollowUpsCount));
  };

  // Reset dismissed counts if actual counts drop below them
  useEffect(() => {
    if (activeFollowUps.length < lastDismissedCount || dueFollowUpsCount < lastDismissedDueCount) {
      const newCount = Math.min(activeFollowUps.length, lastDismissedCount);
      const newDueCount = Math.min(dueFollowUpsCount, lastDismissedDueCount);
      
      setLastDismissedCount(newCount);
      setLastDismissedDueCount(newDueCount);
      localStorage.setItem('global_toast_dismissed_count', String(newCount));
      localStorage.setItem('global_toast_dismissed_due_count', String(newDueCount));
    }
  }, [activeFollowUps.length, dueFollowUpsCount, lastDismissedCount, lastDismissedDueCount]);

  const shouldShowToast = useMemo(() => {
    if (activeFollowUps.length === 0) return false;
    
    // Show if total count increased OR if someone new became "Due"
    const hasNewFollowUps = activeFollowUps.length > lastDismissedCount;
    const hasNewDueFollowUps = dueFollowUpsCount > lastDismissedDueCount;
    
    return hasNewFollowUps || hasNewDueFollowUps;
  }, [activeFollowUps.length, dueFollowUpsCount, lastDismissedCount, lastDismissedDueCount]);

  // Persist names when they change
  useEffect(() => {
    localStorage.setItem(SIMPLE_LIST_STORAGE_KEY, JSON.stringify(names));
  }, [names]);

  useEffect(() => {
    localStorage.setItem(SIMPLE_LIST_2_STORAGE_KEY, JSON.stringify(names2));
  }, [names2]);

  // Function to refresh names from localStorage (for MessageCleaner sync)
  const refreshNames = () => {
    const saved1 = localStorage.getItem(SIMPLE_LIST_STORAGE_KEY);
    if (saved1) {
      try {
        setNames(JSON.parse(saved1));
      } catch (e) {
        console.error('Error refreshing names 1:', e);
      }
    }
    const saved2 = localStorage.getItem(SIMPLE_LIST_2_STORAGE_KEY);
    if (saved2) {
      try {
        setNames2(JSON.parse(saved2));
      } catch (e) {
        console.error('Error refreshing names 2:', e);
      }
    }
  };

  const handleDataLoaded = (loadedData: Row[], name: string) => {
    setData(loadedData);
    setFileName(name);
  };

  const handleReset = () => {
    setData([]);
    setFileName('');
    setSearchTerm('');
    setFilterDirection('down');
    setCurrentMatchIndex(0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Notification Bell Icon with Dropdown */}
      <div className="fixed top-6 right-6 z-[110]">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`
              relative p-2.5 rounded-xl border transition-all duration-200 group
              ${showNotifications 
                ? 'bg-zinc-800 border-zinc-700 text-orange-400 shadow-lg shadow-orange-900/10' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}
            `}
          >
            <Bell className={`w-5 h-5 transition-transform duration-300 ${activeFollowUps.length > 0 ? 'animate-none group-hover:rotate-12' : ''}`} />
            
            {activeFollowUps.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-zinc-950">
                {activeFollowUps.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                {/* Backdrop to close when clicking outside */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowNotifications(false)}
                  className="fixed inset-0 z-[-1]"
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 shadow-black/50"
                >
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      Notifications
                      {activeFollowUps.length > 0 && (
                        <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px]">
                          {activeFollowUps.length}
                        </span>
                      )}
                    </h3>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                    {activeFollowUps.length > 0 ? (
                      <div className="divide-y divide-zinc-800/50">
                        {activeFollowUps.map(n => {
                          const status = getReminderStatus(n);
                          return (
                            <div key={`notif-item-${n.id}`} className="p-3 hover:bg-zinc-800/50 transition-colors group">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-zinc-200 truncate pr-2">{n.name}</span>
                                <span className={`shrink-0 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight border ${status.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ')}`}>
                                  {status.text}
                                </span>
                              </div>
                              {n.jobPosition && (
                                <p className="text-[10px] text-zinc-500 truncate mb-2">{n.jobPosition}</p>
                              )}
                              <button
                                onClick={() => {
                                  setActiveTab('list');
                                  setShowNotifications(false);
                                }}
                                className="text-[10px] text-orange-400 font-bold hover:text-orange-300 flex items-center gap-1 transition-colors"
                              >
                                View Connection
                                <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="bg-zinc-800/50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-xs text-zinc-500">No new follow-ups at the moment.</p>
                      </div>
                    )}
                  </div>

                  {activeFollowUps.length > 0 && (
                    <div className="p-3 bg-zinc-900/50 border-t border-zinc-800">
                      <button
                        onClick={() => {
                          setActiveTab('list');
                          setShowNotifications(false);
                        }}
                        className="w-full bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                      >
                        Go to Follow-ups List
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Toast Notifications */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {shouldShowToast && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9, y: 0 }}
              animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              whileHover={{ scale: 1.01 }}
              className="group relative bg-zinc-900/90 backdrop-blur-md border border-orange-500/20 shadow-xl shadow-orange-900/20 rounded-xl p-3 w-72 flex gap-3 overflow-hidden"
            >
              <div className="relative shrink-0">
                <div className="bg-orange-500/10 p-2 rounded-lg border border-orange-500/10">
                  <Bell className="w-4 h-4 text-orange-400" />
                </div>
              </div>

              <div className="flex-1 min-w-0 relative">
                <button 
                  onClick={dismissGlobalToast}
                  className="absolute -top-1 -right-1 p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all z-10"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>

                <div className="mb-2 pr-4">
                  <h4 className="text-[13px] font-bold text-white tracking-tight leading-tight truncate">
                    {activeFollowUps.length} Active Follow-up{activeFollowUps.length > 1 ? 's' : ''}
                  </h4>
                </div>

                <div className="space-y-1.5 mb-3">
                  {activeFollowUps.slice(0, 2).map(n => {
                    const status = getReminderStatus(n);
                    return (
                      <div key={`global-toast-name-${n.id}`} className="flex justify-between items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-300 truncate flex-1">{n.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight border ${status.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ')}`}>
                          {status.text}
                        </span>
                      </div>
                    );
                  })}
                  {activeFollowUps.length > 2 && (
                    <div className="text-[9px] text-zinc-500 italic flex items-center gap-1.5">
                      <span className="w-0.5 h-0.5 bg-zinc-700 rounded-full" />
                      +{activeFollowUps.length - 2} more
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setActiveTab('list');
                    dismissGlobalToast();
                  }}
                  className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-bold py-1.5 rounded-lg border border-orange-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>View All</span>
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Tools
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
          </p>
        </motion.header>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 flex gap-1 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('excel')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'excel' 
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
              `}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel Import
            </button>
            <button
              onClick={() => setActiveTab('cleaner')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'cleaner' 
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
              `}
            >
              <Sparkles className="w-4 h-4" />
              Message Cleaner
            </button>
            <button
              onClick={() => setActiveTab('messenger')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'messenger' 
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
              `}
            >
              <MessageSquare className="w-4 h-4" />
              Quick Connect
            </button>
            <button
              onClick={() => setActiveTab('eod')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'eod' 
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
              `}
            >
              <ClipboardList className="w-4 h-4" />
              EOD
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'prompt' 
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
              `}
            >
              <FileText className="w-4 h-4" />
              Copy Prompt
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'list'
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
              `}
            >
              <ListTodo className="w-4 h-4" />
              Simple List
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-tight">
                {names.filter(n => n.addedAt === new Date().toISOString().split('T')[0]).length + 
                 names2.filter(n => n.addedAt === new Date().toISOString().split('T')[0]).length}
              </span>
            </button>
          </div>
        </div>

        <main className="space-y-12">
          <AnimatePresence mode="wait">
            {activeTab === 'excel' ? (
              <motion.div
                key="excel"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {data.length === 0 ? (
                  <ExcelUploader onDataLoaded={handleDataLoaded} />
                ) : (
                  <DataViewer 
                    data={data} 
                    fileName={fileName} 
                    onReset={handleReset} 
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDirection={filterDirection}
                    onFilterDirectionChange={setFilterDirection}
                    currentMatchIndex={currentMatchIndex}
                    onMatchIndexChange={setCurrentMatchIndex}
                  />
                )}
              </motion.div>
            ) : activeTab === 'cleaner' ? (
              <motion.div
                key="cleaner"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCleaner onNameAdded={refreshNames} />
              </motion.div>
            ) : activeTab === 'messenger' ? (
              <motion.div
                key="messenger"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Messenger />
              </motion.div>
            ) : activeTab === 'eod' ? (
              <motion.div
                key="eod"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <EODGenerator />
              </motion.div>
            ) : activeTab === 'prompt' ? (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DocxPromptReader />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <SimpleList 
                  names={names} 
                  setNames={setNames} 
                  names2={names2} 
                  setNames2={setNames2} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center text-sm text-zinc-600"
        >
          <p>&copy; {new Date().getFullYear()} Excel Import Tool. Local processing only.</p>
        </motion.footer>
      </div>
    </div>
  );
}

export default App;
