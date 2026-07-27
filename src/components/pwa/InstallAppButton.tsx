'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

/**
 * Evento `beforeinstallprompt` — só existe no Chrome/Edge (Android, Windows,
 * desktop). O tipo não está no lib.dom padrão, então descrevemos o mínimo.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS antigo expõe a flag fora do padrão.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se apresenta como Mac; o toque é o que o denuncia.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

/**
 * Botão discreto "Instalar aplicativo".
 *
 * - Chrome/Edge/Android/Windows: usa o `beforeinstallprompt` e só aparece
 *   quando o navegador realmente oferece a instalação.
 * - iPhone/iPad: o Safari não tem esse evento, então mostramos a orientação
 *   curta de "Compartilhar → Adicionar à Tela de Início".
 * - Já instalado (rodando em standalone): não aparece nada.
 * - Navegador sem suporte: também não aparece — e nada quebra.
 */
export function InstallAppButton({ className }: { className?: string }) {
  // `null` = ainda não sabemos (primeiro render no cliente).
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Tudo é decidido depois da montagem: o HTML do servidor nunca inclui o
    // botão, então não existe diferença de marcação na hidratação.
    setStandalone(isStandalone());
    setIos(isIOS());
    setReady(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    // O evento só pode ser usado uma vez.
    setPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  if (!ready || standalone || installed) return null;

  if (ios) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button variant="secondary" className="w-full" onClick={() => setShowIosHint((v) => !v)}>
          <Download className="h-4 w-4" />
          Instalar aplicativo
        </Button>
        {showIosHint && (
          <p className="flex items-start gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            Para instalar no iPhone, toque em Compartilhar e depois em Adicionar à Tela de
            Início.
          </p>
        )}
      </div>
    );
  }

  if (!prompt) return null;

  return (
    <Button variant="secondary" className={cn('w-full', className)} onClick={install}>
      <Download className="h-4 w-4" />
      Instalar aplicativo
    </Button>
  );
}

/** Confirmação usada quando o app já roda instalado (só na tela de ajustes). */
export function InstalledBadge() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => setStandalone(isStandalone()), []);
  if (!standalone) return null;
  return (
    <p className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-medium text-green-700">
      <Check className="h-4 w-4" />
      Aplicativo instalado neste aparelho.
    </p>
  );
}
