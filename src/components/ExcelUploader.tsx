import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
interface ExcelUploaderProps {
  onDataLoaded: (data: any[], fileName: string) => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      onDataLoaded(jsonData, file.name);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file");
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-xl p-12
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 bg-zinc-900/50'
          }
        `}
      >
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={onInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className={`
            p-4 rounded-full bg-zinc-800 ring-1 ring-white/10
            transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
          `}>
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-8 h-8 text-zinc-400 group-hover:text-blue-400 transition-colors" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-medium text-zinc-100">
              {isLoading ? 'Processing...' : 'Drop your Excel file here'}
            </h3>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto">
              or click to browse. Supports .xlsx, .xls, .csv
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
