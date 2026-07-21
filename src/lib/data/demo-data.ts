import type {
  Appointment,
  AppointmentStatus,
  Barber,
  Client,
  RecurringGroup,
  Service,
  Settings,
  WorkingHour,
} from '@/types';
import { addMinutes, toISODate } from '@/lib/utils/format';

// ---------------------------------------------------------------------
// Dados iniciais do MODO DEMONSTRACAO da HR Barber Shop.
// Sao gerados de forma relativa a data atual para que agenda, dashboard e
// financeiro sempre tenham conteudo plausivel na primeira abertura.
// ---------------------------------------------------------------------

export interface DemoDatabase {
  barbers: Barber[];
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
  workingHours: WorkingHour[];
  recurringGroups: RecurringGroup[];
  settings: Settings;
}

const SEED_DATE = '2025-01-02T09:00:00.000Z';

const barbers: Barber[] = [
  {
    id: 'b1',
    name: 'Henrique Rocha',
    phone: '5511977770001',
    specialty: 'Cortes clássicos e navalhado',
    active: true,
    work_start: '09:00',
    work_end: '19:00',
    created_at: SEED_DATE,
  },
  {
    id: 'b2',
    name: 'Lucas Martins',
    phone: '5511977770002',
    specialty: 'Degradê e freestyle',
    active: true,
    work_start: '10:00',
    work_end: '20:00',
    created_at: SEED_DATE,
  },
  {
    id: 'b3',
    name: 'Rafael Santos',
    phone: '5511977770003',
    specialty: 'Barboterapia e barba',
    active: true,
    work_start: '09:00',
    work_end: '18:00',
    created_at: SEED_DATE,
  },
];

const services: Service[] = [
  {
    id: 's1',
    name: 'Corte Masculino',
    description: 'Corte tradicional ou moderno na tesoura e máquina.',
    duration_minutes: 40,
    price: 35,
    active: true,
    created_at: SEED_DATE,
  },
  {
    id: 's2',
    name: 'Barba',
    description: 'Barba feita na navalha com toalha quente.',
    duration_minutes: 30,
    price: 25,
    active: true,
    created_at: SEED_DATE,
  },
  {
    id: 's3',
    name: 'Corte + Barba',
    description: 'Combo completo com acabamento.',
    duration_minutes: 60,
    price: 55,
    active: true,
    created_at: SEED_DATE,
  },
  {
    id: 's4',
    name: 'Corte Infantil',
    description: 'Atendimento especial para crianças.',
    duration_minutes: 40,
    price: 30,
    active: true,
    created_at: SEED_DATE,
  },
  {
    id: 's5',
    name: 'Sobrancelha',
    description: 'Design de sobrancelha masculina.',
    duration_minutes: 15,
    price: 15,
    active: true,
    created_at: SEED_DATE,
  },
];

const clients: Client[] = [
  {
    id: 'c1',
    name: 'João Pedro',
    whatsapp: '5511988880001',
    birth_date: '1996-04-12',
    notes: 'Prefere máquina 2 nas laterais.',
    created_at: SEED_DATE,
  },
  {
    id: 'c2',
    name: 'Carlos Eduardo',
    whatsapp: '5511988880002',
    birth_date: '1989-11-03',
    notes: null,
    created_at: SEED_DATE,
  },
  {
    id: 'c3',
    name: 'Matheus Silva',
    whatsapp: '5511988880003',
    birth_date: '2000-07-21',
    notes: 'Sempre marca corte com barba.',
    created_at: SEED_DATE,
  },
  {
    id: 'c4',
    name: 'Bruno Alves',
    whatsapp: '5511988880004',
    birth_date: '1993-01-15',
    notes: null,
    created_at: SEED_DATE,
  },
  {
    id: 'c5',
    name: 'Felipe Souza',
    whatsapp: '5511988880005',
    birth_date: '1998-09-30',
    notes: 'Cliente fiel, vem toda quinzena.',
    created_at: SEED_DATE,
  },
];

