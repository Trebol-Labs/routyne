'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Download,
  Flame,
  HardDrive,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  exportAllData,
  downloadExportFile,
  importAllData,
  type ExportFile,
} from '@/lib/db/export';
import type {
  HistoryEntry,
  AccentColor,
  CoachTone,
  EffortTrackingMode,
  ExperienceLevel,
  MotionLevel,
  TrainingGoal,
  UiDensity,
} from '@/types/workout';

export type AccountSheetSection = 'profile' | 'sync' | 'training' | 'appearance' | 'data';

interface AccountSheetProps {
  onClose: () => void;
  initialSection?: AccountSheetSection;
}

const TRAINING_GOALS: Array<{ value: TrainingGoal; label: string }> = [
  { value: 'strength', label: 'Fuerza' },
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'general', label: 'General' },
  { value: 'endurance', label: 'Resistencia' },
];

const EXPERIENCE_LEVELS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

const WEEK_STARTS: Array<{ value: 0 | 1; label: string }> = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
];

const EFFORT_TRACKING: Array<{ value: EffortTrackingMode; label: string }> = [
  { value: 'off', label: 'Sin seguimiento' },
  { value: 'rpe', label: 'RPE' },
  { value: 'rir', label: 'RIR' },
  { value: 'both', label: 'Ambos' },
];

const COACH_TONES: Array<{ value: CoachTone; label: string }> = [
  { value: 'direct', label: 'Directo' },
  { value: 'supportive', label: 'Cercano' },
  { value: 'technical', label: 'Técnico' },
];

const ACCENTS: Array<{ value: AccentColor; label: string; className: string }> = [
  { value: 'blue', label: 'Azul', className: 'bg-sky-400' },
  { value: 'emerald', label: 'Esmeralda', className: 'bg-emerald-400' },
  { value: 'orange', label: 'Naranja', className: 'bg-orange-400' },
  { value: 'violet', label: 'Violeta', className: 'bg-violet-400' },
  { value: 'mono', label: 'Mono', className: 'bg-white/60' },
];

const DENSITIES: Array<{ value: UiDensity; label: string }> = [
  { value: 'comfortable', label: 'Cómodo' },
  { value: 'compact', label: 'Compacto' },
];

const MOTION_LEVELS: Array<{ value: MotionLevel; label: string }> = [
  { value: 'system', label: 'Sistema' },
  { value: 'reduced', label: 'Reducido' },
  { value: 'full', label: 'Completo' },
];

const DEFAULT_REST_PRESETS = [60, 90, 120, 150];
const DAY_OPTIONS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
];

