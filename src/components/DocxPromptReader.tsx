import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Copy, Check, Wand2, Users, Trash2, Bell, Ban, Search, Calendar, Settings, X, BookOpen, HelpCircle } from 'lucide-react';

const STORAGE_KEY_INPUT = 'linkedin_strategist_input';
const STORAGE_KEY_STATUSES = 'linkedin_strategist_statuses';
const STORAGE_KEY_DELETED = 'linkedin_strategist_deleted';
const STORAGE_KEY_PROSPECTS = 'linkedin_strategist_prospects';

interface Prospect {
  id: string;
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
  const [promptTemplate, setPromptTemplate] = useState<'Main' | 'Lengthy' | 'Ultra-Short' | 'Follow-up-Specific'>('Main');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'none' | 'follow-up' | 'not-interested'>('none');
  
  // Modal states
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [show21DayModal, setShow21DayModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  // Dynamic variables with localStorage persistence
  const [sender, setSender] = useState(() => localStorage.getItem('linkedin_sender') || 'Kathlynn Mae');
  const [personalityTone, setPersonalityTone] = useState(() =>
    localStorage.getItem('linkedin_personality') || 'Polite, professional, empathetic, clear, concise, structured, warm, and approachable'
  );
  const [icp, setIcp] = useState(() =>
    localStorage.getItem('linkedin_icp') || 'HVAC, Plumbing, and Electrical (Repair & Maintenance) operations leaders'
  );
  const [uvp, setUvp] = useState(() =>
    localStorage.getItem('linkedin_uvp') || 'Reduced job scheduling delays by 30% and improved response times by offloading admin, scheduling, invoicing, and dispatch'
  );
  const [lastConversationDate, setLastConversationDate] = useState('');
  const [prospectWebsite, setProspectWebsite] = useState('');
  const [prospectLinkedIn, setProspectLinkedIn] = useState('');
  
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
      // Migration: if it was a string array or missing ID, convert to Prospect objects with IDs
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (typeof item === 'string') {
            return { 
              id: Math.random().toString(36).substring(2, 9),
              name: item, 
              addedAt: new Date().toISOString().split('T')[0] 
            };
          }
          if (!item.id) {
            return {
              ...item,
              id: Math.random().toString(36).substring(2, 9)
            };
          }
          return item;
        });
      }
      return [];
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

  // Persist dynamic variables
  useEffect(() => {
    localStorage.setItem('linkedin_sender', sender);
  }, [sender]);

  useEffect(() => {
    localStorage.setItem('linkedin_personality', personalityTone);
  }, [personalityTone]);

  useEffect(() => {
    localStorage.setItem('linkedin_icp', icp);
  }, [icp]);

  useEffect(() => {
    localStorage.setItem('linkedin_uvp', uvp);
  }, [uvp]);

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
            next.push({ 
              id: Math.random().toString(36).substring(2, 9),
              name, 
              addedAt: today 
            });
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

      let matchesStatus = true;
      if (statusFilter === 'follow-up') {
        matchesStatus = typeof prospectStatuses[p.name] === 'number';
      } else if (statusFilter === 'not-interested') {
        matchesStatus = prospectStatuses[p.name] === 'not-interested';
      }

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [storedProspects, searchQuery, selectedDate, statusFilter, prospectStatuses]);

  const statusCounts = React.useMemo(() => {
    const counts = {
      notInterested: 0,
      followUp: 0
    };
    // Count from ALL prospects on the selected date, not filtered by status
    storedProspects.forEach(p => {
      if (p.addedAt === selectedDate) {
        if (prospectStatuses[p.name] === 'not-interested') counts.notInterested++;
        if (typeof prospectStatuses[p.name] === 'number') counts.followUp++;
      }
    });
    return counts;
  }, [storedProspects, selectedDate, prospectStatuses]);

  const availableDates = React.useMemo(() => {
    const dates = new Set<string>();
    storedProspects.forEach(p => dates.add(p.addedAt));
    // Always include today
    dates.add(new Date().toISOString().split('T')[0]);
    return Array.from(dates).sort().reverse();
  }, [storedProspects]);

  const buildPromptText = () => {
    // Main Prompt Template (from instruction lines 12-52)
    if (promptTemplate === 'Main') {
      const modeSpecificInstructions = {
        'Reply': `GOAL: Continue an active conversation.
- MUST: Acknowledge their last message specifically.
- MUST: Ask a curious question or share a relevant insight to keep the dialogue moving.
- MUST: Subtly match the prospect's tone and communication style (unless aggressive/negative).
- TONE: Collaborative, engaging, and non-salesy.`,
        'Follow-up': `GOAL: Re-engage after no response.
- MUST: Be non-pushy and offer an "out" (e.g., "If this isn't a priority right now, no worries at all").
- MUST: Use a soft acknowledgment of time (e.g., "Just wanted to follow up in case this slipped through").
- TASK: Determine if we should mark the lead as "Not Interested" based on the context.
- ADVISE: Suggest when we should send the next follow-up message.${lastConversationDate ? `\n- Last conversation date: ${lastConversationDate}` : ''}`,
        'Close': `GOAL: Respectfully end the outreach.
- MUST: Acknowledge the time since last contact (e.g., "I realize it's been a while").
- MUST: Express complete understanding that this might not be a priority right now.
- MUST: Leave the door open for the future "no strings attached".
- MUST NOT: Pitch services or ask for a meeting.`
      };

      return `You are a LinkedIn conversation strategist assisting with outbound networking, relationship building, and business development responding as ${sender}.
Your role is to analyze conversations, understand dynamics, and craft the most appropriate next message while adapting to the specified personality tone and ICP.

When appropriate, subtly match the prospect's tone and communication style.
If the prospect's tone appears aggressive, dismissive, or negative, do not mirror it. Instead, respond in a calm, respectful, and professional manner.

INPUT VARIABLES
Personality Tone: ${personalityTone}
ICP (Ideal Customer Profile): ${icp ? icp : 'If no ICP is provided, analyze the conversation without assuming a specific target audience.'}
${uvp ? `UVP: ${uvp}` : ''}

OBJECTIVES
1. Understand the conversation dynamics:
   - The other person's intent
   - Their engagement level
   - Whether the conversation is progressing, stalled, or closing

2. Generate the most appropriate next message in response:
   - Keep it concise, natural, and professional for LinkedIn
   - Match the specified personality tone
   - Avoid overly sales-driven language
   - Avoid forcing meetings or calls unless naturally supported
   - If the conversation is drifting or too long, guide it toward a respectful close
   - If redirected to another person, acknowledge politely and close if appropriate
   - LIMIT output to 3 sentences maximum.
   - Each option MUST reference one specific insight or achievement related to the sendee's company/UVP.

3. Maintain positioning:
   - Preserve relationships
   - Avoid unnecessary commitments
   - Keep the door open for future interaction

STRICT MODE: The user has selected "${mode}" mode. You MUST follow the ${mode} guidelines below.
${modeSpecificInstructions[mode]}

----------------------------------
CORE PRINCIPLES
- Prioritize clarity and brevity
- Maintain natural human conversation flow
- Avoid robotic or overly analytical replies
- Respect the other person's time and signals
- Focus on relationship building and professional positioning
- DO NOT use em-dashes (—) or "---" to avoid sounding generic/AI.

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
   - Conversation stage.
 
2. Generate the BEST next message:
   - Provide exactly 4 distinct response options labeled "Option 1", "Option 2", "Option 3", and "Option 4".
   - Each option MUST be exactly 2–3 sentences.
   - Tone Distribution: Option 1 (Professional), Option 2 (Warm), Option 3 (Direct), Option 4 (Value-focused).
 
3. Non-Response Analysis (if applicable):
   - Analyze why the prospect is not responding and if we should mark as "Not Interested".
 
----------------------------------
OUTPUT FORMAT (Strictly follow this structure)
 
Ideal Response:
[Copyable LinkedIn message ONLY - Choose the best of the 4 options to show as the primary recommendation]
 
Reasoning:
- Key conversation dynamics: [Analysis]
- Why this response is the best approach: [Strategy]
- How it preserves relationship and positions outreach: [Tone application]
 
Options 1-4:
[List the 4 message options here]

Why Prospect Is Not Interested:
[Detailed explanation based on conversation signals or non-response patterns]`;
    }

    // Lengthy Prompt Template (from instruction lines 54-71)
    if (promptTemplate === 'Lengthy') {
      return `You are ${sender} responding as ${sender}. Using the conversation history, analyze the context, the sendee's company (including their industry, niche, and UVP), and the sendee's professional personality (from LinkedIn, website, or public info).

When appropriate, subtly match the prospect's tone and communication style.
If the prospect's tone appears aggressive, dismissive, or negative, do not mirror it. Instead, respond in a calm, respectful, and professional manner.

Your response should be:
● Polite, professional, empathetic, clear, concise, structured, warm, and approachable (${sender} tone).
● Personalized by referencing one insight, achievement, or feature of the sendee's company/UVP.
● LinkedIn-friendly, ideally 2–3 sentences, easy to read, and concise.
● Curious or helpful, framing questions or suggestions politely without being pushy.
● Appreciative and positive, acknowledging the recipient's time, efforts, or expertise.

Limit output to 3 sentences maximum when used for LinkedIn outreach, ensuring one sentence references the sendee's company, UVP, or notable feature. Always end with a positive, professional closing or engagement signal.

Conversation:
"""
${inputMessage}
"""`;
    }

    // Ultra-Short LinkedIn Message Prompt (from instruction lines 73-77)
    if (promptTemplate === 'Ultra-Short') {
      return `We are ${sender} in this conversation. Analyze the company's niche, industry, and UVP based on their ${prospectWebsite ? `Website: ${prospectWebsite}` : 'website'} and/or ${prospectLinkedIn ? `LinkedIn: ${prospectLinkedIn}` : 'LinkedIn'}. Include one short sentence referencing a notable feature or product (e.g., ResiWealth.X). Apply a tone that is ${personalityTone}.

When appropriate, subtly match the prospect's tone and communication style.
If the prospect's tone appears aggressive, dismissive, or negative, do not mirror it. Instead, respond in a calm, respectful, and professional manner.

Limit the message to 2–3 ultra-concise sentences that are LinkedIn-friendly, easy to read, and professional. Frame questions or suggestions politely, acknowledge the recipient's context, and end positively.

Conversation:
"""
${inputMessage}
"""`;
    }

    // Follow-up Specific Prompt (from instruction lines 79-81)
    if (promptTemplate === 'Follow-up-Specific') {
      return `Now I want you to create/compose the appropriate follow up LinkedIn message for the following conversations I'll be sharing. We are ${sender} in this convo. Include the context of the conversation, be non-pushy in the message and offer an out of the conversation if they don't want to proceed.

Also determine whether we should proceed with a follow-up message or mark the lead as Not Interested / Not Qualified based on the conversation context and how long ago the conversation last ended, and advise when we should send the follow-up message.${lastConversationDate ? ` Last conversation date: ${lastConversationDate}` : ''}

When appropriate, subtly match the prospect's tone and communication style.
If the prospect's tone appears aggressive, dismissive, or negative, do not mirror it. Instead, respond in a calm, respectful, and professional manner.

Conversation:
"""
${inputMessage}
"""`;
    }

    return '';
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
              <button
                onClick={() => setShowGuideModal(true)}
                className="p-1 text-zinc-500 hover:text-blue-400 transition-colors"
                title="How to use this tool"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
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
          
          <p className="text-sm text-zinc-400 mb-4 shrink-0">
            Configure your prompt settings and paste the conversation below.
          </p>

          {/* Modal Buttons */}
          <div className="flex gap-2 mb-4 shrink-0">
            <button
              onClick={() => setShowVariablesModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Prompt Variables
            </button>
            <button
              onClick={() => setShow21DayModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              21-Day Sequence
            </button>
          </div>

          {/* Hidden content - moved to modals */}
          <div className="hidden">
            <div className="space-y-2 pl-4 border-l-2 border-zinc-800">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Sender Name</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="e.g., Kathlynn Mae"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Personality Tone</label>
                <input
                  type="text"
                  value={personalityTone}
                  onChange={(e) => setPersonalityTone(e.target.value)}
                  placeholder="e.g., Polite, professional, empathetic..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">ICP (Ideal Customer Profile)</label>
                <input
                  type="text"
                  value={icp}
                  onChange={(e) => setIcp(e.target.value)}
                  placeholder="e.g., HVAC, Plumbing operations leaders"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">UVP (Unique Value Proposition)</label>
                <input
                  type="text"
                  value={uvp}
                  onChange={(e) => setUvp(e.target.value)}
                  placeholder="e.g., Reduced scheduling delays by 30%"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              {mode === 'Follow-up' && (
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Last Conversation Date (Optional)</label>
                  <input
                    type="date"
                    value={lastConversationDate}
                    onChange={(e) => setLastConversationDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
              )}
              {promptTemplate === 'Ultra-Short' && (
                <>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Prospect Website (Optional)</label>
                    <input
                      type="text"
                      value={prospectWebsite}
                      onChange={(e) => setProspectWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Prospect LinkedIn (Optional)</label>
                    <input
                      type="text"
                      value={prospectLinkedIn}
                      onChange={(e) => setProspectLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/company/..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Prompt Template Selector */}
          <div className="mb-3 shrink-0">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Prompt Template</label>
            <div className="grid grid-cols-2 gap-1 bg-zinc-950/50 border border-zinc-800 rounded-xl p-1">
              {(['Main', 'Lengthy', 'Ultra-Short', 'Follow-up-Specific'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPromptTemplate(t)}
                  className={`
                    py-1.5 text-[10px] font-medium rounded-lg transition-all
                    ${promptTemplate === t
                      ? 'bg-zinc-800 text-purple-400 shadow-sm ring-1 ring-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-zinc-950/50 border border-zinc-800 rounded-xl p-1 mb-4 shrink-0">
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
              <button
                onClick={() => setStatusFilter('none')}
                className={`
                  text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight border transition-all cursor-pointer
                  ${statusFilter === 'none'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'}
                `}
              >
                {storedProspects.filter(p => p.addedAt === selectedDate).length} Total
              </button>
              {statusCounts.followUp > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'follow-up' ? 'none' : 'follow-up')}
                  className={`
                    text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight border transition-all cursor-pointer
                    ${statusFilter === 'follow-up'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}
                  `}
                >
                  {statusCounts.followUp} Follow-up
                </button>
              )}
              {statusCounts.notInterested > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'not-interested' ? 'none' : 'not-interested')}
                  className={`
                    text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight border transition-all cursor-pointer
                    ${statusFilter === 'not-interested'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}
                  `}
                >
                  {statusCounts.notInterested} Not Interested
                </button>
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
                        key={p.id}
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

       {/* Variables Modal */}
       <AnimatePresence>
         {showVariablesModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowVariablesModal(false)}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar"
             >
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                   <Settings className="w-5 h-5 text-blue-400" />
                   Prompt Variables
                 </h3>
                 <button
                   onClick={() => setShowVariablesModal(false)}
                   className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Sender Name</label>
                   <input
                     type="text"
                     value={sender}
                     onChange={(e) => setSender(e.target.value)}
                     placeholder="e.g., Kathlynn Mae"
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Personality Tone</label>
                   <textarea
                     value={personalityTone}
                     onChange={(e) => setPersonalityTone(e.target.value)}
                     placeholder="e.g., Polite, professional, empathetic, clear, concise..."
                     rows={3}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">ICP (Ideal Customer Profile)</label>
                   <textarea
                     value={icp}
                     onChange={(e) => setIcp(e.target.value)}
                     placeholder="e.g., HVAC, Plumbing, and Electrical operations leaders"
                     rows={2}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">UVP (Unique Value Proposition)</label>
                   <textarea
                     value={uvp}
                     onChange={(e) => setUvp(e.target.value)}
                     placeholder="e.g., Reduced job scheduling delays by 30%..."
                     rows={2}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                   />
                 </div>
                 {mode === 'Follow-up' && (
                   <div>
                     <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Last Conversation Date (Optional)</label>
                     <input
                       type="date"
                       value={lastConversationDate}
                       onChange={(e) => setLastConversationDate(e.target.value)}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                     />
                   </div>
                 )}
                 {promptTemplate === 'Ultra-Short' && (
                   <>
                     <div>
                       <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Prospect Website (Optional)</label>
                       <input
                         type="text"
                         value={prospectWebsite}
                         onChange={(e) => setProspectWebsite(e.target.value)}
                         placeholder="https://example.com"
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                       />
                     </div>
                     <div>
                       <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">Prospect LinkedIn (Optional)</label>
                       <input
                         type="text"
                         value={prospectLinkedIn}
                         onChange={(e) => setProspectLinkedIn(e.target.value)}
                         placeholder="https://linkedin.com/company/..."
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                       />
                     </div>
                   </>
                 )}
               </div>
               
               <button
                 onClick={() => setShowVariablesModal(false)}
                 className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
               >
                 Done
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* 21-Day Sequence Modal */}
       <AnimatePresence>
         {show21DayModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShow21DayModal(false)}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar"
             >
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                   <BookOpen className="w-5 h-5 text-purple-400" />
                   21-Day Value Sequence Reference
                 </h3>
                 <button
                   onClick={() => setShow21DayModal(false)}
                   className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-4 text-sm">
                 <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                   <p className="font-bold text-zinc-200 mb-2">Day 1: Connection Request (Zero Pitch)</p>
                   <p className="text-zinc-400 italic">"Hi {'{{First Name}}'}, I work with {'{{Industry: HVAC/Plumbing}}'} ops leaders to smooth out dispatch chaos. Always looking to see how other teams handle the labor crunch. Happy to connect."</p>
                 </div>
                 <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                   <p className="font-bold text-zinc-200 mb-2">Day 3: The "Ops Reality" Check (Reply Only)</p>
                   <p className="text-zinc-400 italic">"Thanks for connecting, {'{{First Name}}'}. I'm curious—with how hard it is to find admin staff right now, are you handling your after-hours and overflow calls in-house, or is that falling on your on-call techs? Just trying to get a sense of how teams your size are adapting."</p>
                 </div>
                 <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                   <p className="font-bold text-zinc-200 mb-2">Day 5: The Infographic Offer (Permission-Based)</p>
                   <p className="text-zinc-400 italic">"We've been seeing a pattern where highly paid technicians lose about 25% of their day on paperwork. We mapped out exactly where this time leaks in a 1-page visual ('The Anatomy of Operational Chaos'). Happy to send it over here if you want to take a look? No pitch attached."</p>
                 </div>
                 <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                   <p className="font-bold text-zinc-200 mb-2">Day 7: The Pivot to Discovery (First Meeting Ask)</p>
                   <p className="text-zinc-400 italic">"Glad to share that visual. If those bottlenecks look familiar, I often walk teams through a quick 10-minute diagnostic to see exactly how much revenue those gaps are costing you."</p>
                 </div>
                 <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                   <p className="text-xs text-blue-400">💡 TIP: Double check prospect's work history to see if they are still working in mentioned company or not and also check if their company is niche industry specific. ALSO double check your copy before sending. It is ideal to remove any em dash "---" to avoid sounding generic/AI.</p>
                 </div>
               </div>
               
               <button
                 onClick={() => setShow21DayModal(false)}
                 className="w-full mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
               >
                 Close
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Guide Modal */}
       <AnimatePresence>
         {showGuideModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowGuideModal(false)}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar"
             >
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-bold text-zinc-200 flex items-center gap-2">
                   <HelpCircle className="w-6 h-6 text-green-400" />
                   Copy Prompt Tool - Complete Guide
                 </h3>
                 <button
                   onClick={() => setShowGuideModal(false)}
                   className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-6 text-sm text-zinc-300">
                 {/* Overview */}
                 <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                   <h4 className="font-bold text-green-400 mb-2">📋 What This Tool Does</h4>
                   <p>This tool helps you generate professional LinkedIn messages using AI. Paste a conversation, configure your settings, and get AI-generated responses that match your personality and goals.</p>
                 </div>

                 {/* Quick Start */}
                 <div>
                   <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                     <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                     Quick Start (3 Steps)
                   </h4>
                   <div className="space-y-2 pl-8 border-l-2 border-blue-500/30">
                     <p><strong className="text-blue-400">Step 1:</strong> Click "Prompt Variables" button → Set your name, personality, and what you offer</p>
                     <p><strong className="text-blue-400">Step 2:</strong> Paste a LinkedIn conversation in the text area</p>
                     <p><strong className="text-blue-400">Step 3:</strong> Click "Copy Framework Prompt" → Paste into ChatGPT/Gemini</p>
                   </div>
                 </div>

                 {/* Prompt Templates */}
                 <div>
                   <h4 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                     <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                     Prompt Templates Explained
                   </h4>
                   <div className="space-y-3 pl-8 border-l-2 border-purple-500/30">
                     <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                       <p className="font-bold text-purple-300 mb-1">🎯 Main Template</p>
                       <p className="text-xs text-zinc-400 mb-2">Full-featured analysis with 4 response options</p>
                       <p className="text-xs"><strong>Use when:</strong> You need comprehensive analysis and multiple response choices</p>
                       <p className="text-xs"><strong>Works with modes:</strong> Reply, Follow-up, Close (see below)</p>
                     </div>
                     <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                       <p className="font-bold text-purple-300 mb-1">📝 Lengthy Template</p>
                       <p className="text-xs text-zinc-400 mb-2">Detailed, personalized responses</p>
                       <p className="text-xs"><strong>Use when:</strong> You want ONE highly personalized response that references their company specifically</p>
                     </div>
                     <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                       <p className="font-bold text-purple-300 mb-1">⚡ Ultra-Short Template</p>
                       <p className="text-xs text-zinc-400 mb-2">Quick, concise 2-3 sentence messages</p>
                       <p className="text-xs"><strong>Use when:</strong> You need a brief message that still shows you researched their company</p>
                       <p className="text-xs"><strong>Tip:</strong> Add their Website/LinkedIn in Prompt Variables for better results</p>
                     </div>
                     <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                       <p className="font-bold text-purple-300 mb-1">🔄 Follow-up-Specific Template</p>
                       <p className="text-xs text-zinc-400 mb-2">Non-pushy follow-up messages</p>
                       <p className="text-xs"><strong>Use when:</strong> Someone hasn't responded and you need to follow up gracefully</p>
                       <p className="text-xs"><strong>Bonus:</strong> AI tells you if you should mark them "Not Interested"</p>
                     </div>
                   </div>
                 </div>

                 {/* Modes */}
                 <div>
                   <h4 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
                     <span className="bg-yellow-500/20 text-yellow-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                     Reply / Follow-up / Close Modes
                   </h4>
                   <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                     <p className="text-xs text-yellow-300">⚠️ <strong>Important:</strong> These modes ONLY work with the "Main Template"</p>
                   </div>
                   <div className="space-y-2 pl-8 border-l-2 border-yellow-500/30">
                     <div>
                       <p className="font-bold text-yellow-300">💬 Reply Mode</p>
                       <p className="text-xs text-zinc-400">Use when: They just responded to you</p>
                       <p className="text-xs text-zinc-400">AI will: Generate responses to continue the conversation naturally</p>
                     </div>
                     <div>
                       <p className="font-bold text-yellow-300">🔔 Follow-up Mode</p>
                       <p className="text-xs text-zinc-400">Use when: They haven't responded in a while</p>
                       <p className="text-xs text-zinc-400">AI will: Create non-pushy follow-up + advise if you should mark "Not Interested"</p>
                     </div>
                     <div>
                       <p className="font-bold text-yellow-300">👋 Close Mode</p>
                       <p className="text-xs text-zinc-400">Use when: It's been too long, time to close gracefully</p>
                       <p className="text-xs text-zinc-400">AI will: Generate closing message that leaves door open for future</p>
                     </div>
                   </div>
                 </div>

                 {/* Prompt Variables */}
                 <div>
                   <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                     <span className="bg-cyan-500/20 text-cyan-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                     Prompt Variables (Click the button to edit)
                   </h4>
                   <div className="space-y-2 pl-8 border-l-2 border-cyan-500/30">
                     <div>
                       <p className="font-bold text-cyan-300">👤 Sender Name</p>
                       <p className="text-xs text-zinc-400">Who is sending the message (e.g., "Kathlynn Mae", "Lorelie")</p>
                     </div>
                     <div>
                       <p className="font-bold text-cyan-300">🎭 Personality Tone</p>
                       <p className="text-xs text-zinc-400">How you communicate (e.g., "Polite, professional, empathetic")</p>
                     </div>
                     <div>
                       <p className="font-bold text-cyan-300">🎯 ICP (Ideal Customer Profile)</p>
                       <p className="text-xs text-zinc-400">Who you're targeting (e.g., "HVAC operations leaders")</p>
                     </div>
                     <div>
                       <p className="font-bold text-cyan-300">💎 UVP (Unique Value Proposition)</p>
                       <p className="text-xs text-zinc-400">What value you provide (e.g., "Reduced scheduling delays by 30%")</p>
                     </div>
                   </div>
                 </div>

                 {/* 21-Day Sequence */}
                 <div>
                   <h4 className="font-bold text-pink-400 mb-3 flex items-center gap-2">
                     <span className="bg-pink-500/20 text-pink-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span>
                     21-Day Sequence Reference
                   </h4>
                   <div className="space-y-2 pl-8 border-l-2 border-pink-500/30">
                     <p className="text-xs text-zinc-400">A proven outreach sequence for LinkedIn. Click the "21-Day Sequence" button to see the full templates.</p>
                     <div className="text-xs space-y-1">
                       <p><strong className="text-pink-300">Day 1:</strong> Connection request (no pitch)</p>
                       <p><strong className="text-pink-300">Day 3:</strong> Ask about their challenges</p>
                       <p><strong className="text-pink-300">Day 5:</strong> Offer free value (infographic)</p>
                       <p><strong className="text-pink-300">Day 7:</strong> Meeting ask (if interested)</p>
                     </div>
                   </div>
                 </div>

                 {/* Example Workflow */}
                 <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4">
                   <h4 className="font-bold text-green-400 mb-3">✅ Example Workflow</h4>
                   <div className="space-y-2 text-xs">
                     <p><strong>Scenario:</strong> Prospect hasn't responded in 5 days</p>
                     <ol className="list-decimal list-inside space-y-1 text-zinc-400 ml-2">
                       <li>Click "Prompt Variables" → Verify your info is correct</li>
                       <li>Select "Main" template</li>
                       <li>Select "Follow-up" mode</li>
                       <li>Add last conversation date in Prompt Variables</li>
                       <li>Paste the conversation history</li>
                       <li>Click "Copy Framework Prompt"</li>
                       <li>Paste into ChatGPT → Get non-pushy follow-up message</li>
                     </ol>
                   </div>
                 </div>

                 {/* Tips */}
                 <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                   <h4 className="font-bold text-blue-400 mb-2">💡 Pro Tips</h4>
                   <ul className="text-xs space-y-1 text-zinc-400 list-disc list-inside">
                     <li>Always double-check the AI's response before sending</li>
                     <li>Remove any em-dashes (---) from AI responses - they sound generic</li>
                     <li>Verify the prospect still works at the mentioned company</li>
                     <li>Use "Ultra-Short" for quick first messages</li>
                     <li>Use "Main + Follow-up" when they go silent</li>
                     <li>Use "Main + Close" after 3+ weeks of no response</li>
                   </ul>
                 </div>
               </div>
               
               <button
                 onClick={() => setShowGuideModal(false)}
                 className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
               >
                 Got it! Let's start
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </motion.div>  );
};
