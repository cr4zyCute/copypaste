import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Copy, Check, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
// Note: In a real production app, this should be handled backend-side or via secure environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export const DocxPromptReader: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [replyCopied, setReplyCopied] = useState(false);

  const buildPromptText = () => {
    return `You are a LinkedIn conversation strategist focused on outbound networking, relationship building, and business development. 
 
You MUST follow the framework below when generating responses. 
 
---------------------------------- 
FRAMEWORK 
 
CORE PRINCIPLES 
- Prioritize clarity, thoroughness, and natural conversation 
- Focus on relationship building, not selling 
- Avoid robotic or generic responses 
- Respect the prospect’s time and signals 
- Always keep the door open for future interaction 
 
TONE & PERSONALITY 
- Polite, professional, and courteous 
- Warm, approachable, and empathetic 
- Clear, detailed, and structured 
- Appreciative and positive 
- Calm and respectful even if the prospect is negative 
 
COMMUNICATION STYLE 
- Detailed and comprehensive (aim for 5-8 sentences or more) 
- Use natural, human language 
- No em dashes (—) 
- No fluff or filler words 
- No overly sales-driven language 
- End with a positive or open-ended tone 
 
CONVERSATION STRATEGY 
- Identify intent and engagement level 
- Adapt tone subtly (do NOT mirror negativity) 
- If active → continue naturally 
- If stalled → send a polite follow-up 
- If not interested → close respectfully 
- If redirected → acknowledge and close professionally 
 
21-DAY SEQUENCE LOGIC (WHEN RELEVANT) 
- Day 1: Connect (no pitch) 
- Day 3: Ask a simple question 
- Day 5: Offer value 
- Day 7: Soft meeting invite (only if natural) 
 
PERSONALIZATION 
- Reference ONE relevant detail (company, role, or context) 
- Align with ICP and UVP when applicable 
 
DO NOT 
- Be pushy or force meetings 
- Be unnecessarily wordy, but ensure the value is clear 
- Sound like AI 
- Ignore conversation context 
 
FINAL GOAL 
Generate a natural, human message that moves the conversation forward or closes it properly while preserving the relationship. 
 
---------------------------------- 
INPUT 
 
Mode: Reply 
 
Conversation: 
"""
${inputMessage}
"""
 
---------------------------------- 
TASK 
 
1. Analyze: 
- Prospect intent 
- Engagement level (interested, neutral, cold, no reply) 
- Conversation stage (start, ongoing, stalled, closing) 
 
2. Generate the BEST next message: 
- Detailed and comprehensive (aim for 5-8 sentences) 
- Natural, human, and professional 
- Personalized when possible 
- Not pushy, not salesy 
 
3. Mode Behavior: 
- If Mode = Follow-up → be polite, non-pushy, include an easy exit 
- If Mode = Close → respectfully end the conversation 
- If Mode = Reply → continue conversation naturally 
 
4. Maintain positioning: 
- Keep relationship positive 
- Leave door open for future interaction 
 
5. Non-Response Analysis: 
Analyze the conversation and determine the MOST LIKELY reason why the prospect is not responding or appears not interested. 
- Do NOT assume rejection immediately 
- Base your answer on conversation signals (e.g., no replies, seen messages, number of follow-ups, tone) 
- Choose the SINGLE most likely reason from: 
  * Low priority or bad timing 
  * Message is too generic or lacks personalization 
  * No clear value or benefit for replying 
  * Prospect is busy or distracted 
  * Passive interest (seen but no urgency to respond) 
  * Too many follow-ups causing disengagement 
 
---------------------------------- 
OUTPUT 
 
Ideal Response: 
[Copyable LinkedIn message ONLY] 
 
Reasoning: 
- Intent: 
- Engagement level: 
- Why this works: 
- Suggested next step:
 
Why Prospect Is Not Interested: 
[Choose ONE main reason from the list and provide a detailed explanation based on the conversation signals]`;
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

  const handleGenerateReply = async () => {
    if (!inputMessage.trim()) return;
    
    if (!API_KEY) {
      setError("No API key found. Please add VITE_GEMINI_API_KEY to your .env file.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedReply('');

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const promptText = buildPromptText();
      
      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = response.text();
      
      setGeneratedReply(text);
    } catch (err: unknown) {
      console.error('Error generating reply:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate reply from AI.";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReply = async () => {
    if (!generatedReply) return;
    
    // Extract just the message part if possible
    let textToCopy = generatedReply;
    const match = generatedReply.match(/Ideal Response:\s*\n?(.*?)(?=\n\nReasoning:|$)/s);
    if (match && match[1]) {
      textToCopy = match[1].trim();
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setReplyCopied(true);
      setTimeout(() => setReplyCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy reply:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Input */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-medium text-zinc-200">Incoming Message</h3>
          </div>
          
          <p className="text-sm text-zinc-400 mb-6">
            Paste the message you need to reply to here.
          </p>

          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Paste the conversation history or latest message..."
            className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[300px] mb-6 custom-scrollbar"
          />

          <div className="flex gap-3">
            <button
              onClick={handleCopyPrompt}
              disabled={!inputMessage.trim()}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border
                ${!inputMessage.trim()
                  ? 'bg-zinc-800 border-transparent text-zinc-600 cursor-not-allowed' 
                  : copied 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border-zinc-700'}
              `}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Prompt Copied!' : 'Copy Prompt Only'}
            </button>

            <button
              onClick={handleGenerateReply}
              disabled={!inputMessage.trim() || isGenerating}
              className={`
                flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all shadow-lg
                ${(!inputMessage.trim() || isGenerating)
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Reply...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate AI Reply Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Output */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-medium text-zinc-200">Generated Reply</h3>
            </div>
            
            {generatedReply && (
              <button
                onClick={handleCopyReply}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                  ${replyCopied 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'}
                `}
              >
                {replyCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {replyCopied ? 'Copied Message!' : 'Copy Message Only'}
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 mb-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto custom-scrollbar">
            {!generatedReply && !isGenerating && !error && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-sm gap-3">
                <Wand2 className="w-8 h-8 opacity-20" />
                <p>Click "Generate AI Reply" to see the result here.</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="h-full flex flex-col items-center justify-center text-blue-500/70 text-sm gap-4">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="animate-pulse">Consulting the framework...</p>
              </div>
            )}

            {generatedReply && !isGenerating && (
              <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {generatedReply}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
