import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Copy, Check, Wand2, Users, User, Trash2, Bell, Ban, Search, Calendar, Settings, X, BookOpen, HelpCircle, Edit3, Link as LinkIcon, Send, Loader2, AlertTriangle, Archive, FileText, Download } from 'lucide-react';
import { supabase } from '../supabase';

const STORAGE_KEY_INPUT = 'linkedin_strategist_input';
const STORAGE_KEY_STATUSES = 'linkedin_strategist_statuses';
const STORAGE_KEY_DELETED = 'linkedin_strategist_deleted';
const STORAGE_KEY_PROSPECTS = 'linkedin_strategist_prospects';
const STORAGE_KEY_AI_MESSAGES = 'linkedin_strategist_ai_messages';
const STORAGE_KEY_ARCHIVED_CONVS = 'linkedin_strategist_archived_convs';

interface Prospect {
  id: string;
  name: string;
  addedAt: string; // ISO date string (YYYY-MM-DD)
  link?: string; // Optional LinkedIn URL
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ArchivedConversation {
  id: string;
  title: string;
  date: string;
  content: string;
  sizeMB: number;
}

export const DocxPromptReader: React.FC = () => {
  const [inputMessage, setInputMessage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_INPUT) || '';
  });
  const [copied, setCopied] = useState(false);
  const [namesCopied, setNamesCopied] = useState(false);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'Reply' | 'Follow-up' | 'Close' | 'Not-Interested'>('Reply');
  const [promptTemplate, setPromptTemplate] = useState<'Main' | 'Lengthy' | 'Ultra-Short' | 'Follow-up-Specific' | 'Close'>('Main');
  const [notInterestedType, setNotInterestedType] = useState<'no-engagement' | 'with-conversation'>('no-engagement');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'none' | 'follow-up' | 'not-interested'>('none');
  
  // Modal states
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [show21DayModal, setShow21DayModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  
  // Edit name state
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingLink, setEditingLink] = useState('');

  // AI response states
  const [aiMessages, setAiMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AI_MESSAGES);
    return saved ? JSON.parse(saved) : [];
  });
  const [archivedConvs, setArchivedConvs] = useState<ArchivedConversation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ARCHIVED_CONVS);
    return saved ? JSON.parse(saved) : [];
  });
  const [followUpInput, setFollowUpInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResponseCopied, setAiResponseCopied] = useState(false);
  
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
  const [apiToken, setApiToken] = useState(() => 
    localStorage.getItem('custom_api_token') || 
    localStorage.getItem('custom_github_token') || 
    import.meta.env.VITE_AZURE_AI_TOKEN || 
    import.meta.env.VITE_GITHUB_TOKEN || 
    ''
  );
  const [tokenInput, setTokenInput] = useState('');
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [lastConversationDate, setLastConversationDate] = useState('');

  // Calculate conversation size in MB
  const conversationSizeMB = useMemo(() => {
    const totalChars = aiMessages.reduce((acc, msg) => acc + msg.content.length, 0);
    // Rough estimate: 1 char = 1 byte, so size in MB is chars / (1024 * 1024)
    return totalChars / (1024 * 1024);
  }, [aiMessages]);
  const [prospectWebsite, setProspectWebsite] = useState('');
  const [prospectLinkedIn, setProspectLinkedIn] = useState('');
  const [pastedLinks, setPastedLinks] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('linkedin_pasted_links');
    return saved ? JSON.parse(saved) : {};
  });
  
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
        return parsed
          .map((item: any) => {
            const today = new Date().toISOString().split('T')[0];
            if (typeof item === 'string') {
              return {
                id: Math.random().toString(36).substring(2, 9),
                name: item,
                addedAt: today,
                link: ''
              };
            }
            return {
              ...item,
              id: item.id || Math.random().toString(36).substring(2, 9),
              addedAt: item.addedAt || today,
              link: item.link || ''
            };
          })
          // Filter out invalid names (too short, less than 3 characters)
          .filter((item: Prospect) => item.name && item.name.trim().length >= 3);
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AI_MESSAGES, JSON.stringify(aiMessages));
  }, [aiMessages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ARCHIVED_CONVS, JSON.stringify(archivedConvs));
  }, [archivedConvs]);

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
    localStorage.setItem('custom_api_token', apiToken);
  }, [apiToken]);

  useEffect(() => {
    localStorage.setItem('linkedin_uvp', uvp);
  }, [uvp]);

  useEffect(() => {
    localStorage.setItem('linkedin_pasted_links', JSON.stringify(pastedLinks));
  }, [pastedLinks]);

  // Extract and accumulate prospects from inputMessage
  useEffect(() => {
    if (!inputMessage.trim()) return;
    
    const lines = inputMessage.split('\n');
    const newProspectsData = new Map<string, { name: string; link: string }>();
    let headerNameFound = false;
    let prospectNameFromGreeting = ''; 
    let currentFoundLink = '';

    // First, find any LinkedIn URL in the entire input
    const urlMatch = inputMessage.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/);
    if (urlMatch) {
      currentFoundLink = urlMatch[0];
    }
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let name = '';
      
      // Pattern 0: Header Full Name (Often the very first line of a pasted profile or conversation)
      // This should be the FIRST pattern we check and prioritize
      // Updated to support special characters (accented letters like José, Jesús, etc.)
      if (!headerNameFound && index < 5 && /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ]+(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ.,]+){1,5}$/.test(trimmed)) {
        // For very first line (index 0), check if next line has LinkedIn context
        if (index === 0) {
          const nextLine = lines[index + 1]?.trim() || '';
          const hasLinkedInContext = nextLine.includes('connection') ||
            nextLine.includes('degree') ||
            nextLine.includes('owner') ||
            nextLine.includes('sent the following');
          
          if (hasLinkedInContext) {
            name = trimmed;
            headerNameFound = true;
          }
        }
        // For lines 1-5, check surrounding context
        else if (index < 5) {
          const nextLine = lines[index + 1]?.trim() || '';
          const prevLine = lines[index - 1]?.trim() || '';
          const isHeader =
            nextLine.includes('connection') ||
            nextLine.includes('degree') ||
            nextLine.includes('owner') ||
            nextLine.includes('manager') ||
            nextLine.includes('Chief') ||
            nextLine.includes('sent the following') ||
            prevLine.includes('Oct') ||
            prevLine.includes('Nov') ||
            prevLine.includes('Feb') ||
            prevLine.includes('202');
            
          if (isHeader) {
            name = trimmed;
            headerNameFound = true;
          }
        }
      }

      // Pattern 0b: If we found a greeting with a name, store it as fallback
      // This helps when the header name extraction fails
      // Updated to capture full name including initials, suffixes, and special characters
      // Exclude names ending with comma (like "José De Jesús,")
      if (!prospectNameFromGreeting) {
        const greetingMatch = trimmed.match(/^(?:Hi|Hello|Hey|Greetings|Dear)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ]*(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ.]*)*)/i);
        if (greetingMatch) {
          const extractedName = greetingMatch[1].trim();
          // Remove trailing comma and anything after it
          const cleanedName = extractedName.replace(/,.*$/, '').trim();
          if (cleanedName.length > 0) {
            prospectNameFromGreeting = cleanedName;
          }
        }
      }

      // Pattern 1: Name • 1st/2nd/3rd (Strictly short lines only)
      if (!name && trimmed.length < 50) {
        const dotMatch = trimmed.match(/^([^•\n]+)\s*•/);
        if (dotMatch) {
          name = dotMatch[1].trim();
        }
        // Pattern 2: Common name prefix or just capitalized words (Strictly short lines)
        // Updated to support special characters
        // EXCLUSION: Names in parentheses like (Jose) - these are nicknames/alternate names
        else if (!trimmed.startsWith('(') && !trimmed.endsWith(')') && !/^\([^)]+\)$/.test(trimmed) && /^(?:(?:Ms\.|Mr\.|Sir|Ma'am)\s+)?[A-ZÀ-ÿ][A-Za-zÀ-ÿ]+(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ.,]+){1,5}$/.test(trimmed)) {
          // EXCLUSION: Greetings that start with Hi, Hello, Hey, Dear, Greetings
          const startsWithGreeting = /^(Hi|Hello|Hey|Dear|Greetings)\s+/i.test(trimmed);
          
          // EXCLUSION: If it looks like a job title or common non-name phrases
          const jobKeywords = ['Executive', 'Manager', 'Owner', 'Founder', 'Director', 'President', 'VP', 'Lead', 'Chief', 'Specialist', 'Partner', 'Principal', 'Homepage', 'Website', 'Company', 'Business'];
          const isJobTitle = jobKeywords.some(word => trimmed.includes(word));
          
          if (!startsWithGreeting && !isJobTitle) {
            name = trimmed;
          }
        }
      }

      // Pattern 3: Greetings (Hi Chris, Hello Chris John Smith, etc.) - Can be on any line length
      // Updated to capture full name after greeting, not just first name
      // More relaxed to capture names with initials, suffixes, multiple words, and special characters
      // Exclude names ending with comma (like "José De Jesús,")
      if (!name) {
        const greetingMatch = trimmed.match(/^(?:Hi|Hello|Hey|Greetings|Dear)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ]*(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ.]*)*)/i);
        if (greetingMatch) {
          const extractedName = greetingMatch[1].trim();
          // Remove trailing comma and anything after it
          const cleanedName = extractedName.replace(/,.*$/, '').trim();
          if (cleanedName.length > 0) {
            name = cleanedName;
          }
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
          .replace(/https?:\/\/\S+/g, '') // Remove URLs
          .replace(/\d+(?:st|nd|rd|th)\s+degree\s+connection/gi, '')
          .replace(/·\s*\d+(?:st|nd|rd|th)/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Minimum length check - names should be at least 3 characters
        // This prevents capturing "Jos" or "I" as names
        if (name.length < 3) {
          name = '';
        }

        const lower = name.toLowerCase();
        // Exclude Lorelie Juntilla and common UI text
        if (name && !lower.includes('lorelie') &&
            !lower.includes('juntilla') &&
            !lower.includes('message') &&
            !lower.includes('profile')) {
          // Check if it's already in storedProspects - but only block if it's the EXACT same name
          const alreadyExistsExactly = storedProspects.some(p => p.name === name);
          
          if (!alreadyExistsExactly) {
            // Check if we have a link for this name from the paste handler
             let linkToUse = currentFoundLink;
             if (pastedLinks[name]) {
               linkToUse = pastedLinks[name];
             } else {
               // Try to find a partial match
               const linkKey = Object.keys(pastedLinks).find(key => {
                 const keyLower = key.toLowerCase();
                 const nameLower = name.toLowerCase();
                 return keyLower.includes(nameLower) || nameLower.includes(keyLower);
               });
               if (linkKey) {
                 linkToUse = pastedLinks[linkKey];
               }
             }
             
             // One last fallback: If we still don't have a link, but there's EXACTLY one LinkedIn URL in the entire HTML paste,
             // and this is the first prospect found, assume it's for them.
             if (!linkToUse && Object.keys(pastedLinks).length === 1 && !headerNameFound) {
               linkToUse = Object.values(pastedLinks)[0];
             }
             
             newProspectsData.set(name, { name, link: linkToUse });
           }
         }
       }
     });

     // Fallback: If no header name was found but greeting extraction found a name, use that
     if (newProspectsData.size === 0) {
       const fullMessage = inputMessage;
       const hiNameMatch = fullMessage.match(/(?:^|\n)\s*(?:Hi|Hello|Hey)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ]*(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ.]+)+)/i);
       if (hiNameMatch) {
         let prospectName = hiNameMatch[1].trim();
         prospectName = prospectName.replace(/,.*$/, '').trim();
         const lower = prospectName.toLowerCase();
         if (prospectName.length >= 3 &&
             !lower.includes('lorelie') &&
             !lower.includes('juntilla') &&
             !lower.includes(sender.toLowerCase()) &&
             prospectName.split(/\s+/).length >= 2) { 
           
           let linkToUse = currentFoundLink;
           if (pastedLinks[prospectName]) {
             linkToUse = pastedLinks[prospectName];
           } else {
             const linkKey = Object.keys(pastedLinks).find(key => {
               const keyLower = key.toLowerCase();
               const nameLower = prospectName.toLowerCase();
               return keyLower.includes(nameLower) || nameLower.includes(keyLower);
             });
             if (linkKey) {
               linkToUse = pastedLinks[linkKey];
             }
           }

           // One last fallback for single link in paste
           if (!linkToUse && Object.keys(pastedLinks).length === 1) {
             linkToUse = Object.values(pastedLinks)[0];
           }
           
           newProspectsData.set(prospectName, { name: prospectName, link: linkToUse });
         }
       }
     }

    if (newProspectsData.size > 0) {
      const prospectsArray = Array.from(newProspectsData.values());
      const today = new Date().toISOString().split('T')[0];

      // Filter out names if a longer version of the same name is present
      const filteredProspectsArray = prospectsArray.filter(p => {
        const nameLower = p.name.toLowerCase();
        const nameNormalized = nameLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nameClean = nameNormalized.replace(/\./g, '');
        
        return !prospectsArray.some(other => {
          if (other.name === p.name) return false;
          const otherLower = other.name.toLowerCase();
          const otherNormalized = otherLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const otherClean = otherNormalized.replace(/\./g, '');
          if (otherClean.startsWith(nameClean + ' ') || otherClean.startsWith(nameClean + '.')) return true;
          if (otherClean.startsWith(nameClean) && otherClean.length > nameClean.length + 2) return true;
          return false;
        });
      });

      setStoredProspects(prev => {
        let next = [...prev];
        let nextStatuses = { ...prospectStatuses };
        let changed = false;

        filteredProspectsArray.forEach(p => {
          const name = p.name;
          const lowerName = name.toLowerCase();
          const existingIdx = next.findIndex(ep => {
            const pLower = ep.name.toLowerCase();
            return pLower === lowerName || pLower.startsWith(lowerName + ' ') || lowerName.startsWith(pLower + ' ');
          });

          if (existingIdx === -1) {
            next.push({ 
              id: Math.random().toString(36).substring(2, 9),
              name, 
              addedAt: today,
              link: p.link
            });
            nextStatuses[name] = 1; 
            changed = true;
          } else {
            const existingName = next[existingIdx].name;
            let updated = false;
            
            // Name upgrade
            if (name.length > existingName.length) {
              next[existingIdx] = { ...next[existingIdx], name };
              if (nextStatuses[existingName] !== undefined) {
                nextStatuses[name] = nextStatuses[existingName];
                delete nextStatuses[existingName];
              } else {
                nextStatuses[name] = 1;
              }
              updated = true;
            }
            
            // Link update (if not present)
            if (p.link && !next[existingIdx].link) {
              next[existingIdx] = { ...next[existingIdx], link: p.link };
              updated = true;
            }

            if (updated) changed = true;
            
            if (nextStatuses[next[existingIdx].name] === undefined || nextStatuses[next[existingIdx].name] === 'none') {
              nextStatuses[next[existingIdx].name] = 1;
              changed = true;
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
  }, [inputMessage, deletedProspects, storedProspects, pastedLinks]);

  const handlePaste = (e: React.ClipboardEvent) => {
     const html = e.clipboardData.getData('text/html');
     if (html) {
       const parser = new DOMParser();
       const doc = parser.parseFromString(html, 'text/html');
       const links = doc.querySelectorAll('a');
       const newPastedLinks: Record<string, string> = {};
       
       links.forEach(link => {
         let href = link.getAttribute('href') || '';
         const text = link.textContent?.trim();
         
         // Clean the URL - remove tracking parameters and fix common LinkedIn patterns
         if (href) {
           // Pattern 1: Standard profile URL
           // e.g. https://www.linkedin.com/in/afzal-mohammad-12345/
           const profileMatch = href.match(/(https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+)/);
           if (profileMatch) {
             href = profileMatch[1] + '/';
           }
           
           // Pattern 2: Profile view with ID
           // e.g. https://www.linkedin.com/profile/view?id=ACoAAB...
           else if (href.includes('linkedin.com/profile/view')) {
             // Try to keep it as is, but clean if it has too much junk
             href = href.split('&')[0]; // Just keep the first part (usually the ID)
           }
         }

         if (href && (href.includes('linkedin.com/in/') || href.includes('linkedin.com/profile/view'))) {
           // Store by the visible link text
           if (text && text.length > 2) {
             newPastedLinks[text] = href;
           }
           
           // Also try to extract a name from the URL itself as a fallback
           // e.g. from /in/afzal-mohammad-123/ we can extract "Afzal Mohammad"
           const urlNameMatch = href.match(/\/in\/([a-zA-Z0-9-]+)/);
           if (urlNameMatch) {
             const urlName = urlNameMatch[1]
               .split('-')
               .filter(s => isNaN(Number(s))) // Remove the numeric ID part at the end
               .map(s => s.charAt(0).toUpperCase() + s.slice(1))
               .join(' ');
             if (urlName && urlName.length > 2) {
               newPastedLinks[urlName] = href;
             }
           }
         }
       });
       
       if (Object.keys(newPastedLinks).length > 0) {
         setPastedLinks(prev => ({ ...prev, ...newPastedLinks }));
       }
     }
   };

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

  const handleDeleteProspect = (prospectId: string, name: string) => {
    // Confirm deletion
    if (!confirm(`Delete "${name}" from prospects?`)) {
      return;
    }
    
    setDeletedProspects(prev => [...prev, name]);
    setStoredProspects(prev => prev.filter(p => p.id !== prospectId));
    // Also remove the status for this name
    setProspectStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[name];
      return newStatuses;
    });
  };

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspectId(prospect.id);
    setEditingName(prospect.name);
    setEditingLink(prospect.link || '');
  };

  const handleSaveEdit = (prospectId: string, oldName: string) => {
    if (!editingName.trim()) {
      handleCancelEdit();
      return;
    }

    // Update the prospect name and link
    setStoredProspects(prev => 
      prev.map(p => p.id === prospectId ? { ...p, name: editingName.trim(), link: editingLink.trim() } : p)
    );

    // Migrate the status from old name to new name if name changed
    if (editingName.trim() !== oldName) {
      setProspectStatuses(prev => {
        const newStatuses = { ...prev };
        if (newStatuses[oldName] !== undefined) {
          newStatuses[editingName.trim()] = newStatuses[oldName];
          delete newStatuses[oldName];
        }
        return newStatuses;
      });
    }

    setEditingProspectId(null);
    setEditingName('');
    setEditingLink('');
  };

  const handleCancelEdit = () => {
    setEditingProspectId(null);
    setEditingName('');
    setEditingLink('');
  };

  const handleCopyLink = async (prospectId: string, link: string) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopiedId(prospectId);
      setTimeout(() => setLinkCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
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
    const totalProspects = storedProspects.length;
    const confirmMessage = totalProspects > 0 
      ? `⚠️ WARNING: This will permanently delete ${totalProspects} prospect${totalProspects > 1 ? 's' : ''} and all conversation data!\n\nType "CLEAR" to confirm deletion:`
      : 'Clear conversation?';
    
    if (totalProspects > 0) {
      const userInput = prompt(confirmMessage);
      if (userInput !== 'CLEAR') {
        alert('Clear operation cancelled. Your data is safe.');
        return;
      }
    } else {
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    
    setInputMessage('');
    setProspectStatuses({});
    setDeletedProspects([]);
    setStoredProspects([]);
    setPastedLinks({});
    localStorage.removeItem(STORAGE_KEY_INPUT);
    localStorage.removeItem(STORAGE_KEY_STATUSES);
    localStorage.removeItem(STORAGE_KEY_DELETED);
    localStorage.removeItem(STORAGE_KEY_PROSPECTS);
  };

  const filteredProspects = React.useMemo(() => {
    return storedProspects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Show ALL if 'all' is selected, otherwise match date
      const matchesDate = selectedDate === 'all' || p.addedAt === selectedDate;

      let matchesStatus = true;
      if (statusFilter === 'follow-up') {
        matchesStatus = typeof prospectStatuses[p.name] === 'number';
      } else if (statusFilter === 'not-interested') {
        matchesStatus = prospectStatuses[p.name] === 'not-interested';
      }

      return matchesSearch && matchesDate && matchesStatus;
    }).reverse(); // Newest prospects at the top
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
    // IMPORTANT LINK REFERENCES - Add to all templates
    const linkReferences = `
IMPORTANT LINK REFERENCES (Only use when user explicitly requests these):
- When user mentions "avidus", "avidus link", or asks you to "send avidus" → Use: https://avidus.tech/
- When user mentions "bottleneck", "bottleneck link", "diagnostic link", or asks to "send bottleneck" → Use: https://bottleneckdiagnostic.scoreapp.com/

NOTE: Only include these links when the user specifically asks for them in their follow-up request. Do not add them unsolicited.
`;

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
- MUST NOT: Pitch services or ask for a meeting.`,
        'Not-Interested': notInterestedType === 'no-engagement' 
          ? `GOAL: Document why this prospect is marked as "Not Interested" - No Engagement.
- DEFAULT NOTE: The prospect hasn't engaged at all despite multiple attempts. Current message already provided an opt-out + resource link → leave the door open for future interaction.
- OUTPUT: Copy this default note as-is for documentation purposes.`
          : `GOAL: Analyze the conversation and create a detailed note explaining WHY the prospect is not interested.
- TASK: Based on the conversation provided, identify specific signals, objections, or statements that indicate lack of interest.
- OUTPUT: A clear, concise note (2-4 sentences) documenting the reason for marking as "Not Interested".
- FOCUS: Be specific - reference actual conversation points, not generic assumptions.
- NOTE: This is NOT a message to send to the prospect - it's an internal note for documentation.`
      };

      // Special handling for Not-Interested mode
      if (mode === 'Not-Interested') {
        if (notInterestedType === 'no-engagement') {
          return `The prospect hasn't engaged at all despite multiple attempts. Current message already provided an opt-out + resource link → leave the door open for future interaction.`;
        } else {
          return `You are analyzing a LinkedIn conversation to document why a prospect should be marked as "Not Interested".

IMPORTANT: This is NOT a message to send to the prospect. This is an internal note for documentation purposes.

Conversation:
"""
${inputMessage}
"""

TASK:
Analyze the conversation above and create a clear, concise note (2-4 sentences) explaining WHY this prospect is not interested.

Focus on:
- Specific signals, objections, or statements from the prospect
- Explicit or implicit indicators of disinterest
- Any reasons they gave for not proceeding
- Timing or priority issues they mentioned

OUTPUT FORMAT:
Provide a direct, factual note that references actual conversation points. Be specific and avoid generic assumptions.

Example format:
"Prospect indicated [specific reason]. They mentioned [specific detail from conversation]. [Any additional context that shows lack of interest]."`;
        }
      }

      return `You are a LinkedIn conversation strategist assisting with outbound networking, relationship building, and business development responding as ${sender}.
Your role is to analyze conversations, understand dynamics, and craft the most appropriate next message while adapting to the specified personality tone and ICP.

When appropriate, subtly match the prospect's tone and communication style.
If the prospect's tone appears aggressive, dismissive, or negative, do not mirror it. Instead, respond in a calm, respectful, and professional manner.

INPUT VARIABLES
Personality Tone: ${personalityTone}
ICP (Ideal Customer Profile): ${icp ? icp : 'If no ICP is provided, analyze the conversation without assuming a specific target audience.'}
${uvp ? `UVP: ${uvp}` : ''}

${linkReferences}

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

${linkReferences}

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

${linkReferences}

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

${linkReferences}

Conversation:
"""
${inputMessage}
"""`;
    }

    // Close Prompt Template - Generates a polite closing message
    if (promptTemplate === 'Close') {
      return `You are ${sender}. Based on the conversation history provided, create a polite and professional closing message for LinkedIn.

The message should:
- Acknowledge that you're leaving things here for now
- Express openness to future connection if timing is right
- Include a resource link where they can learn more: https://avidus.tech/
- Include contact information: +1 646-905-0884
- Be warm, professional, and leave the door open
- Be 3-4 sentences maximum
- Use the prospect's first name from the conversation

Tone: ${personalityTone}

${linkReferences}

Conversation:
"""
${inputMessage}
"""

OUTPUT FORMAT:
Provide ONLY the closing message text, ready to copy and paste into LinkedIn. Do not include any analysis or explanation.

Example structure (adapt to the conversation):
Hi [FirstName],

I'll leave things here for now. If the timing's right in the future, I'd be happy to connect. Until then, you're always welcome to explore how Avidus supports businesses like yours here: https://avidus.tech/

And if you'd like to reach out directly, you can contact us at +1 646-905-0884.

Best,
${sender}`;
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

  const handleSendToAI = async () => {
    if (!inputMessage.trim()) return;
    const promptText = buildPromptText();
    
    setAiLoading(true);
    setAiError('');
    setAiMessages([]);
    setAiResponseCopied(false);

    const activeToken = apiToken;
    if (!activeToken) {
      setAiError('Missing AI API Token. Please add it in the "Prompt Variables" settings (Gear icon).');
      setAiLoading(false);
      return;
    }

    const messagesToSend: Message[] = [
      { role: 'system', content: 'You are a helpful LinkedIn conversation strategist assistant. Provide clear, direct, and actionable advice.' },
      { role: 'user', content: promptText }
    ];

    try {
      const { data, error } = await supabase.functions.invoke('call-ai', {
        body: {
          model: 'gpt-4o',
          messages: messagesToSend,
          temperature: 0.7,
          max_tokens: 2048,
        }
      });

      if (error) {
        throw new Error(error.message || 'Function invocation failed');
      }

      const content = data.choices?.[0]?.message?.content || 'No response generated.';
      
      setAiMessages([
        ...messagesToSend,
        { role: 'assistant', content }
      ]);
    } catch (err: any) {
      console.error('AI request failed:', err);
      setAiError(err.message || 'Failed to get AI response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!followUpInput.trim() || aiLoading) return;
    
    const userMessage = followUpInput.trim();
    setFollowUpInput(''); // Clear input immediately
    setAiLoading(true);
    setAiError('');
    setAiResponseCopied(false);

    const activeToken = apiToken;
    if (!activeToken) {
      setAiError('Missing Azure AI API Key. Please set it in the "Prompt Variables" settings (Gear icon).');
      setAiLoading(false);
      return;
    }

    const updatedMessages: Message[] = [
      ...aiMessages,
      { role: 'user', content: userMessage }
    ];
    setAiMessages(updatedMessages);

    try {
      const { data, error } = await supabase.functions.invoke('call-ai', {
        body: {
          model: 'gpt-4o',
          messages: updatedMessages,
          temperature: 0.7,
          max_tokens: 2048,
        }
      });

      if (error) {
        throw new Error(error.message || 'Function invocation failed');
      }

      const content = data.choices?.[0]?.message?.content || 'No response generated.';
      
      setAiMessages([
        ...updatedMessages,
        { role: 'assistant', content }
      ]);
    } catch (err: any) {
      console.error('AI follow-up request failed:', err);
      setAiError(err.message || 'Failed to send follow-up. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAiResponse = async () => {
    // Find the last assistant message
    const lastAssistantMessage = [...aiMessages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMessage) return;
    
    try {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setAiResponseCopied(true);
      setTimeout(() => setAiResponseCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy AI response:', err);
    }
  };

  const archiveConversation = () => {
    if (aiMessages.length === 0) return;

    const content = aiMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n' + '='.repeat(30) + '\n\n');
    
    const newArchive: ArchivedConversation = {
      id: Math.random().toString(36).substring(2, 9),
      title: aiMessages.find(m => m.role === 'user')?.content.substring(0, 30) + '...',
      date: new Date().toLocaleString(),
      content,
      sizeMB: conversationSizeMB
    };

    setArchivedConvs([newArchive, ...archivedConvs]);
    setAiMessages([]); // Clear current
    
    // Create download link
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-archive-${newArchive.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteArchive = (id: string) => {
    setArchivedConvs(archivedConvs.filter(c => c.id !== id));
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
            <button
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-200 transition-colors relative"
            >
              <Archive className="w-4 h-4" />
              Archives
              {archivedConvs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-zinc-900">
                  {archivedConvs.length}
                </span>
              )}
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
            <div className="grid grid-cols-3 gap-1 bg-zinc-950/50 border border-zinc-800 rounded-xl p-1">
              {(['Main', 'Lengthy', 'Ultra-Short', 'Follow-up-Specific', 'Close'] as const).map((t) => (
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
          <div className="grid grid-cols-4 gap-1 bg-zinc-950/50 border border-zinc-800 rounded-xl p-1 mb-4 shrink-0">
            {(['Reply', 'Follow-up', 'Close', 'Not-Interested'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`
                  py-2 text-xs font-medium rounded-lg transition-all
                  ${mode === m 
                    ? 'bg-zinc-800 text-blue-400 shadow-sm ring-1 ring-zinc-700' 
                    : 'text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Not-Interested Type Selector - Only show when Not-Interested mode is selected */}
          {mode === 'Not-Interested' && (
            <div className="mb-4 shrink-0">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Not Interested Type</label>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950/50 border border-zinc-800 rounded-xl p-1">
                <button
                  onClick={() => setNotInterestedType('no-engagement')}
                  className={`
                    py-2 text-[10px] font-medium rounded-lg transition-all
                    ${notInterestedType === 'no-engagement'
                      ? 'bg-zinc-800 text-red-400 shadow-sm ring-1 ring-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  No Engagement
                </button>
                <button
                  onClick={() => setNotInterestedType('with-conversation')}
                  className={`
                    py-2 text-[10px] font-medium rounded-lg transition-all
                    ${notInterestedType === 'with-conversation'
                      ? 'bg-zinc-800 text-red-400 shadow-sm ring-1 ring-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  With Conversation
                </button>
              </div>
            </div>
          )}

          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste LinkedIn messages or conversation history..."
            className="flex-1 min-h-0 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none mb-6 custom-scrollbar"
          />

          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopyPrompt}
              disabled={!inputMessage.trim()}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border shadow-lg
                ${!inputMessage.trim()
                  ? 'bg-zinc-800 border-transparent text-zinc-600 cursor-not-allowed' 
                  : copied 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-green-900/10' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/50 shadow-blue-900/20'}
              `}
            >
              {copied ? <Check className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
            <button
              onClick={handleSendToAI}
              disabled={!inputMessage.trim() || aiLoading}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border shadow-lg
                ${!inputMessage.trim() || aiLoading
                  ? 'bg-zinc-800 border-transparent text-zinc-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-500/50 shadow-purple-900/20'}
              `}
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {aiLoading ? 'Sending...' : 'Send to AI'}
            </button>
          </div>
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
                <button
                  onClick={() => setSelectedDate('all')}
                  className={`
                    whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2
                    ${selectedDate === 'all' 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  All History
                  <span className={`
                    px-1.5 py-0.5 rounded-full text-[10px] 
                    ${selectedDate === 'all' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}
                  `}>
                    {storedProspects.length}
                  </span>
                </button>
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
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0
                          ${prospectStatuses[name] === 'not-interested' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : typeof prospectStatuses[name] === 'number'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'}
                        `}>
                          {name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingProspectId === p.id ? (
                            <div className="flex flex-col gap-2 w-full pr-2">
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-zinc-500" />
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  placeholder="Full Name"
                                  className="flex-1 bg-zinc-900 border border-blue-500/50 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                                <input
                                  type="text"
                                  value={editingLink}
                                  onChange={(e) => setEditingLink(e.target.value)}
                                  placeholder="LinkedIn URL (Optional)"
                                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex justify-end gap-2 mt-1">
                                <button
                                  onClick={() => handleSaveEdit(p.id, name)}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded text-[10px] font-bold uppercase transition-all"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-[10px] font-bold uppercase transition-all"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingProspectId !== p.id && (
                        <div className="flex items-center gap-1">
                          {p.link && (
                            <>
                              <button
                                onClick={() => handleCopyLink(p.id, p.link!)}
                                className={`
                                  p-1.5 rounded-md transition-all
                                  ${linkCopiedId === p.id
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10'}
                                `}
                                title="Copy LinkedIn Profile"
                              >
                                {linkCopiedId === p.id ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
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
                            onClick={() => handleEditProspect(p)}
                            className="p-1.5 text-zinc-600 hover:text-blue-400 transition-all"
                            title="Edit name"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProspect(p.id, name)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                            title="Delete prospect"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
       </div>
       </div>

       {/* AI Response Panel */}
       <AnimatePresence>
         {(aiLoading || aiMessages.length > 0 || aiError) && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 20 }}
             className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col"
           >
             <div className="flex items-center justify-between mb-4 shrink-0">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                 <h3 className="text-lg font-medium text-zinc-200">AI Collaboration</h3>
               </div>
               <div className="flex items-center gap-2">
                 {aiMessages.filter(m => m.role === 'assistant').length > 0 && (
                   <button
                     onClick={handleCopyAiResponse}
                     className={`
                       flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                       ${aiResponseCopied
                         ? 'bg-green-500/20 text-green-400 border-green-500/30'
                         : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'}
                     `}
                   >
                     {aiResponseCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                     {aiResponseCopied ? 'Copied Last!' : 'Copy Last Response'}
                   </button>
                 )}
                 <button
                   onClick={() => { setAiMessages([]); setAiError(''); }}
                   className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
             </div>

             <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[200px] max-h-[500px]">
               {/* Chat History Header */}
               <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/30 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Conversation History</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-mono ${conversationSizeMB > 0.8 ? 'text-orange-400' : 'text-zinc-500'}`}>
                        {conversationSizeMB.toFixed(3)} MB
                      </span>
                      {conversationSizeMB >= 1 && (
                        <button 
                          onClick={archiveConversation}
                          className="text-[10px] text-red-400 font-bold animate-pulse flex items-center gap-1 hover:text-red-300 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Limit Reached: Save as .txt & Clear!
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500">{aiMessages.filter(m => m.role !== 'system').length} messages</span>
               </div>
               
               {/* Chat Messages */}
               <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                 {aiMessages.filter(m => m.role !== 'system').map((msg, idx) => (
                   <div 
                     key={idx} 
                     className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                   >
                     <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 px-1">
                       {msg.role === 'user' ? 'You' : 'AI Assistant'}
                     </span>
                     <div 
                       className={`
                         text-sm whitespace-pre-wrap leading-relaxed px-4 py-3 rounded-2xl
                         ${msg.role === 'user' 
                           ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-sm' 
                           : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm'}
                       `}
                     >
                       {/* Only truncate the very first user message which is the giant prompt */}
                       {msg.role === 'user' && idx === 0 ? (
                         <div className="space-y-2">
                           <div className="flex items-center gap-2 text-blue-300">
                             <Wand2 className="w-4 h-4" />
                             <span className="font-medium">Initial Framework Prompt Sent</span>
                           </div>
                           <p className="opacity-70 text-xs italic line-clamp-3">
                             {msg.content.substring(0, 150)}...
                           </p>
                         </div>
                       ) : (
                         msg.content
                       )}
                     </div>
                   </div>
                 ))}
                 
                 {aiLoading && (
                   <div className="mr-auto flex flex-col items-start max-w-[85%]">
                     <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 px-1">AI Assistant</span>
                     <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-4 flex items-center gap-3">
                       <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                       <span className="text-sm text-zinc-400 animate-pulse">Generating response...</span>
                     </div>
                   </div>
                 )}
                 
                 {aiError && (
                   <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 mt-4">
                     <p className="font-medium mb-1">Error</p>
                     <p className="text-red-400/80">{aiError}</p>
                   </div>
                 )}
               </div>

               {/* Interaction Footer - Chat Input */}
               <div className="p-3 bg-zinc-900/50 border-t border-zinc-800 shrink-0">
                 <div className="relative flex items-end gap-2">
                   <textarea
                     value={followUpInput}
                     onChange={(e) => setFollowUpInput(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSendFollowUp();
                       }
                     }}
                     placeholder="Type follow-up instructions to refine the AI's response (Shift+Enter for newline)..."
                     className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none min-h-[44px] max-h-[120px] custom-scrollbar"
                     rows={1}
                     disabled={aiLoading}
                   />
                   <button
                     onClick={handleSendFollowUp}
                     disabled={!followUpInput.trim() || aiLoading}
                     className={`
                       h-[44px] px-4 rounded-xl flex items-center justify-center transition-all shrink-0
                       ${!followUpInput.trim() || aiLoading
                         ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                         : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'}
                     `}
                   >
                     <Send className="w-4 h-4" />
                   </button>
                 </div>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Variables Modal */}
       <AnimatePresence>
         {showArchiveModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowArchiveModal(false)}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
             >
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Archive className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-zinc-100">Conversation Archives</h3>
                      <p className="text-xs text-zinc-500">History saved when 1MB limit was reached</p>
                    </div>
                 </div>
                 <button
                   onClick={() => setShowArchiveModal(false)}
                   className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                 {archivedConvs.length === 0 ? (
                   <div className="h-40 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl">
                     <FileText className="w-8 h-8 opacity-20 mb-2" />
                     <p className="text-sm">No archived conversations yet</p>
                   </div>
                 ) : (
                   archivedConvs.map((archive) => (
                     <div 
                       key={archive.id}
                       className="group bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl transition-all"
                     >
                       <div className="flex items-start justify-between">
                         <div className="space-y-1 flex-1">
                           <h4 className="text-sm font-medium text-zinc-200 line-clamp-1">{archive.title}</h4>
                           <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                             <span className="flex items-center gap-1">
                               <Calendar className="w-3 h-3" />
                               {archive.date}
                             </span>
                             <span className="flex items-center gap-1 font-mono">
                               {archive.sizeMB.toFixed(3)} MB
                             </span>
                           </div>
                         </div>
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={() => {
                               const blob = new Blob([archive.content], { type: 'text/plain' });
                               const url = URL.createObjectURL(blob);
                               const a = document.createElement('a');
                               a.href = url;
                               a.download = `conversation-archive-${archive.id}.txt`;
                               a.click();
                               URL.revokeObjectURL(url);
                             }}
                             className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                             title="Download .txt"
                           >
                             <Download className="w-4 h-4" />
                           </button>
                           <button
                             onClick={() => deleteArchive(archive.id)}
                             className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                             title="Delete"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
                     </div>
                   ))
                 )}
               </div>

               <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

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
                   <label className="text-xs text-zinc-400 uppercase tracking-wide mb-1 block">AI API Token (Required for AI)</label>
                   <div className="relative">
                     <input
                       type="password"
                       value={isEditingToken ? tokenInput : (apiToken ? '••••••••••••••••' : '')}
                       onChange={(e) => {
                         setIsEditingToken(true);
                         setTokenInput(e.target.value);
                       }}
                       onBlur={() => {
                         if (tokenInput.trim()) {
                           setApiToken(tokenInput.trim());
                         }
                         setIsEditingToken(false);
                         setTokenInput('');
                       }}
                       placeholder={apiToken ? '••••••••••••••••' : 'Enter your GitHub or Azure API token...'}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                     />
                     <div className="mt-1 flex justify-between items-center">
                        <p className="text-[10px] text-zinc-500">
                           {import.meta.env.VITE_AZURE_AI_TOKEN || import.meta.env.VITE_GITHUB_TOKEN
                             ? '✅ Loaded from environment variables' 
                             : apiToken 
                               ? '✅ Custom key saved' 
                               : '⚠️ Key required for AI features'}
                         </p>
                         <div className="flex gap-2">
                           {apiToken && !import.meta.env.VITE_AZURE_AI_TOKEN && !import.meta.env.VITE_GITHUB_TOKEN && (
                             <button
                               onClick={() => {
                                 setApiToken('');
                                 localStorage.removeItem('custom_api_token');
                                 localStorage.removeItem('custom_github_token');
                               }}
                               className="text-[10px] text-red-400 hover:underline"
                             >
                               Clear Token
                             </button>
                           )}
                          <a 
                            href="https://github.com/settings/tokens?type=beta" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:underline"
                          >
                            Get Your Own Token →
                          </a>
                        </div>
                      </div>
                   </div>
                 </div>
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
