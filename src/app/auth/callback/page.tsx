'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

type CallbackState = 'working' | 'done' | 'error';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>('working');
  const [message, setMessage] = useState('Conectando tu cuenta...');

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          router.replace('/');
          return;
        }

        const url = new URL(window.location.href);
        const callbackError =
          url.searchParams.get('error_description') ??
          url.searchParams.get('error');

        if (callbackError) {
          throw new Error(callbackError);
        }

        const sb = getSupabaseClient();
        const complete = () => {
          if (cancelled) return;
          setState('done');
          setMessage('Cuenta lista. Entrando a Routyne...');
          router.replace('/?account=sync&auth=complete');
        };

        const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
          if (session) {
            subscription.unsubscribe();
            complete();
          }
        });

        const { data, error } = await sb.auth.getSession();
        if (error) {
          subscription.unsubscribe();
          throw error;
        }

        if (data.session) {
          subscription.unsubscribe();
          complete();
          return;
        }

        window.setTimeout(() => {
          if (cancelled) return;
          subscription.unsubscribe();
          setState('error');
          setMessage('No encontramos una sesión válida en el enlace.');
        }, 4000);
      } catch (error) {
        if (cancelled) return;

        const nextMessage = error instanceof Error
          ? error.message
          : 'No se pudo completar el acceso.';

        setState('error');
        setMessage(nextMessage);
      }
    };

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="liquid-bg-dark flex min-h-[100dvh] items-center justify-center px-4 text-zinc-100">
      <div className="glass-panel flex w-full max-w-sm flex-col items-center gap-4 rounded-[2rem] border-white/10 p-6 text-center">
        {state === 'error' ? (
          <XCircle className="h-12 w-12 text-red-300" />
        ) : state === 'done' ? (
          <CheckCircle2 className="h-12 w-12 text-emerald-300" />
        ) : (
          <Loader2 className="h-12 w-12 animate-spin text-sky-300" />
        )}

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35">
            Acceso
          </p>
          <h1 className="font-display text-2xl font-black text-white">
            {state === 'error' ? 'No se pudo entrar' : 'Abriendo la app'}
          </h1>
          <p className="text-sm font-medium leading-relaxed text-white/55">
            {message}
          </p>
        </div>

        {state === 'error' && (
          <button
            type="button"
            onClick={() => router.replace('/?account=sync&auth_error=callback')}
            className="active-glass-btn min-h-11 rounded-2xl px-4 text-[11px] font-black uppercase tracking-widest text-white"
          >
            Volver a la app
          </button>
        )}
      </div>
    </main>
  );
}
