import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Plus, Trash2, Calendar, ClipboardList } from 'lucide-react';

interface EODTask {
  id: string;
  content: string;
}

const STORAGE_KEY_EOD_TASKS = 'eod_generator_tasks';
const STORAGE_KEY_EOD_DATE = 'eod_generator_date';

const DEFAULT_TASKS = [
  'Attended the scheduled meeting and actively participated in the discussion.',
  'Completed a task involving replying to prospects and properly assigning them to Ms. Gab or Sir Ven.',
  'Worked on updating the “Added in Asana” status (currently in progress).',
  'Attended the daily huddle with Ms. Kath, Sir Ven, Ms. Gab, and fellow OJTs, aligning on tasks and priorities for the day.'
];

export const EODGenerator: React.FC = () => {
  const getTodayDate = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  };

  const [date, setDate] = useState(() => {
    const savedDate = localStorage.getItem(STORAGE_KEY_EOD_DATE);
    return savedDate || getTodayDate();
  });

  const [tasks, setTasks] = useState<EODTask[]>(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY_EOD_TASKS);
    if (savedTasks) return JSON.parse(savedTasks);
    
    return DEFAULT_TASKS.map((content, idx) => ({
      id: String(idx),
      content
    }));
  });

  const [newTask, setNewTask] = useState('');
  const [copied, setCopied] = useState(false);
  const nextId = () => {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  };

  const handleSetToday = () => {
    setDate(getTodayDate());
  };

  const handleResetToTemplate = () => {
    if (confirm('Reset to default template? This will clear current tasks.')) {
      setTasks(DEFAULT_TASKS.map((content, idx) => ({
        id: String(idx),
        content
      })));
    }
  };

  const handleQuickAdd = (content: string) => {
    const task: EODTask = {
      id: nextId(),
      content
    };
    setTasks([...tasks, task]);
  };

  const handleClearAll = () => {
    if (confirm('Clear all tasks?')) {
      setTasks([]);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EOD_TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EOD_DATE, date);
  }, [date]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    const task: EODTask = {
      id: nextId(),
      content: newTask.trim()
    };
    
    setTasks([...tasks, task]);
    setNewTask('');
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleUpdateTask = (id: string, content: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, content } : t));
  };

  const generateEOD = () => {
    let output = `EOD: ${date}\n`;
    tasks.forEach(task => {
      output += `• ${task.content}\n`;
    });
    return output.trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateEOD());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy EOD:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Settings Side */}
      <div className="lg:col-span-5 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-6 text-xl font-semibold">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <h2>EOD Tasks</h2>
          </div>

          <div className="space-y-4">
            {/* Date Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Report Date
                </label>
                <button
                  onClick={handleSetToday}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-tight bg-blue-400/10 px-2 py-0.5 rounded transition-colors"
                >
                  Set to Today
                </button>
              </div>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="MM/DD/YY"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>

            {/* Quick Templates Section */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Quick Add Tasks
                </label>
                <button
                  onClick={handleResetToTemplate}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-tight bg-zinc-800 px-2 py-0.5 rounded transition-colors"
                >
                  Reset Template
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DEFAULT_TASKS.map((task, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAdd(task)}
                    className="text-left text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 transition-all line-clamp-1 group relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 text-blue-400">
                      <Plus className="w-3 h-3" />
                    </span>
                    {task}
                  </button>
                ))}
              </div>
            </div>

            {/* Task List Management */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Today's Timeline
                </label>
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-tight transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex gap-2"
                  >
                    <textarea
                      value={task.content}
                      onChange={(e) => handleUpdateTask(task.id, e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none min-h-[60px]"
                    />
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all h-fit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add new task..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newTask.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Preview Side */}
      <div className="lg:col-span-7">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
              Generated Report
            </h3>
            <button
              onClick={handleCopy}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${copied 
                  ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/50' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'}
              `}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy EOD
                </>
              )}
            </button>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 text-zinc-100 font-mono text-sm whitespace-pre-wrap leading-relaxed min-h-[200px]">
            {generateEOD()}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