function computeStreak(history: HistoryEntry[], restDays: number[]): number {
  const workoutDays = new Set(history.map((e) => new Date(e.completedAt).toDateString()));
  const isFulfilled = (d: Date) => workoutDays.has(d.toDateString()) || restDays.includes(d.getDay());
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const startDate = isFulfilled(today) ? new Date(today) : isFulfilled(yesterday) ? new Date(yesterday) : null;
  if (!startDate) return 0;
  let streak = 0;
  const check = new Date(startDate);
  while (isFulfilled(check)) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExportFile(value: unknown): value is ExportFile {
  if (!isObject(value) || !isObject(value.data)) return false;
  return (
    typeof value.formatVersion === 'number' &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.data.routines) &&
    Array.isArray(value.data.sessions) &&
    Array.isArray(value.data.exercises) &&
    Array.isArray(value.data.history) &&
    (Array.isArray(value.data.bodyweight) || value.data.bodyweight === undefined) &&
    (value.data.profile === null || isObject(value.data.profile))
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function AccountSheet({ onClose, initialSection = 'profile' }: AccountSheetProps) {
  const {
    profile,
    updateProfile,
    history,
    hydrate,
  } = useWorkoutStore();
  const { user, isAnonymous, isLoading: authLoading, signInAnonymously, signInWithEmail, signOut } = useAuth();
  const { status: syncStatus, pendingCount, lastSyncAt, lastError, syncNow } = useSync(user?.id);
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [authMode, setAuthMode] = useState<'setup' | 'email' | 'sent'>('setup');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabaseEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sectionRefs = useRef<Record<AccountSheetSection, HTMLElement | null>>({
    profile: null,
    sync: null,
    training: null,
    appearance: null,
    data: null,
  });

  useEffect(() => {
    navigator.storage?.persisted?.().then(setIsPersisted).catch(() => {});
  }, []);

  useEffect(() => {
    sectionRefs.current[initialSection]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [initialSection]);

  useEffect(() => {
    if (!user) {
      setAuthMode('setup');
      return;
    }
    if (!isAnonymous) {
      setAuthMode('setup');
    }
  }, [isAnonymous, user]);

  const totalSessions = history.length;
  const totalVolume = history.reduce((sum, entry) => sum + entry.totalVolume, 0);
  const streak = computeStreak(history, profile.restDays ?? []);
  const restDaySet = new Set(profile.restDays ?? []);

  const weekDayOptions = useMemo(
    () => (
      profile.preferences.weekStartsOn === 1
        ? [1, 2, 3, 4, 5, 6, 0]
        : [0, 1, 2, 3, 4, 5, 6]
    ),
    [profile.preferences.weekStartsOn]
  );
  const trainingGoalLabel = TRAINING_GOALS.find((option) => option.value === profile.preferences.trainingGoal)?.label ?? 'Fuerza';

  const syncStateLabel = (() => {
    if (!supabaseEnabled) return 'Sincronización no configurada';
    if (authLoading) return 'Comprobando cuenta...';
    if (!user) return 'Sin cuenta conectada';
    if (syncStatus === 'syncing') return 'Sincronizando...';
    if (syncStatus === 'offline') return 'Sin conexión';
    if (syncStatus === 'error') return 'Error de sincronización';
    if (isAnonymous) return 'Cuenta anónima activa';
    return 'Sincronización activa';
  })();

  const syncStateDetail = (() => {
    if (!supabaseEnabled) return 'Faltan las variables de Supabase para activar la sincronización.';
    if (!user) return 'Inicia sesión para activar la sincronización entre dispositivos.';
    if (isAnonymous) return 'Puedes añadir email para conservar el acceso en otros dispositivos.';
    return user.email ?? 'Cuenta sin email visible';
  })();

  const handleExport = async () => {
    setIsExporting(true);
    setBackupStatus(null);
    try {
      const data = await exportAllData();
      downloadExportFile(data);
      setBackupStatus('Copia exportada');
    } catch (err) {
      console.error('[AccountSheet] export failed', err);
      setBackupStatus('No se pudo exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupStatus(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isExportFile(parsed)) {
        throw new Error('El archivo de copia de Routyne no es válido');
      }

      await importAllData(parsed);
      await hydrate();
      setBackupStatus('Copia importada');
    } catch (err) {
      console.error('[AccountSheet] import failed', err);
      setBackupStatus('No se pudo importar');
    } finally {
      input.value = '';
      setIsImporting(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      setAccountMessage('Escribe un email válido.');
      return;
    }

    setAccountMessage(null);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setAccountMessage(error);
      return;
    }

    setAuthMode('sent');
  };

  const accountActionDisabled = authLoading || syncStatus === 'syncing';

  return (
    <Sheet onClose={onClose} title="Cuenta y personalización">
      <div className="h-full overflow-y-auto px-4 pb-6">
        <div className="space-y-4">
          {/* Profile */}
          <motion.section
            ref={(node) => { sectionRefs.current.profile = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl">
                {profile.avatarEmoji}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    Perfil
                  </p>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => updateProfile({ displayName: e.target.value })}
                    className="sunken-glass w-full rounded-2xl border-none bg-transparent px-3 py-3 text-lg font-black text-white outline-none placeholder:text-white/18"
                    placeholder="Atleta"
                    maxLength={24}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                    {user ? (isAnonymous ? 'Cuenta anónima' : (user.email ?? 'Conectado')) : 'Sin cuenta'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                    {trainingGoalLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-xl font-black text-sky-300 font-display leading-none">
                  {totalSessions.toLocaleString()}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-white/35">Sesiones</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-xl font-black text-indigo-300 font-display leading-none">
                  {totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : '—'}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-white/35">
                  {profile.weightUnit}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                <p className="flex items-center justify-center gap-1 text-xl font-black text-emerald-300 font-display leading-none">
                  {streak}
                  <Flame className="h-4 w-4" />
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-white/35">Racha</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Avatar
              </p>
              <EmojiPicker
                value={profile.avatarEmoji}
                onChange={(emoji) => updateProfile({ avatarEmoji: emoji })}
              />
            </div>
          </motion.section>

          {/* Account & Sync */}
          <motion.section
            ref={(node) => { sectionRefs.current.sync = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel overflow-hidden rounded-3xl border-white/10 p-4 sm:p-5"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.22),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(99,102,241,0.16),transparent_32%)]" />

            <div className="relative space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    Cuenta y sincronización
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/45">
                    {syncStateLabel}
                  </p>
                </div>
                <span
                  className={cn(
                    'w-fit rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]',
                    syncStatus === 'synced'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                      : syncStatus === 'syncing'
                        ? 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                        : syncStatus === 'offline'
                          ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                          : syncStatus === 'error'
                            ? 'border-red-400/20 bg-red-500/10 text-red-300'
                            : 'border-white/10 bg-white/[0.04] text-white/45',
                  )}
                >
                  {pendingCount > 0 ? `${pendingCount} pendientes` : '0 pendientes'}
                </span>
              </div>

              {lastError && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-200">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/80">
                      La sincronización necesita atención
                    </p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-red-100/80">
                      {lastError}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-[1.75rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(59,130,246,0.08)_48%,rgba(255,255,255,0.04))] p-3 shadow-[0_18px_60px_-35px_rgba(56,189,248,0.95)] sm:p-4">
                {!supabaseEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
                        <LockKeyhole className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-50/75">
                          Login no disponible
                        </p>
                        <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                          Falta configurar Supabase
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-amber-50/78">
                      Esta build no tiene las variables necesarias para mostrar el inicio de sesión y sincronizar entre dispositivos.
                    </p>
                  </div>
                ) : !user ? (
                  <div className="space-y-3">
                    {authMode === 'email' ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sky-100">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/60">
                              Entrar con email
                            </p>
                            <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                              Recibe un enlace mágico
                            </p>
                          </div>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="sunken-glass w-full rounded-2xl border-none bg-transparent px-4 py-3.5 text-sm font-medium text-white outline-none placeholder:text-white/20"
                          autoComplete="email"
                          inputMode="email"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            variant="glass-primary"
                            className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                            onClick={handleSaveEmail}
                            disabled={accountActionDisabled || !email.trim()}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar enlace
                          </Button>
                          <button
                            type="button"
                            onClick={() => setAuthMode('setup')}
                            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/60 transition-colors hover:text-white"
                          >
                            Volver
                          </button>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-white/45">
                          Te enviaremos un enlace seguro. No necesitas contraseña.
                        </p>
                      </div>
                    ) : authMode === 'sent' ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/15 text-emerald-100">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/65">
                              Enlace enviado
                            </p>
                            <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                              Revisa tu correo
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-white/55">
                          Abre el enlace que enviamos a {email.trim() || 'tu email'} para completar el inicio de sesión.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAuthMode('email')}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white"
                        >
                          Usar otro email
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
                            <LockKeyhole className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/60">
                              Login destacado
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-white font-display sm:text-3xl">
                              Entra y lleva tu rutina contigo
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 sm:grid-cols-3">
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Sync cloud</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Magic link</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Sin password</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            variant="glass-primary"
                            className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_18px_40px_-18px_rgba(56,189,248,0.9)]"
                            onClick={() => setAuthMode('email')}
                            disabled={accountActionDisabled}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Entrar con email
                          </Button>
                          <button
                            type="button"
                            onClick={async () => {
                              setAccountMessage(null);
                              const { error } = await signInAnonymously();
                              if (error) {
                                setAccountMessage(error);
                                return;
                              }
                              setAuthMode('email');
                            }}
                            className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-3 text-[11px] font-black uppercase tracking-widest text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                            disabled={accountActionDisabled}
                          >
                            <UserRound className="mr-2 inline h-4 w-4" />
                            Probar anónimo
                          </button>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-white/45">
                          Tus datos actuales se quedan en este dispositivo hasta que conectes una cuenta.
                        </p>
                      </div>
                    )}
                  </div>
                ) : isAnonymous ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sky-100">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/60">
                          Cuenta anónima activa
                        </p>
                        <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                          Añade email para no perder acceso
                        </p>
                      </div>
                    </div>

                    {authMode === 'email' ? (
                      <div className="space-y-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="sunken-glass w-full rounded-2xl border-none bg-transparent px-4 py-3.5 text-sm font-medium text-white outline-none placeholder:text-white/20"
                          autoComplete="email"
                          inputMode="email"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            variant="glass-primary"
                            className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                            onClick={handleSaveEmail}
                            disabled={accountActionDisabled || !email.trim()}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Añadir email
                          </Button>
                          <button
                            type="button"
                            onClick={() => setAuthMode('setup')}
                            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/60 transition-colors hover:text-white"
                          >
                            Volver
                          </button>
                        </div>
                      </div>
                    ) : authMode === 'sent' ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/12 p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                            <p className="text-sm font-medium leading-relaxed text-emerald-50/80">
                              Enviamos el enlace a {email.trim() || 'tu email'}. Ábrelo para convertir esta cuenta anónima en una cuenta recuperable.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAuthMode('email')}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white"
                        >
                          Usar otro email
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          variant="glass-primary"
                          className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                          onClick={() => setAuthMode('email')}
                          disabled={accountActionDisabled}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Añadir email
                        </Button>
                        <button
                          type="button"
                          onClick={syncNow}
                          disabled={accountActionDisabled}
                          className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white disabled:opacity-50"
                        >
                          <RefreshCw className="mr-2 inline h-4 w-4" />
                          Sincronizar
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/15 text-emerald-100">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/65">
                          Sesión iniciada
                        </p>
                        <p className="mt-1 break-words text-xl font-black leading-none text-white font-display sm:text-2xl">
                          {user.email ?? 'Cuenta conectada'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="glass-primary"
                        className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                        onClick={syncNow}
                        disabled={accountActionDisabled}
                      >
                        {syncStatus === 'syncing' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sincronizar ahora
                      </Button>
                      <button
                        type="button"
                        onClick={async () => {
                          await signOut();
                          onClose();
                        }}
                        className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-red-300"
                      >
                        <LogOut className="mr-2 inline h-4 w-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}

                {!user && supabaseEnabled && (
                  <p className="mt-3 text-[10px] font-medium leading-relaxed text-white/35">
                    La sincronización se activa al entrar con una cuenta. Mientras tanto, todo sigue guardado localmente.
                  </p>
                )}
              </div>

              {accountMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-medium leading-relaxed text-amber-50/80"
                >
                  {accountMessage}
                </p>
              )}

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  Estado
                </p>
                <p className="mt-1 text-sm font-medium text-white/45">
                  {syncStateDetail}
                </p>
                {lastSyncAt && (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/28">
                    Última sincronización: {formatDateTime(lastSyncAt)}
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          {/* Training preferences */}
          <motion.section
            ref={(node) => { sectionRefs.current.training = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Preferencias de entrenamiento
              </p>
              <p className="mt-1 text-sm font-medium text-white/45">
                Ajustan descansos, calendario, registro de esfuerzo y el contexto del coach.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  Objetivo
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TRAINING_GOALS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateProfile({ preferences: { trainingGoal: option.value } })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        profile.preferences.trainingGoal === option.value
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  Experiencia
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {EXPERIENCE_LEVELS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateProfile({ preferences: { experienceLevel: option.value } })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        profile.preferences.experienceLevel === option.value
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Semana
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {WEEK_STARTS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateProfile({ preferences: { weekStartsOn: option.value } })}
                        className={cn(
                          'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                          profile.preferences.weekStartsOn === option.value
                            ? 'active-glass-btn text-white'
                            : 'sunken-glass text-white/45 hover:text-white/70',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Seguimiento
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {EFFORT_TRACKING.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateProfile({ preferences: { effortTracking: option.value } })}
                        className={cn(
                          'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                          profile.preferences.effortTracking === option.value
                            ? 'active-glass-btn text-white'
                            : 'sunken-glass text-white/45 hover:text-white/70',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  Entrenador
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {COACH_TONES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateProfile({ preferences: { coachTone: option.value } })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        profile.preferences.coachTone === option.value
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  Días de descanso
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {weekDayOptions.map((value) => {
                    const isSelected = restDaySet.has(value);
                    const label = DAY_OPTIONS.find((day) => day.value === value)?.label ?? '?';
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const current = profile.restDays ?? [];
                          updateProfile({
                            restDays: current.includes(value)
                              ? current.filter((day) => day !== value)
                              : [...current, value],
                          });
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          'min-h-11 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all',
                          isSelected
                            ? 'bg-violet-500/25 border-violet-400/30 text-violet-200'
                            : 'sunken-glass text-white/40 hover:text-white/70',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Descanso predeterminado
                  </p>
                  <span className="text-xs font-black text-white/55">
                    {profile.defaultRestSeconds}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateProfile({ defaultRestSeconds: Math.max(30, profile.defaultRestSeconds - 15) })}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="Reducir el descanso 15 segundos"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={30}
                    max={600}
                    step={5}
                    value={profile.defaultRestSeconds}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      updateProfile({ defaultRestSeconds: Math.min(600, Math.max(30, Math.round(next))) });
                    }}
                    className="sunken-glass min-h-11 flex-1 rounded-2xl border-none bg-transparent px-3 py-2 text-center text-lg font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateProfile({ defaultRestSeconds: Math.min(600, profile.defaultRestSeconds + 15) })}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="Aumentar el descanso 15 segundos"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {DEFAULT_REST_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateProfile({ defaultRestSeconds: value })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        profile.defaultRestSeconds === value
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      {value}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Appearance */}
          <motion.section
            ref={(node) => { sectionRefs.current.appearance = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Apariencia
              </p>
              <p className="mt-1 text-sm font-medium text-white/45">
                Ajusta acento, densidad y movimiento sin tocar la estética líquida.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                Color de acento
              </p>
              <div className="grid grid-cols-5 gap-2">
                {ACCENTS.map((option) => {
                  const selected = profile.preferences.accentColor === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateProfile({ preferences: { accentColor: option.value } })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-2 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        selected
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      <span className={cn('mx-auto mb-1.5 block h-2.5 w-2.5 rounded-full', option.className)} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  Densidad
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DENSITIES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateProfile({ preferences: { uiDensity: option.value } })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        profile.preferences.uiDensity === option.value
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  Movimiento
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {MOTION_LEVELS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateProfile({ preferences: { motionLevel: option.value } })}
                      className={cn(
                        'min-h-11 rounded-2xl border px-2 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        profile.preferences.motionLevel === option.value
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Data & Backup */}
          <motion.section
            ref={(node) => { sectionRefs.current.data = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Datos y copia
              </p>
              <p className="mt-1 text-sm font-medium text-white/45">
                Exporta o importa tus datos locales cuando quieras mover el historial o conservar una copia.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-start gap-2">
                <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    Persistencia
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/45">
                    {isPersisted === null
                      ? 'Comprobando...'
                      : isPersisted
                        ? 'El navegador puede conservar el almacenamiento local.'
                        : 'El navegador no confirmó almacenamiento persistente.'}
                  </p>
                </div>
                <ShieldCheck className={cn('mt-0.5 h-4 w-4 shrink-0', isPersisted ? 'text-emerald-300' : 'text-amber-300')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="glass-primary"
                className="h-11 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                onClick={handleExport}
                disabled={isExporting || isImporting}
              >
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar
              </Button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/55 transition-colors hover:text-white"
                disabled={isExporting || isImporting}
              >
                {isImporting ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Upload className="mr-2 inline h-4 w-4" />}
                Importar
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />

            <p className="text-[10px] font-medium leading-relaxed text-white/30">
              La copia incluye rutinas, historial, peso corporal y perfil.
            </p>

            <AnimatePresence>
              {backupStatus && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45"
                >
                  {backupStatus}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </div>
    </Sheet>
  );
}
