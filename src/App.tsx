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

  // Global Toast State
  const [globalToastDismissed, setGlobalToastDismissed] = useState(false);
  
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

  const activeFollowUps = useMemo(() => {
    const allNames = [...names, ...names2];
    return allNames.filter(n => {
      return n.connected && !n.followUpDone;
    });
  }, [names, names2]);

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
      {/* Global Toast Notifications */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {activeFollowUps.length > 0 && !globalToastDismissed && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-zinc-900 border border-orange-500/30 shadow-xl shadow-orange-900/20 rounded-xl p-4 w-80 flex gap-4"
            >
              <div className="bg-orange-500/10 p-2 rounded-lg h-fit">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-zinc-100 mb-1">
                    {activeFollowUps.length} Active Follow-up{activeFollowUps.length > 1 ? 's' : ''}
                  </h4>
                  <button 
                    onClick={() => setGlobalToastDismissed(true)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-zinc-400 mb-3 space-y-1">
                  <p>You have pending connections with:</p>
                  <ul className="list-disc list-inside pl-2 font-semibold text-zinc-200">
                    {activeFollowUps.slice(0, 3).map(n => {
                      const status = getReminderStatus(n);
                      return (
                        <li key={`global-toast-name-${n.id}`} className="truncate flex justify-between items-center gap-2">
                          <span className="truncate">{n.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${status.color.replace('border-', '')}`}>
                            {status.text}
                          </span>
                        </li>
                      );
                    })}
                    {activeFollowUps.length > 3 && (
                      <li className="text-zinc-500 italic font-normal mt-1">
                        + {activeFollowUps.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('list');
                      // Note: We can't directly set the sub-tab here without lifting that state too,
                      // but navigating to the list tab gets them close enough.
                      setGlobalToastDismissed(true);
                    }}
                    className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    View Follow-ups
                  </button>
                </div>
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
