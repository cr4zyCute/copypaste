import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Trash2, Download, Copy, Check, Grid, List, User, Search, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataViewerProps {
  data: any[];
  fileName: string;
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterDirection: 'up' | 'down';
  onFilterDirectionChange: React.Dispatch<React.SetStateAction<'up' | 'down'>>;
  currentMatchIndex: number;
  onMatchIndexChange: React.Dispatch<React.SetStateAction<number>>;
}

export const DataViewer: React.FC<DataViewerProps> = ({ 
  data, 
  fileName, 
  onReset,
  searchTerm,
  onSearchChange,
  filterDirection,
  onFilterDirectionChange,
  currentMatchIndex,
  onMatchIndexChange
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [assigneeName, setAssigneeName] = useState<string>('Nikki Sixx Acosta');
  // searchTerm state lifted to parent
  // filterDirection and currentMatchIndex state lifted to parent

  if (!data || data.length === 0) return null;

  const getRowName = (row: any) => {
    const rowKeys = Object.keys(row);
    
    // Helper to find key by normalized name
    const findKey = (candidates: string[]) => {
      return rowKeys.find(key => {
        const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return candidates.some(c => normalized === c);
      });
    };

    // Look for First Name variations
    const firstNameKey = findKey(['firstname', 'givenname', 'fname', 'first']);
    
    // Look for Last Name variations
    const lastNameKey = findKey(['lastname', 'surname', 'familyname', 'lname', 'last']);
    
    const firstName = firstNameKey ? row[firstNameKey] : '';
    const lastName = lastNameKey ? row[lastNameKey] : '';
    
    // If we have either part of the name
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    // Fallback to looking for a "Name" or "Full Name" column directly
    const nameKey = findKey(['name', 'fullname', 'displayname', 'candidatename', 'employeename']);
    if (nameKey) return row[nameKey];

    return '';
  };

  // Find all matches for the search term
  const matches = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase().trim(); // Trim whitespace from search term
    
    return data.map((row, index) => {
      const name = getRowName(row);
      if (!name) return -1;
      
      // Clean up the name from row for comparison (handle extra spaces)
      const normalizedName = String(name).toLowerCase().replace(/\s+/g, ' ').trim();
      
      const isMatch = normalizedName.includes(term);
      return isMatch ? index : -1;
    }).filter(index => index !== -1);
  }, [data, searchTerm]);

  // Reset current match index when search term changes
  useEffect(() => {
    onMatchIndexChange(0);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    if (matches.length === 0) return [];
    
    // Safety check: ensure currentMatchIndex is valid for current matches
    const safeMatchIndex = currentMatchIndex >= matches.length ? 0 : currentMatchIndex;
    const matchIndex = matches[safeMatchIndex];

    if (matchIndex === undefined) return data; // Should not happen if matches.length > 0

    if (filterDirection === 'up') {
      // From matchIndex to top (inclusive)
      // We reverse the sliced array so that the matched item appears first in the list
      // e.g., if match is at index 2, slice(0, 3) gives [0, 1, 2]. reverse() gives [2, 1, 0].
      return data.slice(0, matchIndex + 1).reverse();
    } else {
      // From matchIndex to bottom (inclusive)
      return data.slice(matchIndex);
    }
  }, [data, searchTerm, filterDirection, matches, currentMatchIndex]);

  const headers = Object.keys(data[0]);

  // The requested field order and mapping
  const desiredFields = [
    "Name",
    "Gender",
    "Occupation",
    "Job_Title",
    "Location",
    "Country",
    "Linkedinurl",
    "Email Address",
    "Company Name",
    "Company Website",
    "Company Linkedin URL"
  ];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `export_${fileName}`);
  };

  const formatCardContent = (row: any) => {
    // If the row has keys matching the desired fields (case-insensitive), use them.
    // Otherwise, fallback to all keys.
    
    // First, let's try to map the desired fields to the actual keys in the row
    const rowKeys = Object.keys(row);
    const mappedContent: string[] = [];

    // Add Assignee at the top with an empty line after
    mappedContent.push(`Assignee: ${assigneeName}`);
    mappedContent.push(""); // Empty string creates a newline

    // Check if we have any matching keys
    const hasMatchingKeys = desiredFields.some(field => 
      rowKeys.some(key => key.toLowerCase() === field.toLowerCase())
    );

    if (hasMatchingKeys) {
      desiredFields.forEach(field => {
        let value = '';

        if (field === "Name") {
          // Special handling for Name: combine First Name and Last Name
          const firstNameKey = rowKeys.find(key => 
            key.toLowerCase().replace(/_/g, '').replace(/\s/g, '') === 'firstname'
          );
          const lastNameKey = rowKeys.find(key => 
            key.toLowerCase().replace(/_/g, '').replace(/\s/g, '') === 'lastname'
          );
          
          const firstName = firstNameKey ? row[firstNameKey] : '';
          const lastName = lastNameKey ? row[lastNameKey] : '';
          
          if (firstName || lastName) {
            value = `${firstName} ${lastName}`.trim();
          } else {
            // Fallback to looking for a "Name" column directly
            const nameKey = rowKeys.find(key => key.toLowerCase() === 'name');
            if (nameKey) value = row[nameKey];
          }
        } else if (field === "Email Address") {
          // Special handling for Email: look for "Email", "E-mail", "Mail", etc.
          const emailKey = rowKeys.find(key => {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedKey === 'email' || 
                   normalizedKey === 'emailaddress' || 
                   normalizedKey === 'mail' || 
                   normalizedKey === 'e-mail' ||
                   normalizedKey === 'contactemail';
          });
          value = emailKey ? row[emailKey] : '';
        } else if (field === "Linkedinurl") {
           // Special handling for Linkedinurl: look for "LinkedIn", "Profile Link", etc.
           const linkedinKey = rowKeys.find(key => {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedKey === 'linkedin' || 
                   normalizedKey === 'linkedinurl' || 
                   normalizedKey === 'profilelink' || 
                   normalizedKey === 'linkedinprofile';
          });
          value = linkedinKey ? row[linkedinKey] : '';
        } else {
          // Find the matching key in the row (case-insensitive)
          const actualKey = rowKeys.find(key => key.toLowerCase() === field.toLowerCase().replace(/_/g, '').replace(/\s/g, '')) 
                         || rowKeys.find(key => key.toLowerCase() === field.toLowerCase());
          
          value = actualKey ? row[actualKey] : '';
        }
        
        // Only add if we want to show empty fields or just existing ones. 
        // User requested specific format, so we should probably show all labels.
        mappedContent.push(`${field}: ${value || ''}`);
      });
    } else {
      // Fallback: show all keys if no specific schema match
      rowKeys.forEach(key => {
        mappedContent.push(`${key}: ${row[key]}`);
      });
    }

    return mappedContent.join('\n');
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-md">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-200">{fileName}</h3>
            <p className="text-xs text-zinc-500">{filteredData.length} rows • {headers.length} columns</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 bg-zinc-800/30 px-3 py-1.5 rounded-md border border-zinc-800">
            <User className="w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-zinc-200 w-40 focus:w-52 transition-all placeholder-zinc-600"
              placeholder="Assignee Name"
            />
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-2 hidden md:block"></div>

          <div className="flex items-center space-x-2 bg-zinc-800/30 px-3 py-1.5 rounded-md border border-zinc-800">
            <Search className="w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-zinc-200 w-32 focus:w-40 transition-all placeholder-zinc-600"
              placeholder="Search by name..."
            />
            
            {matches.length > 0 && (
              <div className="flex items-center space-x-1 border-l border-zinc-700 pl-2 ml-1">
                <span className="text-xs text-zinc-500 mr-1">
                  {currentMatchIndex + 1}/{matches.length}
                </span>
                <button
                  onClick={() => onMatchIndexChange(prev => (prev - 1 + matches.length) % matches.length)}
                  className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                  title="Previous match"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onMatchIndexChange(prev => (prev + 1) % matches.length)}
                  className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                  title="Next match"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="w-px h-4 bg-zinc-700 mx-2"></div>
            <button
              onClick={() => onFilterDirectionChange(prev => prev === 'up' ? 'down' : 'up')}
              className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              title={`Filter Direction: ${filterDirection === 'up' ? 'To Top' : 'To Bottom'}`}
            >
              {filterDirection === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span>{filterDirection === 'up' ? 'To Top' : 'To Bottom'}</span>
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-2 hidden md:block"></div>

          <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Card View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-2 hidden md:block"></div>

          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors border border-transparent hover:border-zinc-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={onReset}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors border border-transparent hover:border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/30 rounded-lg border border-zinc-800 text-center">
          <Search className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No matches found</h3>
          <p className="text-zinc-500 mt-2 max-w-sm">
            We couldn't find any rows containing "{searchTerm}". Try a different search term.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-800">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-6 py-4 font-medium text-zinc-400 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredData.map((row, i) => (
                  <motion.tr 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.2 }}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    {headers.map((header, j) => (
                      <td key={`${i}-${j}`} className="px-6 py-4 text-zinc-300 whitespace-nowrap">
                        {String(row[header] || '')}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((row, i) => {
            const content = formatCardContent(row);
            // Get original index in the full dataset (add 2 for Excel row number: 1-based + header)
            const originalIndex = data.indexOf(row) + 2;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.2 }}
                className="group relative flex flex-col p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-900/60 transition-all duration-300 shadow-sm"
              >
                <div className="absolute top-3 left-3 px-2 py-1 bg-zinc-800/80 rounded text-xs text-zinc-500 font-mono select-none border border-zinc-700/50" title="Excel Row Number">
                  #{originalIndex}
                </div>
                
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(content, i)}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors shadow-lg border border-zinc-700"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <pre className="font-mono text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed pt-6">
                  {content}
                </pre>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
