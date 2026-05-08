'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, RotateCcw } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { buildUserContext } from '@/lib/coach/context-builder';
import { loadNutritionProfile } from '@/lib/db/nutritionProfile';
import { loadPendingAdjustment, type PendingAdjustment } from '@/lib/db/nutritionAdjustment';
import { loadAllBodyweight } from '@/lib/db/bodyweight';
import { loadFitnessProfile } from '@/lib/db/fitnessProfile';
import type { NutritionProfile } from '@/types/nutrition';
import type { FitnessProfile } from '@/types/fitness';
import type { BodyweightRecord } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n/LanguageProvider';

interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface CoachSheetProps {
  onClose: () => void;
}

export function CoachSheet({ onClose }: CoachSheetProps) {
  const { history, profile, nutritionGoal } = useWorkoutStore();
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile | null>(null);
  const [pendingAdjustment, setPendingAdjustment] = useState<PendingAdjustment | null>(null);
  const [bodyweight, setBodyweight] = useState<BodyweightRecord[]>([]);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadNutritionProfile().catch(() => null),
      loadPendingAdjustment().catch(() => null),
      loadAllBodyweight().catch(() => [] as BodyweightRecord[]),
      loadFitnessProfile().catch(() => null),
    ]).then(([np, pa, bw, fp]) => {
      if (cancelled) return;
      setNutritionProfile(np);
      setPendingAdjustment(pa);
      setBodyweight(bw);
      setFitnessProfile(fp);
    });
    return () => { cancelled = true; };
  }, []);

  const welcomeMessage = useMemo(() => {
    if (history.length === 0) {
      return t.coach.welcomeEmpty;
    }
    const last = history[0];
    const name = profile.displayName && profile.displayName !== 'Atleta'
      ? profile.displayName
      : '';
    if (!name) {
      return language === 'en'
        ? `Hi! Your last workout was **${last.sessionTitle}**. How can I help?`
        : `¡Hola! Tu último entreno fue **${last.sessionTitle}**. ¿En qué puedo ayudarte?`;
    }
    return t.coach.welcomeWithName
      .replace('{name}', name)
      .replace('{session}', last.sessionTitle);
  }, [history, language, profile, t.coach.welcomeEmpty, t.coach.welcomeWithName]);

  const suggestions = [
    t.coach.suggestion1,
    t.coach.suggestion2,
    t.coach.suggestion3,
    t.coach.suggestion4,
  ];

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isLoading || limitReached) return;

    const userMsg: CoachMessage = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);

    try {
      const ctx = buildUserContext({
        history,
        profile,
        nutritionGoal,
        nutritionProfile,
        pendingAdjustment,
        bodyweight,
        fitnessProfile,
      });
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          userContext: ctx,
        }),
      });

      if (res.status === 429) {
        setLimitReached(true);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t.coach.dailyLimit, isError: true },
        ]);
        return;
      }

      if (res.status === 503) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t.coach.unavailable, isError: true },
        ]);
        return;
      }

      const data = await res.json() as { reply?: string; error?: string };

      if (data.error || !data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error ?? t.coach.sendError, isError: true },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t.coach.connectionError, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Sheet onClose={onClose} title={t.coach.title}>
      <div className="h-full flex flex-col overflow-hidden px-4 pb-4">

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 -mr-1">

          {/* Welcome bubble */}
          <AssistantBubble content={welcomeMessage} />

          {/* Suggestions — only show before first message */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="flex flex-col gap-1.5 pt-1"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-3 py-2 rounded-xl glass-panel border-white/10 text-white/50 text-[12px] font-medium hover:text-white/80 hover:border-white/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}

          {/* Conversation */}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                {msg.role === 'user' ? (
                  <UserBubble content={msg.content} />
                ) : (
                  <AssistantBubble content={msg.content} isError={msg.isError} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Reset conversation */}
        {messages.length > 0 && !isLoading && (
          <button
            onClick={() => { setMessages([]); setLimitReached(false); }}
            className="flex items-center gap-1 self-center mb-2 text-white/20 hover:text-white/40 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            {t.coach.reset}
          </button>
        )}

        {/* Input row */}
        <div className="flex gap-2 items-end shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? t.coach.dailyLimit : t.coach.placeholder}
            disabled={isLoading || limitReached}
            rows={1}
            className={cn(
              'flex-1 sunken-glass rounded-xl px-3.5 py-3 text-white text-sm font-medium',
              'placeholder:text-white/20 bg-transparent border-none outline-none resize-none',
              'max-h-28 overflow-y-auto',
              (isLoading || limitReached) && 'opacity-40 cursor-not-allowed'
            )}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || limitReached}
            className="active-glass-btn h-11 w-11 p-0 rounded-xl shrink-0"
            aria-label={language === 'en' ? 'Send message' : 'Enviar mensaje'}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// ── Bubble sub-components ─────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-indigo-500/25 border border-indigo-500/20 text-white text-sm font-medium leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content, isError }: { content: string; isError?: boolean }) {
  // Simple markdown-like formatting: **bold**, line breaks
  const formatted = content
    .split('\n')
    .map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {i > 0 && <br />}
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="font-black text-white">{part.slice(2, -2)}</strong>
              : <span key={j}>{part}</span>
          )}
        </span>
      );
    });

  return (
    <div className="flex items-start gap-2">
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isError
          ? 'bg-red-500/20 border border-red-500/30'
          : 'bg-indigo-500/20 border border-indigo-500/30'
      )}>
        <Bot className={cn('w-3.5 h-3.5', isError ? 'text-red-400' : 'text-indigo-400')} />
      </div>
      <div className={cn(
        'max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed',
        isError
          ? 'glass-panel border-red-500/20 text-red-300'
          : 'glass-panel border-white/10 text-white/80'
      )}>
        {formatted}
      </div>
    </div>
  );
}
