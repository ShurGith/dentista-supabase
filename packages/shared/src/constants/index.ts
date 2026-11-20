// ====================================================================
// CONSTANTES GLOBALES - CLÍNICA DENTAL EUGENIA
// ====================================================================

export const DEFAULT_CLINIC_ID = 'e1111111-1111-1111-1111-111111111111';

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_waiting_room: 'En sala de espera',
  in_progress: 'En gabinete',
  completed: 'Completada',
  cancelled_by_patient: 'Cancelada por paciente',
  cancelled_by_clinic: 'Cancelada por clínica',
  no_show: 'No asistió',
};

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',       // Ámbar
  confirmed: '#0d9488',     // Teal
  in_waiting_room: '#0284c7', // Azul cielo
  in_progress: '#6366f1',   // Índigo
  completed: '#10b981',     // Esmeralda
  cancelled_by_patient: '#94a3b8', // Pizarra
  cancelled_by_clinic: '#f43f5e',  // Rosa/Rojo
  no_show: '#ef4444',       // Rojo
};

export const DAY_NAMES_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const WAWP_API_BASE_URL = 'https://api.wawp.net/v1';

