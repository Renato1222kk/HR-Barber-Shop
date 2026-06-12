import type {
  Appointment,
  AppointmentStatus,
  Client,
  Service,
  Settings,
  WorkingHour,
} from '@/types';
import { addMinutes, toISODate } from '@/lib/utils/format';

// ---------------------------------------------------------------------
// Dados de demonstracao. Gerados de forma relativa a data atual para que
// o dashboard, agenda e financeiro sempre tenham conteudo plausivel.
// Usados automaticamente quando o Supabase NAO esta configurado.
// ---------------------------------------------------------------------

export const mockServices: Service[] = [
  { id: 's1', name: 'Corte Masculino', description: 'Corte tradicional ou moderno', duration_minutes: 40, price: 40, active: true, created_at: '2025-01-01' },
  { id: 's2', name: 'Barba', description: 'Barba feita na navalha', duration_minutes: 25, price: 30, active: true, created_at: '2025-01-01' },
  { id: 's3', name: 'Corte + Barba', description: 'Combo completo', duration_minutes: 60, price: 65, active: true, created_at: '2025-01-01' },
  { id: 's4', name: 'Sobrancelha', description: 'Design de sobrancelha', duration_minutes: 10, price: 15, active: true, created_at: '2025-01-01' },
  { id: 's5', name: 'Acabamento', description: 'Acabamento / pezinho', duration_minutes: 15, price: 20, active: false, created_at: '2025-01-01' },
];

export const mockClients: Client[] = [
  { id: 'c1', name: 'Joao Pedro', whatsapp: '5511988880001', birth_date: '1996-04-12', notes: 'Prefere maquina 2.', created_at: '2025-02-10' },
  { id: 'c2', name: 'Carlos Henrique', whatsapp: '5511988880002', birth_date: '1989-11-03', notes: null, created_at: '2025-01-20' },
  { id: 'c3', name: 'Lucas Andrade', whatsapp: '5511988880003', birth_date: '2000-07-21', notes: 'Sempre marca barba.', created_at: '2025-03-05' },
  { id: 'c4', name: 'Rafael Souza', whatsapp: '5511988880004', birth_date: '1993-01-15', notes: null, created_at: '2025-03-18' },
  { id: 'c5', name: 'Bruno Lima', whatsapp: '5511988880005', birth_date: '1998-09-30', notes: 'Cliente fiel.', created_at: '2024-12-01' },
  { id: 'c6', name: 'Diego Martins', whatsapp: '5511988880006', birth_date: '1991-06-08', notes: null, created_at: '2025-04-02' },
  { id: 'c7', name: 'Felipe Costa', whatsapp: '5511988880007', birth_date: '1995-02-25', notes: 'Sumido faz tempo.', created_at: '2024-11-15' },
  { id: 'c8', name: 'Gustavo Rocha', whatsapp: '5511988880008', birth_date: '1997-12-19', notes: null, created_at: '2025-05-10' },
];

export const mockSettings: Settings = {
  business_name: 'Bruno Samad',
  barber_name: 'Bruno Samad',
  whatsapp: '5511999990000',
  interval_minutes: 10,
  theme: 'dark',
};

export const mockWorkingHours: WorkingHour[] = [
  { id: 'w0', weekday: 0, is_open: false, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { id: 'w1', weekday: 1, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w2', weekday: 2, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w3', weekday: 3, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w4', weekday: 4, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w5', weekday: 5, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { id: 'w6', weekday: 6, is_open: true, start_time: '08:00', end_time: '16:00', break_start: null, break_end: null },
];

// Gera agendamentos espalhados nos ultimos ~40 dias + alguns futuros.
function generateAppointments(): Appointment[] {
  const today = new Date();
  const out: Appointment[] = [];
  let counter = 1;

  const pick = <T>(arr: T[], seed: number): T => arr[seed % arr.length];

  const times = ['09:00', '10:30', '11:30', '14:00', '15:00', '16:30', '17:30', '18:30'];

  // Distribuicao de status para o passado
  const pastStatuses: AppointmentStatus[] = [
    'atendido', 'atendido', 'atendido', 'atendido', 'confirmado', 'faltou', 'cancelado',
  ];

  for (let dayOffset = -38; dayOffset <= 6; dayOffset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + dayOffset);
    const weekday = d.getDay();
    if (weekday === 0) continue; // domingo fechado

    // Sabado costuma lotar mais
    const slots = weekday === 6 ? 5 : 2 + (Math.abs(dayOffset + counter) % 3);

    for (let i = 0; i < slots; i++) {
      const service = pick(mockServices.slice(0, 4), counter + i);
      const client = pick(mockClients, counter * 2 + i);
      const start = times[(counter + i) % times.length];
      const iso = toISODate(d);

      let status: AppointmentStatus;
      if (dayOffset < 0) {
        status = pastStatuses[(counter + i) % pastStatuses.length];
      } else if (dayOffset === 0) {
        // Hoje: mistura de ja atendidos e a confirmar
        status = i === 0 ? 'atendido' : i === 1 ? 'confirmado' : 'agendado';
      } else {
        status = (counter + i) % 3 === 0 ? 'confirmado' : 'agendado';
      }

      out.push({
        id: `a${counter}`,
        client_id: client.id,
        service_id: service.id,
        client_name: client.name,
        client_whatsapp: client.whatsapp,
        service_name: service.name,
        date: iso,
        start_time: start,
        end_time: addMinutes(start, service.duration_minutes),
        duration_minutes: service.duration_minutes,
        price: service.price,
        status,
        notes: null,
        created_at: iso,
      });
      counter++;
    }
  }

  return out;
}

export const mockAppointments: Appointment[] = generateAppointments();
