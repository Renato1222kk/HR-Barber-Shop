'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AppointmentModal } from '@/components/agenda/AppointmentModal';

interface ShellContextValue {
  openNewAppointment: (opts?: { date?: string; time?: string }) => void;
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell deve ser usado dentro de AppShell');
  return ctx;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [newOpen, setNewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [defaults, setDefaults] = useState<{ date?: string; time?: string }>({});

  const openNewAppointment = useCallback((opts?: { date?: string; time?: string }) => {
    setDefaults({ date: opts?.date, time: opts?.time });
    setNewOpen(true);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Registra o service worker (PWA).
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <ShellContext.Provider value={{ openNewAppointment }}>
      <div className="min-h-dvh bg-ink-950">
        <Sidebar open={menuOpen} onClose={closeMenu} />
        <div className="lg:pl-64">
          <Header onNew={() => openNewAppointment()} onOpenMenu={() => setMenuOpen(true)} />
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
            {children}
          </main>
        </div>
        <BottomNav onNew={() => openNewAppointment()} />
      </div>

      <AppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        defaultDate={defaults.date}
        defaultTime={defaults.time}
      />
    </ShellContext.Provider>
  );
}
