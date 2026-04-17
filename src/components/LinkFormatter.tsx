import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link as LinkIcon, Copy, Check, Building2, UserCircle, X } from 'lucide-react';

export const LinkFormatter: React.FC = () => {
  const [inputLink, setInputLink] = useState('');
  const [prefix, setPrefix] = useState('Company Post: ');
  const [copied, setCopied] = useState(false);

  const isNoRecentPost = prefix === 'No Recent Post - Company: ';
  const formattedText = isNoRecentPost 
    ? prefix.trim()
    : (inputLink.trim() ? `${prefix}${inputLink.trim()}` : '');

  const handleCopy = async () => {
    if (!formattedText) return;
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy formatted link:', err);
    }
  };

  const handleClear = () => {
    setInputLink('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <LinkIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">Link Formatter</h3>
              <p className="text-sm text-zinc-500">Format links for your Daily Tracking / EOD updates easily</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Link Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <LinkIcon className="w-5 h-5 text-zinc-500" />
            </div>
            <input
              type="text"
              value={inputLink}
              onChange={(e) => setInputLink(e.target.value)}
              placeholder="Paste your link here (e.g., https://linkedin.com/...)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-12 py-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            {inputLink && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Clear input"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Prefix Selectors */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
              Select Prefix Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setPrefix('Company Post: ')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  prefix === 'Company Post: '
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Company Post:</span>
              </button>
              
              <button
                onClick={() => setPrefix('Prospect Post: ')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  prefix === 'Prospect Post: '
                    ? 'bg-purple-600/10 border-purple-500/50 text-purple-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-medium">Prospect Post:</span>
              </button>

              <button
                onClick={() => setPrefix('Company Reposted: ')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  prefix === 'Company Reposted: '
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Company Reposted:</span>
              </button>
              
              <button
                onClick={() => setPrefix('Prospect Reposted: ')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  prefix === 'Prospect Reposted: '
                    ? 'bg-orange-600/10 border-orange-500/50 text-orange-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-medium">Prospect Reposted:</span>
              </button>

              <button
                onClick={() => setPrefix('Prospect commented on this Post: ')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  prefix === 'Prospect commented on this Post: '
                    ? 'bg-cyan-600/10 border-cyan-500/50 text-cyan-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-medium">Prospect commented on this Post:</span>
              </button>

              <button
                onClick={() => setPrefix('No Recent Post - Company: ')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  prefix === 'No Recent Post - Company: '
                    ? 'bg-red-600/10 border-red-500/50 text-red-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">No Recent Post - Company:</span>
              </button>
            </div>
          </div>

          {/* Result Preview & Copy */}
          <div className="pt-4 border-t border-zinc-800/50">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
              Result Preview
            </label>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 min-h-[60px] flex items-center justify-between gap-4 group">
              <div className="text-sm font-mono text-zinc-300 break-all overflow-hidden flex-1">
                {formattedText || <span className="text-zinc-700">Paste a link above to see the formatted result...</span>}
              </div>
              <button
                onClick={handleCopy}
                disabled={!formattedText}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0
                  ${!formattedText 
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-transparent' 
                    : copied
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-900/20'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:text-white shadow-lg'}
                `}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