const settings: Settings = {
  business_name: 'HR Barber Shop',
  owner_name: 'Henrique Rocha',
  whatsapp: '5511999990000',
  interval_minutes: 10,
  theme: 'dark',
};

const workingHours: WorkingHour[] = [
  { id: 'w0', weekday: 0, is_open: false, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { id: 'w1', weekday: 1, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w2', weekday: 2, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w3', weekday: 3, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w4', weekday: 4, is_open: true, start_time: '09:00', end_time: '20:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w5', weekday: 5, is_open: true, start_time: '09:00', end_time: '20:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w6', weekday: 6, is_open: true, start_time: '08:00', end_time: '17:00', break_start: null, break_end: null },
];

// Grade de horarios espacada em 60 min: como nenhum servico passa de 60 minutos,
// dois agendamentos do mesmo barbeiro nunca se sobrepoem nos dados iniciais.
const SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const NOTES = [
  null,
  'Cliente pediu para caprichar no acabamento.',
  'Chegou pelo Instagram.',
  null,
  'Pagamento no Pix.',
];

// Sequencia deterministica (evita Math.random para manter o seed estavel).
function pseudo(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], n: number): T {
  return arr[Math.floor(pseudo(n) * arr.length) % arr.length];
}

function generateAppointments(today: Date): Appointment[] {
  const out: Appointment[] = [];
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  let counter = 0;

  for (let dayOffset = -40; dayOffset <= 7; dayOffset++) {
    const day = new Date(today);
    day.setDate(today.getDate() + dayOffset);
    const weekday = day.getDay();
    if (weekday === 0) continue; // domingo fechado
    const iso = toISODate(day);

    barbers.forEach((barber, barberIndex) => {
      // Cada barbeiro atende de 2 a 4 horarios por dia.
      const seedBase = (dayOffset + 60) * 17 + barberIndex * 7;
      const slotCount = 2 + Math.floor(pseudo(seedBase) * 3);
      const startIndex = Math.floor(pseudo(seedBase + 1) * (SLOTS.length - slotCount));

      for (let i = 0; i < slotCount; i++) {
        counter += 1;
        const start = SLOTS[startIndex + i];
        const service = pick(services, counter * 3 + barberIndex);
        const client = pick(clients, counter * 5 + dayOffset);

        let status: AppointmentStatus;
        if (dayOffset < 0) {
          status = pseudo(counter * 11) > 0.88 ? 'cancelado' : 'concluido';
        } else if (dayOffset === 0) {
          const slotMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
          if (slotMinutes + service.duration_minutes <= nowMinutes) status = 'concluido';
          else if (slotMinutes <= nowMinutes) status = 'em_atendimento';
          else status = pseudo(counter * 13) > 0.5 ? 'confirmado' : 'agendado';
        } else {
          status = pseudo(counter * 7) > 0.55 ? 'confirmado' : 'agendado';
        }

        out.push({
          id: `a${counter}`,
          client_id: client.id,
          service_id: service.id,
          barber_id: barber.id,
          client_name: client.name,
          client_whatsapp: client.whatsapp,
          service_name: service.name,
          barber_name: barber.name,
          date: iso,
          start_time: start,
          end_time: addMinutes(start, service.duration_minutes),
          duration_minutes: service.duration_minutes,
          price: service.price,
          status,
          notes: pick(NOTES, counter * 2),
          created_at: iso,
        });
      }
    });
  }

  return out;
}

/** Monta uma copia nova dos dados iniciais de demonstracao. */
export function seedDemoData(today: Date = new Date()): DemoDatabase {
  return {
    barbers: barbers.map((b) => ({ ...b })),
    clients: clients.map((c) => ({ ...c })),
    services: services.map((s) => ({ ...s })),
    appointments: generateAppointments(today),
    workingHours: workingHours.map((w) => ({ ...w })),
    recurringGroups: [],
    settings: { ...settings },
  };
}
