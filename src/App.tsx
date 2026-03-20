import { useState, useEffect } from 'react';
import { ExcelUploader } from './components/ExcelUploader';
import { DataViewer } from './components/DataViewer';
import { MessageCleaner } from './components/MessageCleaner';
import { Messenger } from './components/Messenger';
import { EODGenerator } from './components/EODGenerator';
import { DocxPromptReader } from './components/DocxPromptReader';
import { SimpleList } from './components/SimpleList';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Sparkles, MessageSquare, ClipboardList, FileText, ListTodo } from 'lucide-react';

type Row = Record<string, unknown>;

interface NameEntry {
  id: string;
  name: string;
  timestamp: number;
  addedAt: string;
}

const SIMPLE_LIST_STORAGE_KEY = 'simple_manual_list';

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

  // Persist names when they change
  useEffect(() => {
    localStorage.setItem(SIMPLE_LIST_STORAGE_KEY, JSON.stringify(names));
  }, [names]);

  // Function to refresh names from localStorage (for MessageCleaner sync)
  const refreshNames = () => {
    const saved = localStorage.getItem(SIMPLE_LIST_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNames(parsed);
      } catch (e) {
        console.error('Error refreshing names:', e);
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
                {names.length}
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
                <SimpleList names={names} setNames={setNames} />
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
