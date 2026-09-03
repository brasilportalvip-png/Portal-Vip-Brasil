import React, { useEffect, useState } from 'react';
import { BarChart3, ShieldCheck } from 'lucide-react';
import {
  getPortalAnalyticsConsent,
  setPortalAnalyticsConsent,
  type AnalyticsConsentState
} from '../lib/firebase';

export function AnalyticsConsentBanner() {
  const [decision, setDecision] = useState<AnalyticsConsentState>('unknown');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDecision(getPortalAnalyticsConsent());
    setReady(true);
  }, []);

  const choose = async (granted: boolean) => {
    setSaving(true);
    try {
      await setPortalAnalyticsConsent(granted);
      setDecision(granted ? 'granted' : 'denied');
    } finally {
      setSaving(false);
    }
  };

  if (!ready || decision !== 'unknown') return null;

  return (
    <aside
      role="dialog"
      aria-label="Preferências de métricas opcionais"
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[140] mx-auto max-w-3xl rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl lg:bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
          <BarChart3 size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <ShieldCheck size={14} className="text-emerald-400" />
            Métricas opcionais do Portal Vip Brasil
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            O Analytics permanece desligado até sua escolha. Você pode permitir métricas anônimas de uso ou recusar sem afetar o funcionamento do Portal.
            Consulte <a href="/cookies" className="font-semibold text-cyan-300 hover:underline">Cookies</a> e <a href="/privacidade" className="font-semibold text-cyan-300 hover:underline">Privacidade</a>.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void choose(false)}
              className="min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Recusar métricas
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void choose(true)}
              className="froc-primary min-h-10 px-4 text-xs disabled:opacity-50"
            >
              Permitir métricas
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
