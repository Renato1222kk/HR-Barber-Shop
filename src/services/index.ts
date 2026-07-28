// Camada de dados do HR Barber Shop.
//
// Todo acesso ao Supabase passa por aqui: nenhum componente chama
// `.from()` direto. Cada service expõe list / getById / create / update /
// remove com tipagem e erros já traduzidos para o português.

export {
  BARBER_CONFLICT_MESSAGE,
  CONNECTION_ERROR_MESSAGE,
  FORBIDDEN_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from './base';

export {
  NO_ACTIVE_BARBER_MESSAGE,
  listBarbers,
  getBarberById,
  getDefaultBarber,
  createBarber,
  updateBarber,
  removeBarber,
} from './barber-service';

export {
  listServices,
  getServiceById,
  createService,
  updateService,
  removeService,
} from './service-service';

export {
  listClients,
  getClientById,
  createClient,
  updateClient,
  removeClient,
  ensureClient,
} from './client-service';

export {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
  createRecurringAppointments,
  updateAppointmentSeries,
  removeAppointmentSeries,
  listRecurringGroups,
  findBarberConflict,
} from './appointment-service';

export {
  listFinancialEntries,
  getFinancialEntryById,
  createFinancialEntry,
  updateFinancialEntry,
  removeFinancialEntry,
} from './financial-service';

export {
  getSettings,
  updateSettings,
  listWorkingHours,
  updateWorkingHour,
} from './settings-service';
