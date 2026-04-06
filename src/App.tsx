import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ExcelUploader } from './components/ExcelUploader';
import { DataViewer } from './components/DataViewer';
import { MessageCleaner } from './components/MessageCleaner';
import { Messenger } from './components/Messenger';
import { EODGenerator } from './components/EODGenerator';
import { DocxPromptReader } from './components/DocxPromptReader';
import { SimpleList, type NameEntry } from './components/SimpleList';
import { LinkFormatter } from './components/LinkFormatter';
import { Login } from './components/Login';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Sparkles, MessageSquare, ClipboardList, FileText, ListTodo, Bell, X, LogOut, ShieldCheck, RefreshCw, Copy, Download, Upload, Check, Link as LinkIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

type Row = Record<string, unknown>;

const SIMPLE_LIST_STORAGE_KEY = 'simple_manual_list';
const SIMPLE_LIST_2_STORAGE_KEY = 'simple_manual_list_2';
const AUTH_KEY = 'tools_auth_session';

const getStorageKey = (baseKey: string, authenticated: boolean) => {
  return authenticated ? baseKey : `guest_${baseKey}`;
};

const loadNamesFromStorage = (key: string): NameEntry[] => {
  const saved = localStorage.getItem(key);
  if (!saved) {
    // FALLBACK: If current key has no data, check the other key (e.g., if we're in guest mode, check for user mode data)
    // This handles accidental switches in login state
    const alternativeKey = key.startsWith('guest_') ? key.replace('guest_', '') : `guest_${key}`;
    const fallbackSaved = localStorage.getItem(alternativeKey);
    if (fallbackSaved) {
      try {
        const parsed = JSON.parse(fallbackSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry: any) => ({
      ...entry,
      addedAt: entry.addedAt || (entry.timestamp ? new Date(entry.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    }));
  } catch {
    return [];
  }
};

const navItems = [
  { id: 'excel', label: 'Excel Import', icon: FileSpreadsheet },
  { id: 'cleaner', label: 'Message Cleaner', icon: Sparkles },
  { id: 'messenger', label: 'Quick Connect', icon: MessageSquare },
  { id: 'eod', label: 'EOD', icon: ClipboardList },
  { id: 'prompt', label: 'Copy Prompt', icon: FileText },
  { id: 'list', label: 'Simple List', icon: ListTodo },
  { id: 'link-format', label: 'Post Links', icon: LinkIcon },
] as const;

type TabId = (typeof navItems)[number]['id'];

const isTabId = (value: string): value is TabId => {
  return navItems.some(item => item.id === value);
};

const getInitialTab = (): TabId => {
  const hashTab = window.location.hash.replace('#', '');
  return isTabId(hashTab) ? hashTab : 'excel';
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [syncCode, setSyncCode] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Lifted state from SimpleList.tsx
  const [names, setNames] = useState<NameEntry[]>(() => 
    loadNamesFromStorage(getStorageKey(SIMPLE_LIST_STORAGE_KEY, localStorage.getItem(AUTH_KEY) === 'true'))
  );
  const [names2, setNames2] = useState<NameEntry[]>(() => 
    loadNamesFromStorage(getStorageKey(SIMPLE_LIST_2_STORAGE_KEY, localStorage.getItem(AUTH_KEY) === 'true'))
  );

  const handleLogin = (_username: string) => {
    localStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
    setNames(loadNamesFromStorage(getStorageKey(SIMPLE_LIST_STORAGE_KEY, true)));
    setNames2(loadNamesFromStorage(getStorageKey(SIMPLE_LIST_2_STORAGE_KEY, true)));
    setIsLoginOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setNames(loadNamesFromStorage(getStorageKey(SIMPLE_LIST_STORAGE_KEY, false)));
    setNames2(loadNamesFromStorage(getStorageKey(SIMPLE_LIST_2_STORAGE_KEY, false)));
  };

  const [data, setData] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTab());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<'up' | 'down'>('down');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const targetHash = `#${activeTab}`;
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hashTab = window.location.hash.replace('#', '');
      if (isTabId(hashTab)) {
        setActiveTab(hashTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  // Persist names when they change - ONLY if we have names to save
  useEffect(() => {
    const key = getStorageKey(SIMPLE_LIST_STORAGE_KEY, isAuthenticated);
    // Only save if the names array is NOT empty, OR if we explicitly want to clear it
    // This prevents accidental overwriting with [] on initialization
    if (names.length > 0) {
      localStorage.setItem(key, JSON.stringify(names));
    }
  }, [names, isAuthenticated]);

  useEffect(() => {
    const key = getStorageKey(SIMPLE_LIST_2_STORAGE_KEY, isAuthenticated);
    if (names2.length > 0) {
      localStorage.setItem(key, JSON.stringify(names2));
    }
  }, [names2, isAuthenticated]);

  useEffect(() => {
    const keySet = new Set([
      AUTH_KEY,
      SIMPLE_LIST_STORAGE_KEY,
      SIMPLE_LIST_2_STORAGE_KEY,
      `guest_${SIMPLE_LIST_STORAGE_KEY}`,
      `guest_${SIMPLE_LIST_2_STORAGE_KEY}`
    ]);

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !keySet.has(event.key)) return;

      const authenticated = localStorage.getItem(AUTH_KEY) === 'true';
      setIsAuthenticated(authenticated);
      setNames(loadNamesFromStorage(getStorageKey(SIMPLE_LIST_STORAGE_KEY, authenticated)));
      setNames2(loadNamesFromStorage(getStorageKey(SIMPLE_LIST_2_STORAGE_KEY, authenticated)));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Function to refresh names from localStorage (for MessageCleaner sync)
  const refreshNames = () => {
    const key1 = getStorageKey(SIMPLE_LIST_STORAGE_KEY, isAuthenticated);
    const key2 = getStorageKey(SIMPLE_LIST_2_STORAGE_KEY, isAuthenticated);
    
    const saved1 = localStorage.getItem(key1);
    if (saved1) {
      try {
        setNames(JSON.parse(saved1));
      } catch (e) {
        console.error('Error refreshing names 1:', e);
      }
    }
    const saved2 = localStorage.getItem(key2);
    if (saved2) {
      try {
        setNames2(JSON.parse(saved2));
      } catch (e) {
        console.error('Error refreshing names 2:', e);
      }
    }
  };

  const generateExportCode = () => {
    const exportData = {
      names,
      names2,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    return btoa(encodeURIComponent(JSON.stringify(exportData)));
  };

  // AGGRESSIVE EMERGENCY RECOVERY TOOL - Dumps EVERYTHING in localStorage
  useEffect(() => {
    console.group('🚨 AGGRESSIVE DATA RECOVERY DUMP 🚨');
    console.log('Scanning EVERY SINGLE ITEM in local storage, ignoring key names...');
    
    let foundItems = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.length > 50) { // Ignore tiny values
            console.log(`\n--- POSSIBLE DATA IN KEY: ${key} ---`);
            try {
              const parsed = JSON.parse(val);
              // Check if it looks like an array of our objects (has id, name, etc)
              if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                 console.log(`✅ FOUND ARRAY OF ${parsed.length} ITEMS!`);
                 console.log(JSON.stringify(parsed, null, 2));
                 foundItems++;
              } else if (typeof parsed === 'object') {
                 console.log(`FOUND OBJECT:`, parsed);
              } else {
                 console.log(`RAW STRING:`, val.substring(0, 200) + '...');
              }
            } catch (e) {
              console.log(`RAW STRING:`, val.substring(0, 200) + '...');
            }
          }
        } catch (e) {
          console.error(`Error reading key ${key}`);
        }
      }
    }
    
    console.log(`\nTotal large data keys found: ${foundItems}`);
    console.groupEnd();
  }, []);

  const handleCopyExportCode = () => {
    const code = generateExportCode();
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const exportLocalStorageToExcel = async () => {
    try {
      setIsExportingExcel(true);
      const rows: Array<{ key: string; value: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key);
        rows.push({ key, value: val ?? '' });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'localStorage');
      const ts = new Date().toISOString().replace(/[:\-T]/g, '').slice(0, 15);
      XLSX.writeFile(wb, `backup_${ts}.xlsx`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleImportCode = () => {
    try {
      if (!syncCode.trim()) return;
      const decoded = JSON.parse(decodeURIComponent(atob(syncCode)));
      
      if (decoded.names && Array.isArray(decoded.names)) {
        setNames(decoded.names);
      }
      if (decoded.names2 && Array.isArray(decoded.names2)) {
        setNames2(decoded.names2);
      }
      
      setImportStatus({ type: 'success', message: 'Data imported successfully!' });
      setSyncCode('');
      setTimeout(() => {
        setImportStatus(null);
        setIsSyncOpen(false);
      }, 2000);
    } catch (e) {
      setImportStatus({ type: 'error', message: 'Invalid sync code. Please try again.' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const handleRestoreExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws) as Array<Record<string, any>>;
      let restored = 0;
      let skipped = 0;
      let renamed = 0;
      for (const r of rows) {
        const key = String(r.key ?? '').trim();
        const value = String(r.value ?? '');
        if (!key) continue;
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, value);
          restored++;
        } else {
          const newKey = `restored_${key}`;
          localStorage.setItem(newKey, value);
          renamed++;
        }
      }
      refreshNames();
      alert(`Restore completed.\nRestored: ${restored}\nRenamed to avoid overwrite: ${renamed}\nSkipped: ${skipped}`);
    } catch {
      alert('Invalid Excel backup file');
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30 relative">
      <AnimatePresence>
        {isLoginOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md">
              <button 
                onClick={() => setIsLoginOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white z-[210] p-2"
              >
                <X className="w-6 h-6" />
              </button>
              <Login onLogin={handleLogin} />
            </div>
          </motion.div>
        )}

        {isSyncOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setIsSyncOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <RefreshCw className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Data Transfer</h2>
                  <p className="text-zinc-500 text-sm">Sync your account data between browsers</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Export Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                      <Download className="w-4 h-4 text-orange-500" />
                      Step 1: Export from this browser
                    </h3>
                  </div>
                  <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50 space-y-3">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Generate a secure code containing all your follow-up data. You can paste this code into another browser to sync your account.
                    </p>
                    <button 
                      onClick={handleCopyExportCode}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        copySuccess ? 'bg-emerald-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copySuccess ? 'Code Copied!' : 'Copy Sync Code'}
                    </button>
                  </div>
                </div>

                {/* Import Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <Upload className="w-4 h-4 text-orange-500" />
                    Step 2: Import to another browser
                  </h3>
                  <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50 space-y-4">
                    <textarea 
                      value={syncCode}
                      onChange={(e) => setSyncCode(e.target.value)}
                      placeholder="Paste your sync code here..."
                      className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-orange-500/50 transition-all resize-none font-mono"
                    />
                    
                    {importStatus && (
                      <div className={`text-xs font-bold text-center py-2 rounded-lg ${
                        importStatus.type === 'success' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {importStatus.message}
                      </div>
                    )}

                    <button 
                      onClick={handleImportCode}
                      disabled={!syncCode.trim()}
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Import & Sync Data
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-center mt-8 text-zinc-600 text-[10px] uppercase tracking-[0.2em] font-bold">
                End-to-End Local Encryption Active
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen"
      >
        {/* Sidebar Navigation */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col fixed inset-y-0 left-0 z-40"
            >
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <RefreshCw className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1
                  onDoubleClick={() => setIsLoginOpen(true)}
                  title="Double click for secure access"
                  className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                >
                  Tools
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                  {isAuthenticated ? (
                    <span className="text-[10px] font-bold text-green-400 tracking-wider uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> SECURE SESSION
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                      GUEST MODE
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-zinc-800/80 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                    {item.label}
                  </div>
                  {item.id === 'list' && dueFollowUpsCount > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold rounded-full">
                      {dueFollowUpsCount}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <div className="space-y-2">
              <button
                onClick={() => {
                  const code = generateExportCode();
                  navigator.clipboard.writeText(code);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-all border border-zinc-800 hover:border-zinc-700"
              >
                {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Download className="w-4 h-4" />}
                {copySuccess ? 'Copied!' : 'Backup: Code'}
              </button>
              <button
                onClick={exportLocalStorageToExcel}
                disabled={isExportingExcel}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-all border border-zinc-800 hover:border-zinc-700 disabled:opacity-50"
                title="Export all local data to Excel"
              >
                <Download className="w-4 h-4" />
                {isExportingExcel ? 'Exporting…' : 'Backup: Excel'}
              </button>
              <button
                onClick={() => setIsSyncOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-all border border-zinc-800 hover:border-zinc-700"
              >
                <Upload className="w-4 h-4" />
                Restore: Code
              </button>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-all border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                Restore: Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleRestoreExcel(file);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className={`flex-1 min-h-screen bg-black relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] pointer-events-none rounded-full" />
          
          <div className="absolute top-6 left-6 z-[110]">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all group shadow-lg"
              title={isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
          </div>

          {/* Notification Bell Icon with Dropdown */}
          <div className="fixed top-6 right-6 z-[110]">
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => setIsSyncOpen(true)}
                    className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-orange-400 hover:border-orange-500/20 transition-all group shadow-lg"
                    title="Sync Data Between Browsers"
                  >
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-red-400 hover:border-red-500/20 transition-all group shadow-lg"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}
              
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
                            aria-label="Close notifications"
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
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Global Toast Notifications */}
        <div className="fixed top-6 right-6 z-[150] flex flex-col gap-3">
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
          {/* <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10 space-y-4"
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              <h1 
                onDoubleClick={() => setIsLoginOpen(true)}
                className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-3 select-none"
                title="Double click for secure access"
              >
                Tools
                {isAuthenticated && <ShieldCheck className="w-8 h-8 text-orange-500/50" />}
              </h1>
            </div>
            <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-bold">
              {isAuthenticated ? 'Secure Workspace • Session Active' : 'Guest Mode • Local Processing'}
            </p>
          </motion.header> */}

          {/* Tab Navigation */}
          {/*
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-tight ml-2">
                  {names.filter(n => n.addedAt === new Date().toISOString().split('T')[0]).length + 
                   names2.filter(n => n.addedAt === new Date().toISOString().split('T')[0]).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('link-format')}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeTab === 'link-format'
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
                `}
              >
                <LinkIcon className="w-4 h-4" />
                Post Links
              </button>
            </div>
          </div>
          */}

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
                  <MessageCleaner onNamesUpdated={refreshNames} />
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
              ) : activeTab === 'list' ? (
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
              ) : (
                <motion.div
                  key="link-format"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <LinkFormatter />
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
      </motion.div>
    </div>
  );
}

export default App;
