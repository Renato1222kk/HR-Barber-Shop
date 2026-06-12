// Store em memoria para o modo demonstracao (sem Supabase).
// Mantem CRUD funcional durante a sessao (reseta ao recarregar a pagina).
import type {
  Appointment,
  Client,
  RecurringGroup,
  Service,
  Settings,
  WorkingHour,
} from '@/types';
import {
  mockAppointments,
  mockClients,
  mockServices,
  mockSettings,
  mockWorkingHours,
} from './mock';

interface DemoStore {
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
  workingHours: WorkingHour[];
  recurringGroups: RecurringGroup[];
  settings: Settings;
}

// Clona para nao mutar os arrays originais do mock.
function seed(): DemoStore {
  return {
    clients: mockClients.map((c) => ({ ...c })),
    services: mockServices.map((s) => ({ ...s })),
    appointments: mockAppointments.map((a) => ({ ...a })),
    workingHours: mockWorkingHours.map((w) => ({ ...w })),
    recurringGroups: [],
    settings: { ...mockSettings },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __brunoDemoStore: DemoStore | undefined;
}

export function demoStore(): DemoStore {
  if (!globalThis.__brunoDemoStore) {
    globalThis.__brunoDemoStore = seed();
  }
  return globalThis.__brunoDemoStore;
}

let idCounter = 1000;
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
