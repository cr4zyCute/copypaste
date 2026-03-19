import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Eraser } from 'lucide-react';

export const MessageCleaner: React.FC = () => {
  const [inputHtml, setInputHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const computeCleanHtml = (html: string) => {
    if (!html) {
      return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Helper to process text content
    const processText = (text: string) => {
      let processed = text;
      
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
          newA.textContent = processText(el.textContent || '');
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
  };

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
            <button
              onClick={handleClear}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <Eraser className="w-3 h-3" /> Clear
            </button>
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
