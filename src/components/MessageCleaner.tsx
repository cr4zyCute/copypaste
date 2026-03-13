import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Eraser } from 'lucide-react';

export const MessageCleaner: React.FC = () => {
  const [inputHtml, setInputHtml] = useState('');
  const [outputHtml, setOutputHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cleanMessage(inputHtml);
  }, [inputHtml]);

  const cleanMessage = (html: string) => {
    if (!html) {
      setOutputHtml('');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Remove unwanted tags first to prevent CSS rules from appearing as text
    const unwantedTags = body.querySelectorAll('style, script, head, meta, title, link');
    unwantedTags.forEach(tag => tag.parentNode?.removeChild(tag));

    // 0. Strip styles and classes to fix Word paste issues (white background, colors, etc.)
    const allNodes = body.querySelectorAll('*');
    allNodes.forEach(node => {
      node.removeAttribute('style');
      node.removeAttribute('class');
      // Also unwrap spans if they have no attributes left? 
      // Actually removing style is enough, span without style is just text container.
    });

    // Helper to process text nodes
    const processText = (text: string) => {
      let processed = text;
      
      // 1. Remove bullets (•, -, *, etc. at start of lines or standalone)
      // Expanded to include other common bullet characters
      processed = processed.replace(/^[\s]*[•\-*⋅‧∙◦○●⦿⦾➢➣➤][\s]*/gm, '');
      
      // 2. Remove "View [Name]’s profile[Name]" pattern
      // Stop before http, newline, or end of string
      // Updated to handle possessive s optionally (e.g. Francis' profile)
      processed = processed.replace(/View .*?[’']s? profile.*?(?=\s*https?:\/\/|\r?\n|$)/gim, '');
      
      // 3. Remove emojis
      processed = processed.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      
      // 4. Remove "sent the following message at..." pattern
      // Matches " sent the following message at " followed by time (e.g. 12:34 AM)
      processed = processed.replace(/ sent the following messages? at \d{1,2}:\d{2} [AP]M/gi, '');

      return processed;
    };

    // Traverse and clean text nodes
    const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const textNodes: Node[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    // Process each text node
    textNodes.forEach(node => {
      if (node.nodeValue) {
        node.nodeValue = processText(node.nodeValue);
      }
    });

    // 4a. Fix "Stuck Date" (Split Date and Name) - DOM Aware
    // Look for text nodes that end with Year (4 digits) and next text node starts with Letter
    // Or single text node containing Year+Letter
    
    // First, handle within-node split by inserting BR
    // We need to re-query text nodes because previous loop might have changed things? 
    // Actually we just modified nodeValue.
    
    // Let's iterate again for the split logic.
    // We need a fresh walker or array because we might be modifying the DOM (splitting nodes).
    const walker2 = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const nodesToSplit: {node: Node, index: number}[] = [];
    
    let currentNode: Node | null;
    while ((currentNode = walker2.nextNode())) {
      const text = currentNode.nodeValue || '';
      const match = /(\d{4})([a-zA-Z])/.exec(text);
      if (match) {
        // Found a stuck date within the node
        // We need to split this node.
        // match.index + 4 is where the year ends.
        nodesToSplit.push({ node: currentNode, index: match.index + 4 });
      }
    }

    // Perform splits
    nodesToSplit.reverse().forEach(({ node, index }) => {
       const text = node.nodeValue || '';
       const part1 = text.substring(0, index);
       const part2 = text.substring(index);
       
       const frag = doc.createDocumentFragment();
       frag.appendChild(doc.createTextNode(part1));
       frag.appendChild(doc.createElement('br'));
       frag.appendChild(doc.createTextNode(part2));
       
       node.parentNode?.replaceChild(frag, node);
    });

    // 4b. Handle Cross-Node Stuck Date
    // e.g. <span>2025</span><span>Lorelie</span>
    // We need to walk linearly and check adjacent text nodes.
    const walker3 = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let prevTextNode: Node | null = null;
    
    while ((currentNode = walker3.nextNode())) {
      if (prevTextNode) {
        const prevText = prevTextNode.nodeValue || '';
        const currText = currentNode.nodeValue || '';
        
        // Check if prev ends with year (ignoring trailing spaces? User said "stuck", so usually no spaces)
        // If there are spaces, it's not "stuck", so we don't need to force a break (unless user wants force break after date).
        // Let's assume strict adjacency for "stuck".
        if (/\d{4}$/.test(prevText) && /^[a-zA-Z]/.test(currText)) {
           // Insert BR between them
           // We need to find a common parent or just insert after prevTextNode?
           // Text nodes might be in different parents.
           // Safe bet: insert before current node's parent if it's the first child, or after prev node's parent?
           // Easiest: insert BR before current text node (in its parent).
           const br = doc.createElement('br');
           currentNode.parentNode?.insertBefore(br, currentNode);
        }
      }
      prevTextNode = currentNode;
    }

    // 4. Flatten lists (ul, ol, li) to prevent bullets in rich text editors like Asana
    const lists = body.querySelectorAll('ul, ol');
    lists.forEach(list => {
      // Replace list with a div, but copy its styles or add a margin to simulate separation if needed
      const div = doc.createElement('div');
      div.style.listStyle = 'none';
      div.style.padding = '0';
      div.style.margin = '0';
      
      // Move all children to the new div
      while (list.firstChild) {
        div.appendChild(list.firstChild);
      }
      
      list.parentNode?.replaceChild(div, list);
    });

    const listItems = body.querySelectorAll('li');
    listItems.forEach(li => {
      // Replace li with div and add a break if needed
      // Important: Ensure we strip any list-style related attributes or classes if they exist
      const div = doc.createElement('div');
      div.innerHTML = li.innerHTML; // Keep inner HTML (links, formatting)
      
      // Add a style to ensure no bullets are shown (just in case)
      div.style.listStyle = 'none';
      div.style.display = 'block';
      div.style.padding = '0';
      div.style.margin = '0';
      
      li.parentNode?.replaceChild(div, li);
    });

    // 5. Add space on top and bottom of the Date
    // This is trickier in HTML. We need to identify blocks that start with a date.
    const datePattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Today|Yesterday|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})/i;
    
    // We can iterate over block elements (div, p, li) or just check text content of blocks
    const blocks = body.querySelectorAll('div, p, li, h1, h2, h3, h4, h5, h6');
    blocks.forEach(block => {
      const textContent = block.textContent?.trim() || '';
      if (datePattern.test(textContent)) {
        // 1. Add 2 spaces (breaks) on top
        if (block.previousSibling) {
          const br1 = doc.createElement('br');
          const br2 = doc.createElement('br');
          block.parentNode?.insertBefore(br1, block);
          block.parentNode?.insertBefore(br2, block);
        }
        
        // 2. Remove space on bottom (ensure no breaks follow)
        let next = block.nextSibling;
        while (next && next.nodeName === 'BR') {
          const toRemove = next;
          next = next.nextSibling;
          toRemove.parentNode?.removeChild(toRemove);
        }
      }
    });

    // Final cleanup: Remove any remaining ul/ol/li tags that might have been nested or missed
    // (The previous pass should have caught them, but let's be safe by stripping list styles from everything)
    const allElements = body.querySelectorAll('*');
    allElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.listStyle = 'none';
      }
    });

    setOutputHtml(body.innerHTML);
  };

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
    const content = html || text;
    
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
