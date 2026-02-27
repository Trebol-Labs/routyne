'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, Loader2, Sparkles, Code, Info } from 'lucide-react';
import { parseRoutine } from '@/lib/markdown/parser';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RoutineUploader() {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const { setCurrentRoutine, isLoading, setIsLoading } = useWorkoutStore();

  const handleParse = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      const routine = parseRoutine(content);
      setCurrentRoutine(routine);
    } catch (error) {
      console.error('Failed to parse routine:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentRoutine, setIsLoading]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.md') || file.type === 'text/markdown')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
        handleParse(content);
      };
      reader.readAsText(file);
    }
  }, [handleParse]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 p-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2 w-full flex flex-col items-center"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full glass-border-light shadow-2xl"
        >
          <Code className="w-4 h-4 text-blue-400" />
          <span className="text-[12px] font-black text-white/90 uppercase tracking-[0.25em]">Markdown Parser</span>
        </motion.div>
        
        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-liquid leading-tight text-center">
          IMPORT <span className="text-blue-500 brightness-125">ROUTINE</span>
        </h1>
        <p className="text-white/40 font-medium text-sm tracking-tight max-w-xs mx-auto">Paste your raw markdown. We handle the rest.</p>
      </motion.div>

      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "rounded-[3rem] p-1.5 w-full",
          isDragging 
            ? "scale-[1.03] rotate-1" 
            : "hover:scale-[1.01]"
        )}
      >
        {/* Main Glass Hero Panel */}
        <div className="relative glass-panel rounded-[2.8rem] p-6 sm:p-10 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />
          
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col items-center justify-center py-20 space-y-8"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 blur-[40px] rounded-full animate-pulse" />
                  <Loader2 className="w-20 h-20 text-white animate-[spin_2s_linear_infinite]" />
                </div>
                <div className="text-center space-y-3">
                  <p className="text-white font-black text-2xl tracking-tighter">Syncing Structure...</p>
                  <p className="text-blue-400/60 text-xs font-black uppercase tracking-[0.3em]">Processing Nodes</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                <div className="relative group/input">
                  <div className="absolute -inset-px bg-white/5 rounded-3xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="# Push Day&#10;## Bench Press&#10;- 3x12&#10;- Rest: 90s"
                    className="w-full h-48 sm:h-64 bg-black/30 backdrop-blur-md rounded-3xl p-6 border border-white/5 focus:ring-0 text-white placeholder:text-white/10 resize-none font-mono text-lg leading-relaxed selection:bg-blue-500/40 sunken-glass"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 w-full">
                  <label className="flex items-center gap-4 px-8 py-5 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/[0.05] shadow-inner cursor-pointer hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
                    <Upload className="w-5 h-5 text-blue-400" />
                    <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] leading-none whitespace-nowrap">Drop or Select .md</span>
                    <input 
                      type="file" 
                      accept=".md,text/markdown" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setText(content);
                            handleParse(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                  
                  <Button
                    onClick={() => handleParse(text)}
                    disabled={!text.trim() || isLoading}
                    className="w-full sm:w-auto rounded-[2rem] active-glass-btn text-white font-black px-12 py-8 h-auto text-xl transition-all active:scale-95 group relative overflow-hidden flex items-center justify-center"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 whitespace-nowrap">GENERATE WORKOUT</span>
                    <Sparkles className="w-6 h-6 ml-4 relative z-10 group-hover:rotate-12 transition-transform shrink-0" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[3rem] bg-blue-500/20 backdrop-blur-2xl border-2 border-white/30 pointer-events-none">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)]">
                <Upload className="w-12 h-12 text-blue-600" />
              </div>
              <span className="text-white font-black text-3xl tracking-tighter">GENERATE</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: Check, color: "text-emerald-400", label: "AUTO-PARSE" },
          { icon: Sparkles, color: "text-blue-400", label: "DYNAMIC MEDIA" },
          { icon: Info, color: "text-indigo-400", label: "LIQUID FLOW" }
        ].map((item, i) => (
          <div key={i} className="group p-6 rounded-[2.5rem] glass-panel border border-white/5 hover:border-white/20 transition-all duration-500 flex flex-col items-center gap-4 text-center hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-white/10 transition-all">
              <item.icon className={cn("w-7 h-7", item.color)} />
            </div>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
