import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Copy, Check, Wand2, Users, Trash2, Bell, Ban, Search, Calendar } from 'lucide-react';

const STORAGE_KEY_INPUT = 'linkedin_strategist_input';
const STORAGE_KEY_STATUSES = 'linkedin_strategist_statuses';
const STORAGE_KEY_DELETED = 'linkedin_strategist_deleted';
const STORAGE_KEY_PROSPECTS = 'linkedin_strategist_prospects';

interface Prospect {
  name: string;
  addedAt: string; // ISO date string (YYYY-MM-DD)
}

export const DocxPromptReader: React.FC = () => {
  const [inputMessage, setInputMessage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_INPUT) || '';
  });
  const [copied, setCopied] = useState(false);
  const [namesCopied, setNamesCopied] = useState(false);
  const [mode, setMode] = useState<'Reply' | 'Follow-up' | 'Close'>('Reply');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [prospectStatuses, setProspectStatuses] = useState<Record<string, 'none' | 'not-interested' | number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STATUSES);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach(key => {
      if (parsed[key] === 'follow-up') parsed[key] = 1;
    });
    return parsed;
  });

  const [deletedProspects, setDeletedProspects] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DELETED);
    return saved ? JSON.parse(saved) : [];
  });

  const [storedProspects, setStoredProspects] = useState<Prospect[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROSPECTS);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Migration: if it was a string array, convert to Prospect objects
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        return parsed.map(name => ({ name, addedAt: new Date().toISOString().split('T')[0] }));
      }
      return parsed;
    } catch {
      return [];
    }
  });

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INPUT, inputMessage);
  }, [inputMessage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATUSES, JSON.stringify(prospectStatuses));
  }, [prospectStatuses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(deletedProspects));
  }, [deletedProspects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROSPECTS, JSON.stringify(storedProspects));
  }, [storedProspects]);

  // Extract and accumulate prospects from inputMessage
  useEffect(() => {
    if (!inputMessage.trim()) return;
    
    const lines = inputMessage.split('\n');
    const newNames = new Set<string>();
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let name = '';
      
      // Pattern 1: Name • 1st/2nd/3rd (Strictly short lines only)
      if (trimmed.length < 50) {
        const dotMatch = trimmed.match(/^([^•\n]+)\s*•/);
        if (dotMatch) {
          name = dotMatch[1].trim();
        } 
        // Pattern 2: Common name prefix or just capitalized words (Strictly short lines)
        else if (/^(?:(?:Ms\.|Mr\.|Sir|Ma'am)\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(trimmed)) {
          name = trimmed;
        }
      }

      // Pattern 3: Greetings (Hi Stuart, Hello Stuart, etc.) - Can be on any line length
      if (!name) {
        const greetingMatch = trimmed.match(/^(?:Hi|Hello|Hey|Greetings|Dear)\s+([A-Z][a-z]+)/i);
        if (greetingMatch) {
          name = greetingMatch[1].trim();
        }
      }

      // Pattern 4: Thanks for connecting (Thanks for connecting, Ross!)
      if (!name) {
        const thanksMatch = trimmed.match(/Thanks for connecting,\s+([A-Z][a-z]+)/i);
        if (thanksMatch) {
          name = thanksMatch[1].trim();
        }
      }

      if (name) {
        const lower = name.toLowerCase();
        // Exclude Lorelie Juntilla and common UI text
        if (!lower.includes('lorelie') && 
            !lower.includes('juntilla') && 
            !lower.includes('message') && 
            !lower.includes('profile')) {
          // Only add if not in deleted list AND not already in storedProspects
          if (!deletedProspects.includes(name) && !storedProspects.some(p => p.name === name)) {
            newNames.add(name);
          }
        }
      }
    });

    if (newNames.size > 0) {
      const namesArray = Array.from(newNames);
      const today = new Date().toISOString().split('T')[0];
      const newProspects: Prospect[] = namesArray.map(name => ({
        name,
        addedAt: today
      }));
      
      setStoredProspects(prev => [...prev, ...newProspects]);
      setProspectStatuses(prev => {
        const next = { ...prev };
        namesArray.forEach(name => {
          if (!next[name] || next[name] === 'none') {
            next[name] = 1; // Default to Follow-up #1
          }
        });
        return next;
      });
    }
  }, [inputMessage, deletedProspects, storedProspects]);

  const toggleStatus = (name: string, status: 'not-interested' | 'follow-up') => {
    setProspectStatuses(prev => {
      const current = prev[name];
      if (status === 'not-interested') {
        return {
          ...prev,
          [name]: current === 'not-interested' ? 'none' : 'not-interested'
        };
      } else {
        const currentCount = typeof current === 'number' ? current : 0;
        const nextCount = currentCount >= 3 ? 'none' : currentCount + 1;
        return {
          ...prev,
          [name]: nextCount
        };
      }
    });
  };

  const handleDeleteProspect = (name: string) => {
    setDeletedProspects(prev => [...prev, name]);
    setStoredProspects(prev => prev.filter(p => p.name !== name));
  };

  const handleCopyNames = async () => {
    if (storedProspects.length === 0) return;
    try {
      const names = storedProspects.map(p => p.name);
      await navigator.clipboard.writeText(names.join('\n'));
      setNamesCopied(true);
      setTimeout(() => setNamesCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy names:', err);
    }
  };

  const handleClear = () => {
    if (confirm('Clear conversation and all stored prospects?')) {
      setInputMessage('');
      setProspectStatuses({});
      setDeletedProspects([]);
      setStoredProspects([]);
      localStorage.removeItem(STORAGE_KEY_INPUT);
      localStorage.removeItem(STORAGE_KEY_STATUSES);
      localStorage.removeItem(STORAGE_KEY_DELETED);
      localStorage.removeItem(STORAGE_KEY_PROSPECTS);
    }
  };

  const filteredProspects = React.useMemo(() => {
    return storedProspects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = p.addedAt === selectedDate;
      return matchesSearch && matchesDate;
    });
  }, [storedProspects, searchQuery, selectedDate]);

  const statusCounts = React.useMemo(() => {
    const counts = {
      notInterested: 0,
      followUp: 0
    };
    filteredProspects.forEach(p => {
      if (prospectStatuses[p.name] === 'not-interested') counts.notInterested++;
      if (typeof prospectStatuses[p.name] === 'number') counts.followUp++;
    });
    return counts;
  }, [filteredProspects, prospectStatuses]);

  const availableDates = React.useMemo(() => {
    const dates = new Set<string>();
    storedProspects.forEach(p => dates.add(p.addedAt));
    // Always include today
    dates.add(new Date().toISOString().split('T')[0]);
    return Array.from(dates).sort().reverse();
  }, [storedProspects]);

  const buildPromptText = () => {
    return `You are a LinkedIn conversation strategist focused on outbound networking, relationship building, and business development for Avidus. 

Generate natural, professional LinkedIn messages that move conversations forward, follow up, or close respectfully for leaders in admin-heavy, operational, or repair & maintenance roles. 
 
PERSONALITY PROFILE (Kathlynn Mae):
- Tone: Polite, professional, courteous, empathetic, clear, structured, concise, appreciative, encouraging, patient, reassuring, conciliatory, and neutral-positive.
- Traits: Organized, detail-oriented, warm, approachable, polished, adaptable, and an empathetic listener.
- Guidelines: Begin with polite acknowledgment, use full sentences, frame requests as questions or suggestions, apologize first for delays, and always express appreciation for engagement.

CORE PRINCIPLES:
- Prioritize relationship building over selling. 
- Adapt to the prospect’s specific role, company, or industry niche. 
- Include soft acknowledgment (e.g., "I know things can get busy," "Just wanted to follow up in case this slipped through") if the prospect hasn't replied. 
- End with a positive or open-ended closing. 
- DO NOT use em-dashes (—) or "---" to avoid sounding generic/AI.

BEHAVIOR BY MODE: 
- Follow-up: Offer fresh insights, workflow tips, or operational improvements (e.g., "The Anatomy of Operational Chaos" visual); avoid repeating prior messages. 
- Close: Acknowledge time since last contact, respect current priorities, and leave the door open for future engagement (no strings attached). 
- Reply: Acknowledge prior message and continue naturally with relevant value or a curious question. 

21-DAY SEQUENCE CONTEXT (If applicable):
- Day 1: Connect (Zero pitch, e.g., "I work with HVAC ops leaders to smooth out dispatch chaos.")
- Day 3: Ask a simple "Ops Reality" question (e.g., "Are after-hours calls handled in-house or by on-call techs?")
- Day 5: Offer value permission-based (e.g., "We mapped out where technicians lose 25% of their day on paperwork. Happy to send it over?")
- Day 7: Pivot to Discovery (e.g., "If those bottlenecks look familiar, I often walk teams through a 10-minute diagnostic.")

AVIDUS CASE STUDY/UVP:
- Outcome: Reduced job scheduling delays by 30% and improved customer response times for an Australian R&M company.
- Problem: Highly paid technicians lose ~25% of their day on paperwork/admin tasks.
- Solution: Offloading admin, scheduling, invoicing, and dispatch coordination to Avidus.

VARIABLES TO INCLUDE: 
- Prospect name, company, role 
- Specific challenges (scheduling, invoicing, reporting, dispatch coordination, work order tracking) 
- Links: Avidus (https://avidus.tech/) or FixFlow Diagnostic (https://operationalchaos.scoreapp.com/)

---------------------------------- 
INPUT 
 
Mode: ${mode} 
 
Conversation: 
"""
${inputMessage}
"""
 
---------------------------------- 
TASK 
 
1. Analyze: 
- Prospect intent 
- Engagement level (interested, neutral, cold, no reply) 
- Conversation stage (start, ongoing, stalled, closing) 
 
2. Generate the BEST next message: 
- Provide exactly 4 distinct response options labeled "Option 1", "Option 2", "Option 3", and "Option 4". 
- Each option MUST be exactly 3–4 sentences. 
- Tone Distribution: Option 1 (Professional), Option 2 (Warm), Option 3 (Direct), Option 4 (Value-focused).
- Fully adaptable to either admin or repair & maintenance contexts.
- Natural, human, and not salesy.
 
3. Non-Response Analysis: 
Analyze the conversation and determine the MOST LIKELY reason why the prospect is not responding. 
- Choose from: Low priority, generic message, no clear value, busy/distracted, passive interest, or too many follow-ups. 
 
---------------------------------- 
OUTPUT 
 
Ideal Response: 
[Copyable LinkedIn message ONLY] 
 
Reasoning: 
- Intent: 
- Engagement level: 
- Why this works: 
- Suggested next step:
 
Why Prospect Is Not Interested: 
[Detailed explanation based on the conversation signals]`;
  };

  const handleCopyPrompt = async () => {
    if (!inputMessage.trim()) return;
    const promptText = buildPromptText();

    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[750px]">
        {/* Left Side: Input */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm h-full overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-medium text-zinc-200">Incoming Conversation</h3>
            </div>
            {inputMessage && (
              <button 
                onClick={handleClear}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                title="Clear input"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className="text-sm text-zinc-400 mb-6 shrink-0">
            Paste the conversation or list of messages here.
          </p>

          {/* Mode Selector */}
          <div className="flex bg-zinc-950/50 border border-zinc-800 rounded-xl p-1 mb-6 shrink-0">
            {(['Reply', 'Follow-up', 'Close'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`
                  flex-1 py-2 text-xs font-medium rounded-lg transition-all
                  ${mode === m 
                    ? 'bg-zinc-800 text-blue-400 shadow-sm ring-1 ring-zinc-700' 
                    : 'text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {m}
              </button>
            ))}
          </div>

          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Paste LinkedIn messages or conversation history..."
            className="flex-1 min-h-0 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none mb-6 custom-scrollbar"
          />

          <button
            onClick={handleCopyPrompt}
            disabled={!inputMessage.trim()}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border shadow-lg shrink-0
              ${!inputMessage.trim()
                ? 'bg-zinc-800 border-transparent text-zinc-600 cursor-not-allowed' 
                : copied 
                  ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-green-900/10' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/50 shadow-blue-900/20'}
            `}
          >
            {copied ? <Check className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
            {copied ? 'Prompt Copied!' : 'Copy Framework Prompt'}
          </button>
        </div>

        {/* Right Side: Prospect List */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-medium text-zinc-200">Daily Tracking</h3>
            </div>
            
            {storedProspects.length > 0 && (
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
                {namesCopied ? 'Copied Names!' : 'Copy Names'}
              </button>
            )}
          </div>

          {/* Search and Date Filter */}
          <div className="space-y-3 mb-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prospects..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
              <div className="flex gap-1">
                {availableDates.map(date => {
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const count = storedProspects.filter(p => p.addedAt === date).length;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2
                        ${selectedDate === date 
                          ? 'bg-purple-600 border-purple-500 text-white' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}
                      `}
                    >
                      {isToday ? 'Today' : date}
                      <span className={`
                        px-1.5 py-0.5 rounded-full text-[10px] 
                        ${selectedDate === date ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}
                      `}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-0">
            <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center shrink-0">
            <div className="flex gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 uppercase tracking-tight">
                {filteredProspects.length} Showing
              </span>
              {statusCounts.followUp > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-tight">
                  {statusCounts.followUp} Follow-up
                </span>
              )}
              {statusCounts.notInterested > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-tight">
                  {statusCounts.notInterested} Not Interested
                </span>
              )}
            </div>
          </div>
            
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filteredProspects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-sm gap-3 p-8 text-center">
                  <Users className="w-8 h-8 opacity-20" />
                  <p>No prospects found for this date or search query.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProspects.map((p, idx) => {
                    const name = p.name;
                    return (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={name}
                        className={`
                          group flex items-center justify-between p-3 rounded-lg transition-all border
                          ${prospectStatuses[name] === 'not-interested' 
                            ? 'bg-red-500/5 border-red-500/20' 
                            : typeof prospectStatuses[name] === 'number'
                              ? 'bg-blue-500/5 border-blue-500/20'
                              : 'bg-zinc-950 border-transparent hover:border-zinc-800 hover:bg-zinc-900/80'}
                        `}
                      >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border
                          ${prospectStatuses[name] === 'not-interested' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : typeof prospectStatuses[name] === 'number'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'}
                        `}>
                          {name.charAt(0)}
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${prospectStatuses[name] !== 'none' ? 'text-zinc-200' : 'text-zinc-300'}`}>
                            {name}
                          </span>
                          {prospectStatuses[name] !== 'none' && (
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${prospectStatuses[name] === 'not-interested' ? 'text-red-500/70' : 'text-blue-500/70'}`}>
                              {prospectStatuses[name] === 'not-interested' 
                                ? 'Not Interested' 
                                : `Follow-up #${prospectStatuses[name]}`}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleStatus(name, 'not-interested')}
                          className={`
                            p-1.5 rounded-md transition-all
                            ${prospectStatuses[name] === 'not-interested'
                              ? 'bg-red-500/20 text-red-400'
                              : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'}
                          `}
                          title="Mark as Not Interested"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(name, 'follow-up')}
                          className={`
                            p-1.5 rounded-md transition-all relative
                            ${typeof prospectStatuses[name] === 'number'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10'}
                          `}
                          title="Increment Follow-up Count"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {typeof prospectStatuses[name] === 'number' && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold shadow-sm">
                              {prospectStatuses[name]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(name);
                          }}
                          className="p-1.5 text-zinc-600 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
                          title="Copy name"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProspect(name)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete prospect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </motion.div>  );
};
