'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Download,
  Flame,
  HardDrive,
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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { cn } from '@/lib/utils';
import {
  exportAllData,
  downloadExportFile,
  importAllData,
  type ExportFile,
} from '@/lib/db/export';
import type {
  AccentColor,
  AppLanguage,
  CoachTone,
  EffortTrackingMode,
  HistoryEntry,
  TrainingGoal,
  UserProfilePreferences,
} from '@/types/workout';

export type AccountSheetSection =
  | 'profile'
  | 'sync'
  | 'training'
  | 'appearance'
  | 'notifications'
  | 'data';

interface AccountSheetProps {
  onClose: () => void;
  initialSection?: AccountSheetSection;
}

const TRAINING_GOALS: Array<{ value: TrainingGoal; labelEs: string; labelEn: string }> = [
  { value: 'strength', labelEs: 'Fuerza', labelEn: 'Strength' },
  { value: 'hypertrophy', labelEs: 'Hipertrofia', labelEn: 'Hypertrophy' },
  { value: 'general', labelEs: 'General', labelEn: 'General' },
  { value: 'endurance', labelEs: 'Resistencia', labelEn: 'Endurance' },
];

const WEEK_STARTS: Array<{ value: 0 | 1; labelEs: string; labelEn: string }> = [
  { value: 0, labelEs: 'Domingo', labelEn: 'Sunday' },
  { value: 1, labelEs: 'Lunes', labelEn: 'Monday' },
];

const EFFORT_TRACKING: Array<{ value: EffortTrackingMode; labelEs: string; labelEn: string }> = [
  { value: 'off', labelEs: 'Sin seguimiento', labelEn: 'Off' },
  { value: 'rpe', labelEs: 'RPE', labelEn: 'RPE' },
  { value: 'rir', labelEs: 'RIR', labelEn: 'RIR' },
  { value: 'both', labelEs: 'Ambos', labelEn: 'Both' },
];

const COACH_TONES: Array<{ value: CoachTone; labelEs: string; labelEn: string }> = [
  { value: 'direct', labelEs: 'Directo', labelEn: 'Direct' },
  { value: 'supportive', labelEs: 'Cercano', labelEn: 'Supportive' },
  { value: 'technical', labelEs: 'Técnico', labelEn: 'Technical' },
];

const ACCENTS: Array<{ value: AccentColor; label: string; className: string }> = [
  { value: 'blue', label: 'Azul', className: 'bg-sky-400' },
  { value: 'emerald', label: 'Esmeralda', className: 'bg-emerald-400' },
  { value: 'orange', label: 'Naranja', className: 'bg-orange-400' },
  { value: 'violet', label: 'Violeta', className: 'bg-violet-400' },
  { value: 'mono', label: 'Mono', className: 'bg-white/60' },
];

const AVATAR_PRESETS = ['💪', '🏋️', '🔥', '⚡', '🎯', '🦾', '🏃', '🥊'];
const DEFAULT_REST_PRESETS = [60, 90, 120, 150];
const DAY_OPTIONS = [
  { value: 0, labelEs: 'D', labelEn: 'S' },
  { value: 1, labelEs: 'L', labelEn: 'M' },
  { value: 2, labelEs: 'M', labelEn: 'T' },
  { value: 3, labelEs: 'X', labelEn: 'W' },
  { value: 4, labelEs: 'J', labelEn: 'T' },
  { value: 5, labelEs: 'V', labelEn: 'F' },
  { value: 6, labelEs: 'S', labelEn: 'S' },
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
    streak += 1;
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

function formatDateTime(value: string | null, language: AppLanguage): string {
  if (!value) return language === 'en' ? 'Never' : 'Nunca';
  return new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatTimezoneLabel(timezone: string): string {
  return timezone || 'UTC';
}

function PreferenceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
        active ? 'active-glass-btn text-white' : 'sunken-glass text-white/45 hover:text-white/70',
      )}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
        {eyebrow}
      </p>
      <p className="mt-1 text-sm font-medium text-white/45">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs font-medium leading-relaxed text-white/30">
          {description}
        </p>
      )}
    </div>
  );
}

