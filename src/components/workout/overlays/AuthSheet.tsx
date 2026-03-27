'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Mail, Loader2, CheckCircle2, LogOut, ArrowRight, X } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AuthSheetProps {
  onClose: () => void;
}

type Step = 'prompt' | 'email-input' | 'email-sent' | 'synced';

export function AuthSheet({ onClose }: AuthSheetProps) {
  const { user, isAnonymous, signInAnonymously, signInWithEmail, signOut } = useAuth();
  const [step, setStep] = useState<Step>(() => {
    if (user && !isAnonymous) return 'synced';
    if (user && isAnonymous) return 'email-input';
    return 'prompt';
  });
  const [email, setEmail] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnonymous = async () => {
    setIsWorking(true);
    setErrorMsg(null);
    const { error } = await signInAnonymously();
    setIsWorking(false);
    if (error) { setErrorMsg(error); return; }
    setStep('email-input');
  };

  const handleSendMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter a valid email address');
      return;
    }
    setIsWorking(true);
    setErrorMsg(null);
    const { error } = await signInWithEmail(email.trim());
    setIsWorking(false);
    if (error) { setErrorMsg(error); return; }
    setStep('email-sent');
  };

  const handleSignOut = async () => {
    await signOut();
    setStep('prompt');
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Cloud Sync">
      <div className="h-full px-4 pb-4 flex flex-col gap-4 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Prompt ──────────────────────────────────────────── */}
          {step === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-4 flex-1"
            >
              {/* Hero */}
              <div className="flex flex-col items-center gap-3 pt-4 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Cloud className="w-8 h-8 text-sky-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-black text-lg tracking-tight font-display">
                    Guarda tu progreso
                  </p>
                  <p className="text-white/40 text-sm font-medium leading-relaxed">
                    Accede a tu historial desde cualquier dispositivo, sin perder nada.
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-col gap-2">
                {[
                  ['☁️', 'Backup automático en la nube'],
                  ['📱', 'Sincroniza entre dispositivos'],
                  ['🔒', 'Datos cifrados con RLS'],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-2.5 px-3 py-2 glass-panel rounded-xl border-white/10">
                    <span className="text-base">{icon}</span>
                    <span className="text-white/60 text-[13px] font-medium">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex-1" />

              {errorMsg && <p className="text-red-400 text-xs font-medium text-center">{errorMsg}</p>}

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="glass-primary"
                  className="w-full h-12 text-sm font-black uppercase tracking-widest"
                  onClick={handleAnonymous}
                  disabled={isWorking}
                >
                  {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Cloud className="w-4 h-4 mr-2" />Continuar sin cuenta</>
                  )}
                </Button>
                <button
                  onClick={() => setStep('email-input')}
                  className="flex items-center justify-center gap-1.5 py-3 text-white/40 hover:text-white/60 text-[12px] font-black uppercase tracking-widest transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Usar email
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Email input ─────────────────────────────────────── */}
          {step === 'email-input' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-4 flex-1"
            >
              <div className="flex flex-col items-center gap-2 pt-4 text-center">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-indigo-400" />
                </div>
                <p className="text-white font-black text-base tracking-tight font-display">
                  {isAnonymous ? 'Añade tu email' : 'Entra con email'}
                </p>
                <p className="text-white/40 text-xs font-medium">
                  Te enviamos un magic link — sin contraseña
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
                  placeholder="tu@email.com"
                  className="w-full sunken-glass rounded-xl px-4 py-3.5 text-white text-sm font-medium placeholder:text-white/20 bg-transparent border-none outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                  autoFocus
                />
                {errorMsg && <p className="text-red-400 text-xs font-medium px-1">{errorMsg}</p>}
              </div>

              <div className="flex-1" />

              <div className="flex flex-col gap-2">
                <Button
                  variant="glass-primary"
                  className="w-full h-12 text-sm font-black uppercase tracking-widest"
                  onClick={handleSendMagicLink}
                  disabled={isWorking || !email.trim()}
                >
                  {isWorking
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><ArrowRight className="w-4 h-4 mr-2" />Enviar magic link</>
                  }
                </Button>
                {!isAnonymous && (
                  <button
                    onClick={() => setStep('prompt')}
                    className="py-2 text-white/30 hover:text-white/50 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Email sent ──────────────────────────────────────── */}
          {step === 'email-sent' && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center gap-4 flex-1 justify-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                <Mail className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-black text-xl tracking-tight font-display">¡Revisa tu email!</p>
                <p className="text-white/40 text-sm font-medium">
                  Enviamos un magic link a
                </p>
                <p className="text-white/70 text-sm font-bold">{email}</p>
              </div>
              <p className="text-white/25 text-xs font-medium mt-4">
                Haz click en el link del email para entrar. Puedes cerrar esto.
              </p>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white/50 hover:text-white text-[11px] uppercase tracking-widest"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </motion.div>
          )}

          {/* ── Step 4: Synced ──────────────────────────────────────────── */}
          {step === 'synced' && (
            <motion.div
              key="synced"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center gap-4 flex-1 justify-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.15)]">
                <CheckCircle2 className="w-10 h-10 text-sky-400" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-black text-xl tracking-tight font-display">☁️ Sincronizado</p>
                <p className="text-white/40 text-sm font-medium">
                  {user?.email ?? 'Cuenta anónima activa'}
                </p>
              </div>

              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium',
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sync activo
              </div>

              <div className="flex-1" />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 py-2 text-white/20 hover:text-red-400 text-[11px] font-black uppercase tracking-widest transition-colors"
              >
                <LogOut className="w-3 h-3" /> Cerrar sesión
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </Sheet>
  );
}
