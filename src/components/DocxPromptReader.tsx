import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink, Download, AlertCircle } from 'lucide-react';
import 'docx-preview/dist/docx-preview.css';

const docxUrl = new URL('./Copy Writing Prompt.docx', import.meta.url).href;

export const DocxPromptReader: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const renderDocx = async () => {
      setIsRendering(true);
      setError(null);
      try {
        const [{ renderAsync }] = await Promise.all([
          import('docx-preview') as Promise<any>,
        ]);

        const response = await fetch(docxUrl);
        if (!response.ok) throw new Error('Failed to load DOCX file');
        const blob = await response.blob();

        if (!isMounted) return;
        if (containerRef.current) {
          await renderAsync(blob, containerRef.current, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            className: 'docx-view',
            breakPages: true,
            useMathMLPolyfill: true,
          });
        }
      } catch (e: any) {
        setError(e?.message || 'Unable to render the document.');
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    renderDocx();
    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  const handleOpenNewTab = () => {
    window.open(docxUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = docxUrl;
    link.download = 'Copy Writing Prompt.docx';
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-md">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-200">Copy Writing Prompt</h3>
            <p className="text-xs text-zinc-500">Fast view and download</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors border border-transparent hover:border-zinc-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors border border-transparent hover:border-zinc-700"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">
            {error}. You can still open or download the file using the buttons above.
          </p>
        </div>
      )}

      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            Rendering document…
          </div>
        )}
        <div ref={containerRef} className="docx-container p-6"></div>
      </div>
    </motion.div>
  );
};
