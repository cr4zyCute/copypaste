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
    let headerNameFound = false;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let name = '';
      
      // Pattern 0: Header Full Name (Often the very first line of a pasted profile or conversation)
      if (!headerNameFound && index < 10 && /^[A-Z][a-z]+(?:\s+[A-Z][a-z.,]+){1,5}$/.test(trimmed)) {
        // Double check surrounding lines for LinkedIn context
        const nextLine = lines[index + 1]?.trim() || '';
        const prevLine = lines[index - 1]?.trim() || '';
        const isHeader = 
          nextLine.includes('connection') || 
          nextLine.includes('degree') || 
          nextLine.includes('owner') || 
          nextLine.includes('manager') ||
          nextLine.includes('Chief') ||
          prevLine.includes('Oct') || 
          prevLine.includes('Nov') || 
          prevLine.includes('Feb') || 
          prevLine.includes('202');
          
        if (isHeader) {
          name = trimmed;
          headerNameFound = true; // Once we find the header name, we stop looking for other header patterns
        }
      }

      // Pattern 1: Name • 1st/2nd/3rd (Strictly short lines only)
      if (!name && trimmed.length < 50) {
        const dotMatch = trimmed.match(/^([^•\n]+)\s*•/);
        if (dotMatch) {
          name = dotMatch[1].trim();
        } 
        // Pattern 2: Common name prefix or just capitalized words (Strictly short lines)
        else if (/^(?:(?:Ms\.|Mr\.|Sir|Ma'am)\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z.,]+){1,5}$/.test(trimmed)) {
          // EXCLUSION: If it looks like a job title (Pure Grid Business Executive), skip it
          const jobKeywords = ['Executive', 'Manager', 'Owner', 'Founder', 'Director', 'President', 'VP', 'Lead', 'Chief', 'Specialist', 'Partner', 'Principal'];
          const isJobTitle = jobKeywords.some(word => trimmed.includes(word));
          if (!isJobTitle) {
            name = trimmed;
          }
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
        // Clean up name from LinkedIn noise
        name = name
          .replace(/\d+(?:st|nd|rd|th)\s+degree\s+connection/gi, '')
          .replace(/·\s*\d+(?:st|nd|rd|th)/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const lower = name.toLowerCase();
        // Exclude Lorelie Juntilla and common UI text
        if (!lower.includes('lorelie') && 
            !lower.includes('juntilla') && 
            !lower.includes('message') && 
            !lower.includes('profile')) {
          // Check if it's already in storedProspects - but only block if it's the EXACT same name
          // If the new name is "Clark Gable" and we have "Clark", we WANT to include it so it can be updated
          const alreadyExistsExactly = storedProspects.some(p => p.name === name);
          
          // Check if this name or any variation of it has been deleted
          const isDeleted = deletedProspects.some(d => {
            const dLower = d.toLowerCase();
            const nLower = name.toLowerCase();
            return dLower === nLower || dLower.startsWith(nLower + ' ') || nLower.startsWith(dLower + ' ');
          });

          if (!isDeleted && !alreadyExistsExactly) {
            newNames.add(name);
          }
        }
      }
    });

    if (newNames.size > 0) {
      const namesArray = Array.from(newNames);
      const today = new Date().toISOString().split('T')[0];

      // Filter out names from namesArray if a longer version of the same name is present in the same batch
      const filteredNamesArray = namesArray.filter(name => {
        return !namesArray.some(other => other !== name && other.toLowerCase().startsWith(name.toLowerCase() + ' '));
      });

      setStoredProspects(prev => {
        let next = [...prev];
        let nextStatuses = { ...prospectStatuses };
        let changed = false;

        filteredNamesArray.forEach(name => {
          const lowerName = name.toLowerCase();
          const existingIdx = next.findIndex(p => {
            const pLower = p.name.toLowerCase();
            return pLower === lowerName || pLower.startsWith(lowerName + ' ') || lowerName.startsWith(pLower + ' ');
          });

          if (existingIdx === -1) {
            // New prospect
            next.push({ name, addedAt: today });
            nextStatuses[name] = 1; // Default to Follow-up #1
            changed = true;
          } else {
            // Existing prospect - check for name upgrade
            const existingName = next[existingIdx].name;
            if (name.length > existingName.length) {
              // Upgrade to full name
              next[existingIdx] = { ...next[existingIdx], name };
              
              // Migrate status to the new full name key
              if (nextStatuses[existingName] !== undefined) {
                nextStatuses[name] = nextStatuses[existingName];
                delete nextStatuses[existingName];
              } else {
                nextStatuses[name] = 1; // Fallback default
              }
              changed = true;
            } else {
              // Already have this name or a better version, but ensure it has a status
              if (nextStatuses[existingName] === undefined || nextStatuses[existingName] === 'none') {
                nextStatuses[existingName] = 1;
                changed = true;
              }
            }
          }
        });

        if (changed) {
          setProspectStatuses(nextStatuses);
          return next;
        }
        return prev;
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
    const modeSpecificInstructions = {
      'Reply': `GOAL: Continue an active conversation. 
- MUST: Acknowledge their last message specifically.
- MUST: Ask a curious question or share a relevant insight to keep the dialogue moving.
- MUST: Subtly match the prospect’s tone and communication style (unless aggressive/negative).
- TONE: Collaborative, engaging, and non-salesy.`,
      'Follow-up': `GOAL: Re-engage after no response.
- MUST: Be non-pushy and offer an "out" (e.g., "If this isn’t a priority right now, no worries at all").
- MUST: Use a soft acknowledgment of time (e.g., "Just wanted to follow up in case this slipped through").
- MUST: Offer a NEW value point or resource (e.g., "The Anatomy of Operational Chaos" visual) that wasn't mentioned before.
- MUST NOT: Repeat the same questions or information from previous messages.
- TASK: Determine if we should mark the lead as "Not Interested" based on the context.`,
      'Close': `GOAL: Respectfully end the outreach.
- MUST: Acknowledge the time since last contact (e.g., "I realize it’s been a while").
- MUST: Express complete understanding that this might not be a priority right now.
- MUST: Leave the door open for the future "no strings attached".
- MUST NOT: Pitch services or ask for a meeting.`
    };

    return `You are a LinkedIn conversation strategist focused on outbound networking, relationship building, and business development for Avidus, responding as Lorelie or Kathlynn Mae. 

STRICT MODE: The user has selected "${mode}" mode. You MUST follow the ${mode} guidelines below.

---------------------------------- 
CURRENT MODE GUIDELINES (${mode})
${modeSpecificInstructions[mode]}

---------------------------------- 
ICP (Ideal Customer Profile):
- HVAC, Plumbing, and Electrical (Repair & Maintenance) operations leaders.
- Key Pain Points: Labor crunch, dispatch chaos, technicians losing ~25% of their day on paperwork/admin.

AVIDUS UVP (Unique Value Proposition):
- Outcome: Reduced job scheduling delays by 30% and improved response times.
- Solution: Offloading admin, scheduling, invoicing, and dispatch to Avidus.
- Assets: "The Anatomy of Operational Chaos" (a 1-page visual mapping time leaks).
- Diagnostic Tools: 
  * FixFlow™ Operational Chaos Diagnostic (https://operationalchaos.scoreapp.com/) - Focus on scheduling/admin bottlenecks.
  * The Bottleneck Diagnostic (https://bottleneckdiagnostic.scoreapp.com/) - Focus on business owner freedom and delegation readiness.
  * Use these as high-value, no-pressure offers to uncover improvement areas at a fraction of the usual cost.

---------------------------------- 
PERSONALITY PROFILE (Kathlynn Mae):
- Tone: Polite, professional, empathetic, clear, concise, structured, warm, and approachable.
- Traits: Organized, detail-oriented, polished, adaptable, and an empathetic listener.
- Guidelines: Begin with polite acknowledgment, use full sentences, frame requests as questions or suggestions politely without being pushy, and always express appreciation for the recipient’s time, efforts, or expertise.

CORE PRINCIPLES:
- Personalization: Reference one specific insight, achievement, or feature of the sendee’s company/UVP to show genuine interest.
- Platform: LinkedIn-friendly, easy to read, and strictly concise.
- Approach: Curious or helpful, prioritizing relationship building over selling.
- End with a positive, appreciative, or open-ended closing. 
- DO NOT use em-dashes (—) or "---" to avoid sounding generic/AI.

21-DAY SEQUENCE CONTEXT (Use for stage analysis):
- Day 1: Connect (Zero pitch - "I work with HVAC/Plumbing ops leaders...")
- Day 3: "Ops Reality" Check ("Are you handling after-hours calls in-house or is it falling on techs?")
- Day 5: Infographic Offer ("The Anatomy of Operational Chaos" - Permission-based, no pitch)
- Day 7: Pivot to Discovery (10-minute diagnostic to see how much revenue gaps are costing)

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
- Prospect intent and engagement level.
- Conversation stage based on the 21-Day Sequence and ${mode} mode.
 
2. Generate the BEST next message: 
- Provide exactly 4 distinct response options labeled "Option 1", "Option 2", "Option 3", and "Option 4". 
- Each option MUST be exactly 2–3 sentences. 
- Tone Distribution: Option 1 (Professional), Option 2 (Warm), Option 3 (Direct), Option 4 (Value-focused).
- Each option MUST reference one specific insight or achievement related to the sendee's company/UVP.
- All options MUST strictly adhere to the ${mode} GOAL and the Kathlynn Mae personality guidelines.
 
3. Non-Response Analysis: 
Analyze why the prospect is not responding based on the context and if we should mark as "Not Interested".
 
---------------------------------- 
OUTPUT FORMAT (Strictly follow this structure)
 
Ideal Response: 
[Copyable LinkedIn message ONLY - Choose the best of the 4 options to show as the primary recommendation] 
 
Reasoning: 
- Key conversation dynamics: [Analysis of the prospect's signals]
- Why this response is the best approach: [Strategy used]
- How it preserves relationship and positions outreach: [Kathlynn Mae tone application]
 
Options 1-4:
[List the 4 message options here for the user to choose from]

Why Prospect Is Not Interested: 
[Detailed explanation based on conversation signals or non-response patterns]`;
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
