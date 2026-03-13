import { useState } from 'react';
import { ExcelUploader } from './components/ExcelUploader';
import { DataViewer } from './components/DataViewer';
import { MessageCleaner } from './components/MessageCleaner';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Sparkles } from 'lucide-react';

function App() {
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'excel' | 'cleaner'>('excel');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<'up' | 'down'>('down');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const handleDataLoaded = (loadedData: any[], name: string) => {
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
            Excel Import & Tools
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Simple, secure, and fast tools for your workflow.
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
            ) : (
              <motion.div
                key="cleaner"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCleaner />
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
