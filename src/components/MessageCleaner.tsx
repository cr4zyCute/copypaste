import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Eraser, UserPlus, Zap, ZapOff } from 'lucide-react';

const SIMPLE_LIST_STORAGE_KEY = 'simple_manual_list';
const AUTO_ADD_STORAGE_KEY = 'message_cleaner_auto_add';

interface MessageCleanerProps {
  onNameAdded?: () => void;
}

export const MessageCleaner: React.FC<MessageCleanerProps> = ({ onNameAdded }) => {
  const [inputHtml, setInputHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const [listAdded, setListAdded] = useState(false);
  const [autoAdd, setAutoAdd] = useState(() => {
    const saved = localStorage.getItem(AUTO_ADD_STORAGE_KEY);
    return saved === null ? true : saved === 'true'; // Default to true if not set
  });
  const lastAutoAddedName = useRef<string>('');
  const outputRef = useRef<HTMLDivElement>(null);

  // Persist auto-add preference
  useEffect(() => {
    localStorage.setItem(AUTO_ADD_STORAGE_KEY, autoAdd.toString());
  }, [autoAdd]);

  // Extract name from input for the "Add to Simple List" feature
  const extractedName = useMemo(() => {
    if (!inputHtml) return '';
    
    // Create a temporary element to get plain text from HTML
    const temp = document.createElement('div');
    temp.innerHTML = inputHtml;
    
    // Improve text extraction to preserve line breaks from block elements
    // Replace block-level tags with their content + a newline to ensure we get distinct lines
    const blockTags = ['div', 'p', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr'];
    blockTags.forEach(tag => {
      const elements = temp.querySelectorAll(tag);
      elements.forEach(el => {
        const newline = document.createTextNode('\n');
        el.parentNode?.insertBefore(newline, el.nextSibling);
      });
    });

    const text = temp.innerText || temp.textContent || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) return '';

    let detectedName = '';
    let headerNameFound = false;
    
    // 1. Try to find a header name (High confidence)
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      // More relaxed name pattern: Allows multiple capitalized words, initials, and common suffixes
      const namePattern = /^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z.,]*){1,6}$/;
      
      if (namePattern.test(line)) {
        const nextLine = lines[i + 1] || '';
        const prevLine = lines[i - 1] || '';
        const isHeader = 
          nextLine.includes('connection') || 
          nextLine.includes('degree') || 
          nextLine.includes('1st') || 
          nextLine.includes('2nd') || 
          nextLine.includes('3rd') || 
          nextLine.includes('owner') || 
          nextLine.includes('manager') ||
          nextLine.includes('Chief') ||
          nextLine.includes('Director') ||
          nextLine.includes('Principal') ||
          nextLine.includes('Professor') ||
          nextLine.includes('Managing') ||
          nextLine.includes('Development') ||
          nextLine.includes('Energy') ||
          nextLine.includes('Executive') ||
          prevLine.includes('Oct') || 
          prevLine.includes('Nov') || 
          prevLine.includes('Dec') || 
          prevLine.includes('Jan') || 
          prevLine.includes('Feb') || 
          prevLine.includes('202');
          
        if (isHeader) {
          detectedName = line;
          headerNameFound = true;
          break;
        }
      }
    }

    // 2. Fallback: Check for greetings (Hi [Name])
    // If we found a greeting name, try to see if that name exists as a fuller name at the very top
    if (!headerNameFound) {
      for (const line of lines) {
        const greetingMatch = line.match(/^(?:Hi|Hello|Hey|Greetings|Dear)\s+([A-Z][a-z]+)/i);
        if (greetingMatch) {
          const firstName = greetingMatch[1].trim();
          // Look at the first 5 lines to see if any line starts with this first name
          for (let j = 0; j < Math.min(lines.length, 5); j++) {
            if (lines[j].startsWith(firstName) && lines[j].length > firstName.length) {
              detectedName = lines[j];
              headerNameFound = true;
              break;
            }
          }
          if (!detectedName) {
            detectedName = firstName;
          }
          break;
        }
      }
    }

    // 3. Last Fallback: Check the very first line of the paste
    // If it's a short line with 2-3 capitalized words, it's very likely the name
    if (!detectedName && lines[0] && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(lines[0])) {
      detectedName = lines[0];
    }

    // Clean up the detected name from LinkedIn connection noise
    if (detectedName) {
      detectedName = detectedName
        .replace(/\d+(?:st|nd|rd|th)\s+degree\s+connection/gi, '')
        .replace(/·\s*\d+(?:st|nd|rd|th)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return detectedName;
  }, [inputHtml]);

  const computeCleanHtml = (html: string) => {
    if (!html) {
      return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Helper to process text content
    const processText = (text: string, isInsideLink: boolean = false) => {
      let processed = text;
      
      // 0. Remove LinkedIn Header info if present
      // This is the specific request: remove Name, Degree, Title block at the very top
      // We DON'T remove the name if it's inside a link (the user wants to keep conversation links)
      if (extractedName && !isInsideLink) {
        // Create a regex that matches the header block more effectively
        const nameEscaped = extractedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Remove the name line
        processed = processed.replace(new RegExp(`^\\s*${nameEscaped}\\s*$`, 'gm'), '');
        
        // Remove degree indicators
        processed = processed.replace(/^\s*\d+(?:st|nd|rd|th)\s+degree\s+connection\s*$/gim, '');
        processed = processed.replace(/^\s*·\s+\d+(?:st|nd|rd|th)\s*$/gm, '');
        
        // Remove common job title keywords if they appear as standalone lines at the top
        const jobKeywords = ['Executive', 'Manager', 'Owner', 'Founder', 'Director', 'President', 'VP', 'Lead', 'Chief', 'Specialist', 'Partner', 'Principal', 'Professor', 'Dean', 'Engineer', 'Architect', 'Consultant'];
        jobKeywords.forEach(word => {
          const jobRegex = new RegExp(`^\\s*.*${word}.*\\s*$`, 'gm');
          processed = processed.replace(jobRegex, (match) => {
            // If it's a short line or contains many pipe symbols (typical for titles), remove it
            const pipeCount = (match.match(/\|/g) || []).length;
            if (match.length < 250 || pipeCount > 1) return '';
            return match;
          });
        });
      }

      // 1. Remove bullets (•, -, *, etc. at start of lines or standalone)
      processed = processed.replace(/^[\s]*[•\-*⋅‧∙◦○●⦿⦾➢➣➤][\s]*/gm, '');
      // Also remove any standalone bullets that might be left in the middle of text if they look like list items
      processed = processed.replace(/[\r\n]+[\s]*[•\-*⋅‧∙◦○●⦿⦾➢➣➤][\s]*/g, '\n');
      
      // 2. Remove "View [Name]’s profile[Name]" pattern
      processed = processed.replace(/View .*?[’']s? profile.*?(?=\s*https?:\/\/|\r?\n|$)/gim, '');
      
      // 3. Remove emojis
      processed = processed.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F400}-\u{1F4FF}]/gu, '');
      
      // 4. Uppercase Dates (e.g. Sep 4, 2025 -> SEP 4, 2025)
      processed = processed.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s+\d{4})?/gi, (match) => match.toUpperCase());

      return processed;
    };

    // Flatten the DOM into a list of Text nodes, Links, and Breaks
    // This ensures no block elements (div, p, ul, li) remain to confuse pasting
    const flatNodes: (Node | string)[] = [];
    
    // Check if node is a block element that warrants a line break
    const isBlock = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const tag = (node as Element).tagName.toLowerCase();
      return ['div', 'p', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'br'].includes(tag);
    };

    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.nodeValue || '';
        
        // Handle "Stuck Date" (Split Date and Name) within text node
        // e.g. "2025Lorelie" -> "2025" <br> "Lorelie"
        const match = /(\d{4})([a-zA-Z])/.exec(text);
        if (match) {
          const index = match.index + 4;
          const part1 = processText(text.substring(0, index));
          const part2 = processText(text.substring(index));
          
          if (part1.trim()) flatNodes.push(document.createTextNode(part1));
          flatNodes.push(document.createElement('br'));
          if (part2.trim()) flatNodes.push(document.createTextNode(part2));
        } else {
          text = processText(text);
          if (text) { // Keep even if whitespace to preserve spacing between words, but maybe trim if it's just a newline
             flatNodes.push(document.createTextNode(text));
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();

        if (tag === 'br') {
          flatNodes.push(document.createElement('br'));
        } else if (tag === 'a') {
          // Keep the link, but process its text content
          const newA = el.cloneNode(false) as HTMLElement; // shallow clone (attributes only)
          newA.removeAttribute('style');
          newA.removeAttribute('class');
          newA.style.color = '#60a5fa'; // blue-400
          newA.style.textDecoration = 'underline';
          // Pass true to indicate we are inside a link, preventing name stripping
          newA.textContent = processText(el.textContent || '', true);
          flatNodes.push(newA);
        } else {
          // Traverse children for other elements
          const childNodes = Array.from(node.childNodes);
          childNodes.forEach(child => traverse(child));
          
          // If block element, add a break after content (if not already ending with one)
          if (isBlock(node)) {
            flatNodes.push(document.createElement('br'));
          }
        }
      }
    };

    // Traverse the body
    Array.from(body.childNodes).forEach(traverse);

    // Reconstruct into a temporary container to get HTML string
    const container = document.createElement('div');
    flatNodes.forEach(n => {
      if (typeof n === 'string') {
        container.appendChild(document.createTextNode(n));
      } else {
        container.appendChild(n);
      }
    });

    // Final cleanup on the generated HTML string
    let finalHtml = container.innerHTML;

    // --- STRIP EVERYTHING BEFORE THE FIRST DAY OR DATE ---
    // This addresses the user request: "start on the date dont include this in the result"
    // Expanded to include days of the week, "Today", and "Yesterday"
    const months = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
    const days = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
    const relativeDays = 'Today|Yesterday';
    
    const datePattern = new RegExp(`(?:${months})\\s+\\d{1,2}(?:,\\s+\\d{4})?|${days}|${relativeDays}`, 'i');
    
    const firstDateMatch = finalHtml.match(datePattern);
    if (firstDateMatch && firstDateMatch.index !== undefined) {
      // Find the start of the date line (or the nearest previous <br> to keep it clean)
      const substringBeforeDate = finalHtml.substring(0, firstDateMatch.index);
      const lastBreakBeforeDate = substringBeforeDate.lastIndexOf('<br>');
      
      if (lastBreakBeforeDate !== -1) {
        finalHtml = finalHtml.substring(lastBreakBeforeDate + 4);
      } else {
        finalHtml = finalHtml.substring(firstDateMatch.index);
      }
    }

    // 1. Force break after "sent the following message(s) at..." line if stuck
    // Matches "sent the following message(s) at [Time] [AM/PM]" and ensures a break follows
    // Made "messages" plural optional and space before AM/PM optional to cover all variations
    finalHtml = finalHtml.replace(/(sent the following messages? at \d{1,2}:\d{2} ?[AP]M)/gi, '$1<br>');

    // 2. Fix Stuck Date (e.g. "SEP 4, 2025Lorelie") and Ensure Date is on its own line
    // Matches Date pattern (e.g. "SEP 4, 2025") and forces breaks around it
    finalHtml = finalHtml.replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}(?:,\s+\d{4})?/g, '<br>$&<br>');

    // 3. Fix Stuck Timestamp (e.g. "11:52 PMLorelie" or "11:52 PM Lorelie")
    // Matches "PM" or "AM" followed by optional spaces and then a letter
    // Replaces with "PM<br>Lorelie" (stripping the space if it exists)
    finalHtml = finalHtml.replace(/([AP]M)[\s]*([a-zA-Z])/g, '$1<br>$2');

    // 4. Remove excessive breaks (more than 2 -> 2, or 2 -> 1 based on user preference)
    // User said "spacing is too much", so let's aim for single breaks mostly, double only for dates
    finalHtml = finalHtml.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>'); 
    
    // 2. Ensure Date lines are preceded by a break (or two if needed for separation)
    // We uppercased dates, so look for SEP 4, JAN 26 etc.
    // The previous logic added breaks. Here we might have just text<br>DATE.
    // If we want a blank line before date: text<br><br>DATE.
    // Let's use regex on the HTML to enforce this.
    
    // Pattern: (Any tag or text ending) followed by (Date)
    // We want to ensure there's a break before the date.
    // Actually, if we just flattened everything, the structure is simpler.
    
    // Let's iterate the constructed nodes one last time to fix spacing around dates? 
    // Or just use the string replacement which is easier.
    
    // Fix: Ensure 1 empty line before a Date (so 2 breaks total)
    // Find: <br>SEP 4
    // Replace: <br><br>SEP 4
    // But be careful not to make 3 breaks.
    
    // We need to match the uppercased version in the HTML string
    // Since we processText'd it, it's SEP, OCT, etc.
    
    // We can't easily regex match "Date at start of line" in HTML string without being careful.
    // But we know dates are usually at the start of a text node in our flat list.
    
    // Let's rely on the block breaks we added.
    // If we want to force extra spacing for dates:
    // We can do it during traversal or here.
    
    // Let's just strip excessive breaks first.
    finalHtml = finalHtml.replace(/(<br\s*\/?>\s*){2,}/gi, '<br><br>'); // Max 2 breaks
    
    // Remove break at the very start
    finalHtml = finalHtml.replace(/^(<br\s*\/?>\s*)+/i, '');
    
    // Remove break at the very end
    finalHtml = finalHtml.replace(/(<br\s*\/?>\s*)+$/i, '');

    return finalHtml;
  };
  
  const outputHtml = useMemo(() => computeCleanHtml(inputHtml), [inputHtml]);

  const handleCopy = () => {
    if (!outputRef.current) return;

    const htmlContent = outputHtml;
    const textContent = outputRef.current.innerText; // Get visual text

    try {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([textContent], { type: 'text/plain' })
      });

      navigator.clipboard.write([clipboardItem]).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy rich text:', err);
        // Fallback to simple text copy
        navigator.clipboard.writeText(textContent).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      });
    } catch (e) {
      console.error('Failed to create ClipboardItem:', e);
      navigator.clipboard.writeText(textContent).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    // Prefer HTML if available, otherwise text
    let content = html || text;

    if (html) {
      // Create a temporary DOM element to manipulate the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Remove all style and class attributes from all elements to prevent white background blocks
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        el.removeAttribute('style');
        el.removeAttribute('class');
        
        // Make links visible in the dark theme
        if (el.tagName === 'A') {
          (el as HTMLElement).style.color = '#60a5fa'; // blue-400
          (el as HTMLElement).style.textDecoration = 'underline';
        }
      });
      
      content = tempDiv.innerHTML;
    }
    
    setInputHtml(content);
    
    // Manually update the div content to reflect the paste
    if (e.currentTarget) {
      e.currentTarget.innerHTML = content;
    }
  };

  const handleClear = () => {
    setInputHtml('');
    // Also clear the div content manually since it's contentEditable
    const inputDiv = document.getElementById('message-cleaner-input');
    if (inputDiv) inputDiv.innerHTML = '';
    setListAdded(false);
  };

  const handleAddToList = (manualNameOverride?: string) => {
    let nameToSave = manualNameOverride || extractedName;
    
    if (!nameToSave && !manualNameOverride) {
      return; 
    }

    if (!nameToSave) return;

    try {
      const saved = localStorage.getItem(SIMPLE_LIST_STORAGE_KEY);
      let names = saved ? JSON.parse(saved) : [];
      
      const lowerName = nameToSave.toLowerCase();
      const existingIdx = names.findIndex((n: any) => {
        const nLower = n.name.toLowerCase();
        return nLower === lowerName || nLower.startsWith(lowerName + ' ') || lowerName.startsWith(nLower + ' ');
      });

      if (existingIdx === -1) {
        // New prospect
        const newEntry = {
          id: Math.random().toString(36).substring(2, 9),
          name: nameToSave,
          timestamp: Date.now(),
          addedAt: new Date().toISOString().split('T')[0],
        };
        names = [newEntry, ...names];
      } else {
        // Existing prospect - check for name upgrade
        const existingName = names[existingIdx].name;
        if (nameToSave.length > existingName.length) {
          // Upgrade to full name
          names[existingIdx] = { ...names[existingIdx], name: nameToSave };
        } else {
          // Already have this name or a better version
          if (!manualNameOverride) return; // Skip if auto-adding and no upgrade needed
        }
      }

      localStorage.setItem(SIMPLE_LIST_STORAGE_KEY, JSON.stringify(names));
      
      // Notify parent to refresh state
      if (onNameAdded) onNameAdded();
      
      setListAdded(true);
      setTimeout(() => setListAdded(false), 3000);
    } catch (err) {
      console.error('Failed to add name to Simple List:', err);
    }
  };

  // Auto-add logic
  useEffect(() => {
    if (autoAdd && extractedName && extractedName !== lastAutoAddedName.current) {
      handleAddToList(extractedName);
      lastAutoAddedName.current = extractedName;
    }
  }, [extractedName, autoAdd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-zinc-400">Original Message (Rich Text)</label>
            <div className="flex items-center gap-3">
              {/* Auto-Add Toggle */}
              <button
                onClick={() => setAutoAdd(!autoAdd)}
                className={`
                  flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border
                  ${autoAdd 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-400'}
                `}
                title={autoAdd ? 'Auto-Add is ON' : 'Auto-Add is OFF'}
              >
                {autoAdd ? <Zap className="w-3 h-3 fill-current" /> : <ZapOff className="w-3 h-3" />}
                Auto-Add {autoAdd ? 'ON' : 'OFF'}
              </button>

              <div className="h-4 w-[1px] bg-zinc-800" />

              {inputHtml && (
                <button
                  onClick={() => handleAddToList()}
                  disabled={listAdded || (!extractedName && !autoAdd)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all
                    ${listAdded 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                      : !extractedName 
                        ? 'bg-zinc-800/50 text-zinc-600 border border-zinc-700 cursor-not-allowed'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'}
                  `}
                >
                  <UserPlus className="w-3 h-3" />
                  {listAdded ? 'Added!' : extractedName ? `Add "${extractedName}"` : 'No Name Detected'}
                </button>
              )}
              <button
                onClick={handleClear}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <Eraser className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
          <div
            id="message-cleaner-input"
            contentEditable
            onInput={(e) => setInputHtml(e.currentTarget.innerHTML)}
            onPaste={handlePaste}
            className="w-full h-96 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 overflow-y-auto font-mono leading-relaxed"
            style={{ whiteSpace: 'pre-wrap' }} 
            data-placeholder="Paste your message here..."
          />
        </div>

        {/* Output Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-zinc-400">Cleaned Message (Preview)</label>
            <button
              onClick={handleCopy}
              disabled={!outputHtml}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                ${!outputHtml 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                  : copied 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'}
              `}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy Result
                </>
              )}
            </button>
          </div>
          <div className="relative">
            <div
              ref={outputRef}
              className="w-full h-96 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 overflow-y-auto font-mono leading-relaxed"
              dangerouslySetInnerHTML={{ __html: outputHtml }}
            />
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-zinc-500">
          Auto-removes bullets • emojis • "View Lorelie’s profile" • Adds spacing before dates • Preserves Links
        </p>
      </div>
    </motion.div>
  );
};