export function AccountSheet({ onClose, initialSection = 'profile' }: AccountSheetProps) {
  const {
    profile,
    updateProfile,
    history,
    hydrate,
  } = useWorkoutStore();
  const { user, session, isAnonymous, isLoading: authLoading, signInAnonymously, signInWithEmail, signOut } = useAuth();
  const { status: syncStatus, pendingCount, lastSyncAt, lastError, syncNow } = useSync(user?.id);
  const { language, setLanguage, t } = useI18n();
  const push = usePushNotifications(session?.access_token);

  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [authMode, setAuthMode] = useState<'setup' | 'email' | 'sent'>('setup');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseLocalBackup = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_LOCAL_BACKUP_TOOLS === 'true';
  const supabaseEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accountActionDisabled = authLoading || syncStatus === 'syncing';
  const sectionRefs = useRef<Record<AccountSheetSection, HTMLElement | null>>({
    profile: null,
    sync: null,
    training: null,
    appearance: null,
    notifications: null,
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
    }
  }, [user]);

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

  const pushStateLabel = (() => {
    if (push.state === 'active') return t.account.pushStateOn;
    if (push.state === 'denied') return t.account.pushStateDenied;
    if (push.state === 'unsupported') return t.account.pushStateUnsupported;
    return t.account.pushStateOff;
  })();

  const pushPermissionLabel = (() => {
    if (push.permission === 'granted') return language === 'en' ? 'Granted' : 'Concedido';
    if (push.permission === 'denied') return language === 'en' ? 'Denied' : 'Denegado';
    if (push.permission === 'unsupported') return language === 'en' ? 'Unsupported' : 'No compatible';
    return language === 'en' ? 'Default' : 'Predeterminado';
  })();

  const syncStateLabel = (() => {
    if (!supabaseEnabled) return t.account.syncPaused;
    if (authLoading) return language === 'en' ? 'Checking account...' : 'Comprobando cuenta...';
    if (!user) return t.account.signedOut;
    if (syncStatus === 'syncing') return language === 'en' ? 'Syncing...' : 'Sincronizando...';
    if (syncStatus === 'offline') return language === 'en' ? 'Offline' : 'Sin conexión';
    if (syncStatus === 'error') return language === 'en' ? 'Sync error' : 'Error de sincronización';
    if (isAnonymous) return t.account.syncAnonymous;
    return t.account.syncActive;
  })();

  const syncStateDetail = (() => {
    if (!supabaseEnabled) return language === 'en'
      ? 'Supabase variables are missing, so sync is disabled.'
      : 'Faltan variables de Supabase, así que la sincronización está desactivada.';
    if (!user) return language === 'en'
      ? 'Sign in to sync across devices.'
      : 'Inicia sesión para sincronizar entre dispositivos.';
    if (isAnonymous) return language === 'en'
      ? 'Add an email to make this account recoverable.'
      : 'Añade un email para volver recuperable esta cuenta.';
    return user.email ?? (language === 'en' ? 'Connected account' : 'Cuenta conectada');
  })();

  const updatePreferences = (patch: Partial<UserProfilePreferences>) => {
    if (patch.language) {
      setLanguage(patch.language);
    }
    updateProfile({ preferences: patch });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setBackupStatus(null);
    try {
      const data = await exportAllData();
      downloadExportFile(data);
      setBackupStatus(t.account.exportReady);
    } catch (err) {
      console.error('[AccountSheet] export failed', err);
      setBackupStatus(language === 'en' ? 'Could not export backup.' : 'No se pudo exportar la copia.');
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
        throw new Error(language === 'en'
          ? 'The Routyne backup file is invalid.'
          : 'El archivo de copia de Routyne no es válido.');
      }

      await importAllData(parsed);
      await hydrate();
      setBackupStatus(t.account.restored);
    } catch (err) {
      console.error('[AccountSheet] import failed', err);
      setBackupStatus(language === 'en' ? 'Could not import backup.' : 'No se pudo importar la copia.');
    } finally {
      input.value = '';
      setIsImporting(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      setAccountMessage(language === 'en' ? 'Enter a valid email.' : 'Escribe un email válido.');
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

  const toggleReducedMotion = () => {
    const next = !profile.preferences.reducedMotion;
    updatePreferences({
      reducedMotion: next,
      motionLevel: next ? 'reduced' : 'system',
    });
  };

  const setTimezoneToDevice = () => {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTimezone) {
      updatePreferences({ timezone: deviceTimezone });
    }
  };

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || profile.preferences.timezone;
  return (
    <Sheet onClose={onClose} title={t.account.title}>
      <div className="h-full overflow-y-auto px-4 pb-6">
        <div className="space-y-4">
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
                    {t.account.profile}
                  </p>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => updateProfile({ displayName: e.target.value })}
                    className="sunken-glass w-full rounded-2xl border-none bg-transparent px-3 py-3 text-lg font-black text-white outline-none placeholder:text-white/18"
                    placeholder={language === 'en' ? 'Athlete' : 'Atleta'}
                    maxLength={24}
                  />
                </div>
                <p className="text-xs font-medium leading-relaxed text-white/35">
                  {user
                    ? (isAnonymous ? t.account.anonymous : (user.email ?? t.account.connected))
                    : t.account.signedOut}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-xl font-black text-sky-300 font-display leading-none">
                  {totalSessions.toLocaleString()}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-white/35">
                  {language === 'en' ? 'Sessions' : 'Sesiones'}
                </p>
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
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-white/35">
                  {t.stats.streak}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  {t.account.avatar}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker((current) => !current)}
                  className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35 hover:text-white/60 transition-colors"
                >
                  {showAvatarPicker
                    ? (language === 'en' ? 'Compact' : 'Compacto')
                    : (language === 'en' ? 'More' : 'Más')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateProfile({ avatarEmoji: emoji })}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl border text-2xl transition-all',
                      profile.avatarEmoji === emoji
                        ? 'active-glass-btn scale-105'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]',
                    )}
                    aria-label={`Select ${emoji}`}
                    aria-pressed={profile.avatarEmoji === emoji}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/45 hover:text-white/70"
                  aria-label={language === 'en' ? 'Expand avatar picker' : 'Expandir selector de avatar'}
                >
                  {showAvatarPicker ? '−' : '+'}
                </button>
              </div>
              <AnimatePresence>
                {showAvatarPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <EmojiPicker
                      value={profile.avatarEmoji}
                      onChange={(emoji) => updateProfile({ avatarEmoji: emoji })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          <motion.section
            ref={(node) => { sectionRefs.current.sync = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel overflow-hidden rounded-3xl border-white/10 p-4 sm:p-5"
          >
            <div className="relative space-y-4">
              <SectionTitle
                eyebrow={t.account.sync}
                title={syncStateLabel}
                description={syncStateDetail}
              />

              <div className="flex flex-wrap items-center gap-2">
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
                  {pendingCount > 0
                    ? `${pendingCount} ${language === 'en' ? 'pending' : 'pendientes'}`
                    : `0 ${language === 'en' ? 'pending' : 'pendientes'}`}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                  {formatDateTime(lastSyncAt, language)}
                </span>
              </div>

              {lastError && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-200">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/80">
                      {language === 'en' ? 'Sync needs attention' : 'La sincronización necesita atención'}
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
                          {language === 'en' ? 'Login unavailable' : 'Login no disponible'}
                        </p>
                        <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                          {language === 'en' ? 'Supabase is not configured' : 'Falta configurar Supabase'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-amber-50/78">
                      {language === 'en'
                        ? 'This build cannot sync between devices yet.'
                        : 'Esta build no puede sincronizar entre dispositivos todavía.'}
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
                              {language === 'en' ? 'Sign in with email' : 'Entrar con email'}
                            </p>
                            <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                              {language === 'en' ? 'Receive a magic link' : 'Recibe un enlace mágico'}
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
                            {language === 'en' ? 'Send link' : 'Enviar enlace'}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setAuthMode('setup')}
                            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/60 transition-colors hover:text-white"
                          >
                            {language === 'en' ? 'Back' : 'Volver'}
                          </button>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-white/45">
                          {language === 'en'
                            ? 'We will send a secure link. No password needed.'
                            : 'Te enviaremos un enlace seguro. No necesitas contraseña.'}
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
                              {language === 'en' ? 'Link sent' : 'Enlace enviado'}
                            </p>
                            <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                              {language === 'en' ? 'Check your email' : 'Revisa tu correo'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-white/55">
                          {language === 'en'
                            ? `Open the link we sent to ${email.trim() || 'your email'} to finish signing in.`
                            : `Abre el enlace que enviamos a ${email.trim() || 'tu email'} para completar el inicio de sesión.`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setAuthMode('email')}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white"
                        >
                          {language === 'en' ? 'Use another email' : 'Usar otro email'}
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
                              {language === 'en' ? 'Featured login' : 'Login destacado'}
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-white font-display sm:text-3xl">
                              {language === 'en' ? 'Sign in and take your routine with you' : 'Entra y lleva tu rutina contigo'}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            variant="glass-primary"
                            className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_18px_40px_-18px_rgba(56,189,248,0.9)]"
                            onClick={() => setAuthMode('email')}
                            disabled={accountActionDisabled}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            {language === 'en' ? 'Sign in with email' : 'Entrar con email'}
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
                            {language === 'en' ? 'Try anonymous' : 'Probar anónimo'}
                          </button>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-white/45">
                          {language === 'en'
                            ? 'Your local data stays on this device until you connect an account.'
                            : 'Tus datos actuales se quedan en este dispositivo hasta que conectes una cuenta.'}
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
                          {t.account.syncAnonymous}
                        </p>
                        <p className="mt-1 text-xl font-black leading-none text-white font-display sm:text-2xl">
                          {language === 'en' ? 'Add email to keep access' : 'Añade email para no perder acceso'}
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
                            {language === 'en' ? 'Add email' : 'Añadir email'}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setAuthMode('setup')}
                            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/60 transition-colors hover:text-white"
                          >
                            {language === 'en' ? 'Back' : 'Volver'}
                          </button>
                        </div>
                      </div>
                    ) : authMode === 'sent' ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/12 p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                            <p className="text-sm font-medium leading-relaxed text-emerald-50/80">
                              {language === 'en'
                                ? `We sent the link to ${email.trim() || 'your email'}. Open it to convert this anonymous account into a recoverable one.`
                                : `Enviamos el enlace a ${email.trim() || 'tu email'}. Ábrelo para convertir esta cuenta anónima en una cuenta recuperable.`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAuthMode('email')}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white"
                        >
                          {language === 'en' ? 'Use another email' : 'Usar otro email'}
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
                          {language === 'en' ? 'Add email' : 'Añadir email'}
                        </Button>
                        <button
                          type="button"
                          onClick={syncNow}
                          disabled={accountActionDisabled}
                          className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white disabled:opacity-50"
                        >
                          <RefreshCw className="mr-2 inline h-4 w-4" />
                          {language === 'en' ? 'Sync now' : 'Sincronizar'}
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
                          {t.account.signedIn}
                        </p>
                        <p className="mt-1 break-words text-xl font-black leading-none text-white font-display sm:text-2xl">
                          {user.email ?? t.account.connected}
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
                        {language === 'en' ? 'Sync now' : 'Sincronizar ahora'}
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
                        {language === 'en' ? 'Sign out' : 'Cerrar sesión'}
                      </button>
                    </div>
                  </div>
                )}

                {!user && supabaseEnabled && (
                  <p className="mt-3 text-[10px] font-medium leading-relaxed text-white/35">
                    {language === 'en'
                      ? 'Sync activates after you sign in. Until then everything stays local.'
                      : 'La sincronización se activa al entrar con una cuenta. Mientras tanto, todo sigue guardado localmente.'}
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
                  {language === 'en' ? 'State' : 'Estado'}
                </p>
                <p className="mt-1 text-sm font-medium text-white/45">
                  {syncStateDetail}
                </p>
                {lastSyncAt && (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/28">
                    {language === 'en' ? 'Last sync' : 'Última sincronización'}: {formatDateTime(lastSyncAt, language)}
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            ref={(node) => { sectionRefs.current.training = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <SectionTitle
              eyebrow={t.account.training}
              title={language === 'en'
                ? 'Adjust goals, calendar, effort tracking, and rest defaults.'
                : 'Ajusta objetivo, calendario, seguimiento de esfuerzo y descansos.'}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  {t.account.trainingGoal}
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_GOALS.map((option) => (
                    <PreferenceButton
                      key={option.value}
                      active={profile.preferences.trainingGoal === option.value}
                      onClick={() => updatePreferences({ trainingGoal: option.value })}
                    >
                      {language === 'en' ? option.labelEn : option.labelEs}
                    </PreferenceButton>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    {t.account.weekStarts}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {WEEK_STARTS.map((option) => (
                      <PreferenceButton
                        key={option.value}
                        active={profile.preferences.weekStartsOn === option.value}
                        onClick={() => updatePreferences({ weekStartsOn: option.value })}
                      >
                        {language === 'en' ? option.labelEn : option.labelEs}
                      </PreferenceButton>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    {t.account.effortTracking}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {EFFORT_TRACKING.map((option) => (
                      <PreferenceButton
                        key={option.value}
                        active={profile.preferences.effortTracking === option.value}
                        onClick={() => updatePreferences({ effortTracking: option.value })}
                      >
                        {language === 'en' ? option.labelEn : option.labelEs}
                      </PreferenceButton>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  {t.account.coachTone}
                </p>
                <div className="flex flex-wrap gap-2">
                  {COACH_TONES.map((option) => (
                    <PreferenceButton
                      key={option.value}
                      active={profile.preferences.coachTone === option.value}
                      onClick={() => updatePreferences({ coachTone: option.value })}
                    >
                      {language === 'en' ? option.labelEn : option.labelEs}
                    </PreferenceButton>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  {t.account.restDays}
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {weekDayOptions.map((value) => {
                    const isSelected = restDaySet.has(value);
                    const label = DAY_OPTIONS.find((day) => day.value === value)?.[language === 'en' ? 'labelEn' : 'labelEs'] ?? '?';
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
                    {t.account.defaultRest}
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
                    aria-label={language === 'en' ? 'Reduce rest 15 seconds' : 'Reducir el descanso 15 segundos'}
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
                    aria-label={language === 'en' ? 'Increase rest 15 seconds' : 'Aumentar el descanso 15 segundos'}
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

          <motion.section
            ref={(node) => { sectionRefs.current.appearance = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <SectionTitle
              eyebrow={t.account.appearance}
              title={language === 'en'
                ? 'Accent color, reduced motion, and language.'
                : 'Color de acento, movimiento reducido e idioma.'}
            />

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                {t.account.accent}
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((option) => {
                  const selected = profile.preferences.accentColor === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updatePreferences({ accentColor: option.value })}
                      className={cn(
                        'flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                        selected
                          ? 'active-glass-btn text-white'
                          : 'sunken-glass text-white/45 hover:text-white/70',
                      )}
                    >
                      <span className={cn('block h-2.5 w-2.5 rounded-full', option.className)} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  {t.account.language}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <PreferenceButton
                    active={language === 'es'}
                    onClick={() => updatePreferences({ language: 'es' })}
                  >
                    {t.account.languageNameEs}
                  </PreferenceButton>
                  <PreferenceButton
                    active={language === 'en'}
                    onClick={() => updatePreferences({ language: 'en' })}
                  >
                    {t.account.languageNameEn}
                  </PreferenceButton>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                  {t.account.reducedMotion}
                </p>
                <button
                  type="button"
                  onClick={toggleReducedMotion}
                  aria-pressed={profile.preferences.reducedMotion}
                  className={cn(
                    'flex min-h-11 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-[11px] font-black uppercase tracking-widest transition-all',
                    profile.preferences.reducedMotion
                      ? 'active-glass-btn text-white'
                      : 'sunken-glass text-white/45 hover:text-white/70',
                  )}
                >
                  <span>{profile.preferences.reducedMotion ? (language === 'en' ? 'On' : 'Activo') : (language === 'en' ? 'Off' : 'Inactivo')}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                    {profile.preferences.reducedMotion ? (language === 'en' ? 'Less motion' : 'Menos movimiento') : (language === 'en' ? 'System motion' : 'Movimiento del sistema')}
                  </span>
                </button>
              </div>
            </div>
          </motion.section>

          <motion.section
            ref={(node) => { sectionRefs.current.notifications = node; }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
          >
            <SectionTitle
              eyebrow={t.account.notificationsTitle}
              title={t.account.notificationsBody}
            />

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-blue-300">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    {pushStateLabel}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-white/45">
                    {push.permission === 'denied'
                      ? t.account.notificationsDenied
                      : push.permission === 'unsupported'
                        ? t.account.notificationsUnsupported
                        : language === 'en'
                          ? 'Timer alerts use the service worker locally. Streak reminders use your saved push subscription.'
                          : 'Las alertas de descanso usan el service worker localmente. Los recordatorios diarios usan tu suscripción push guardada.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="glass-primary"
                  className="min-h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                  onClick={push.state === 'active' ? push.disable : push.enable}
                  disabled={
                    push.loading ||
                    push.permission === 'unsupported' ||
                    push.permission === 'denied' ||
                    (!session?.access_token && push.state !== 'active')
                  }
                >
                  {push.loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : push.state === 'active' ? (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  ) : (
                    <Bell className="mr-2 h-4 w-4" />
                  )}
                  {push.state === 'active' ? t.account.disablePush : t.account.enablePush}
                </Button>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                  {language === 'en' ? 'Permission' : 'Permiso'}: {pushPermissionLabel}
                </div>
              </div>

              {(!session?.access_token && supabaseEnabled) && (
                <p className="text-xs font-medium leading-relaxed text-white/35">
                  {language === 'en'
                    ? 'Sign in to persist push subscriptions.'
                    : 'Inicia sesión para guardar las suscripciones push.'}
                </p>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({
                    timerNotificationsEnabled: !profile.preferences.timerNotificationsEnabled,
                  })}
                  aria-pressed={profile.preferences.timerNotificationsEnabled}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all',
                    profile.preferences.timerNotificationsEnabled
                      ? 'active-glass-btn text-white'
                      : 'sunken-glass text-white/45 hover:text-white/70',
                  )}
                >
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {t.account.timerNotifications}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                    {profile.preferences.timerNotificationsEnabled ? t.account.timerOn : t.account.timerOff}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updatePreferences({
                    streakReminderEnabled: !profile.preferences.streakReminderEnabled,
                  })}
                  aria-pressed={profile.preferences.streakReminderEnabled}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all',
                    profile.preferences.streakReminderEnabled
                      ? 'active-glass-btn text-white'
                      : 'sunken-glass text-white/45 hover:text-white/70',
                  )}
                >
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {t.account.streakReminder}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                    {profile.preferences.streakReminderEnabled ? t.account.remindersOn : t.account.remindersOff}
                  </span>
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={profile.preferences.timezone}
                  onChange={(e) => updatePreferences({ timezone: e.target.value })}
                  className="sunken-glass min-h-11 rounded-2xl border-none bg-transparent px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/20"
                  placeholder="America/Bogota"
                />
                <button
                  type="button"
                  onClick={setTimezoneToDevice}
                  className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/65 transition-colors hover:text-white"
                >
                  {language === 'en' ? 'Use device' : 'Usar dispositivo'}
                </button>
              </div>
              <p className="text-[10px] font-medium leading-relaxed text-white/30">
                {language === 'en'
                  ? `Current timezone: ${formatTimezoneLabel(profile.preferences.timezone)} · device: ${deviceTimezone}`
                  : `Zona horaria actual: ${formatTimezoneLabel(profile.preferences.timezone)} · dispositivo: ${deviceTimezone}`}
              </p>
            </div>
          </motion.section>

          {canUseLocalBackup && (
            <motion.section
              ref={(node) => { sectionRefs.current.data = node; }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="glass-panel space-y-4 rounded-3xl border-white/10 p-4"
            >
              <SectionTitle
                eyebrow={t.account.data}
                title={t.account.backupAvailable}
              />

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start gap-2">
                  <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                      {t.account.persist}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/45">
                      {isPersisted === null
                        ? (language === 'en' ? 'Checking...' : 'Comprobando...')
                        : isPersisted
                          ? (language === 'en'
                            ? 'The browser can keep local storage.'
                            : 'El navegador puede conservar el almacenamiento local.')
                          : (language === 'en'
                            ? 'The browser did not confirm persistent storage.'
                            : 'El navegador no confirmó almacenamiento persistente.')}
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
                  {t.account.export}
                </Button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-widest text-white/55 transition-colors hover:text-white"
                  disabled={isExporting || isImporting}
                >
                  {isImporting ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Upload className="mr-2 inline h-4 w-4" />}
                  {t.account.import}
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
                {language === 'en'
                  ? 'The backup includes routines, history, bodyweight, and profile.'
                  : 'La copia incluye rutinas, historial, peso corporal y perfil.'}
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
          )}
        </div>
      </div>
    </Sheet>
  );
}
