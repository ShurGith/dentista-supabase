// Cliente API para comunicarse con el Backend modular de Clínica Dental Eugenia
const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Sesión del CRM caducada o ausente: la app vuelve a la pantalla de acceso.
    if (res.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent(CRM_UNAUTHORIZED_EVENT));
    }
    throw Object.assign(new Error(json.message || 'Error en la petición.'), { status: res.status, code: json.error });
  }
  return json.data !== undefined ? json.data : json;
}

export const CRM_UNAUTHORIZED_EVENT = 'crm:unauthorized';
export interface CrmSessionInfo { username: string; source: 'env' | 'db' }

export const api = {
  // Acceso al CRM (sesión en cookie HttpOnly)
  login: (username: string, password: string) =>
    fetchJson<CrmSessionInfo>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => fetchJson<any>('/auth/logout', { method: 'POST' }),
  getSession: () => fetchJson<CrmSessionInfo>('/auth/me'),
  getCrmCredentials: () =>
    fetchJson<{ username: string | null; updated_at: string | null; env_superuser_configured: boolean }>('/auth/credentials'),
  updateCrmCredentials: (data: { username: string; new_password: string; current_password?: string }) =>
    fetchJson<{ username: string; updated_at: string }>('/auth/credentials', { method: 'PUT', body: JSON.stringify(data) }),

  // Servicios
  getServices: () => fetchJson<any[]>('/services'),
  
  // Profesionales
  getProfessionals: () => fetchJson<any[]>('/professionals'),

  // Horarios públicos
  // Identidad pública (título, subtítulo, color de marca)
  getSiteIdentity: () => fetchJson<import('./brandTheme.js').SiteIdentity>('/settings/public'),
  // Datos de contacto de la clínica
  getClinicPublic: () => fetchJson<import('./clinicInfo.js').ClinicInfo>('/clinic/public'),
  getClinic: () => fetchJson<import('./clinicInfo.js').ClinicInfo>('/clinic'),
  updateClinic: (data: Record<string, string>) =>
    fetchJson<import('./clinicInfo.js').ClinicInfo>('/clinic', { method: 'PUT', body: JSON.stringify(data) }),
  getPublicSchedules:() => fetchJson<import('./clinicHours.js').PublicScheduleData>('/schedules/public'),
  getAllSchedules: () => fetchJson<any>('/schedules/all'),
  updateClinicSchedule: (schedules: any[]) => fetchJson<any>('/schedules/clinic', {
    method: 'PUT',
    body: JSON.stringify({ schedules }),
  }),
  createBlockedSlot: (data: any) => fetchJson<any>('/schedules/blocked-slots', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteBlockedSlot: (id: string) => fetchJson<any>(`/schedules/blocked-slots/${id}`, {
    method: 'DELETE',
  }),

  // Disponibilidad en tiempo real
  getAvailableSlots: (params: { service_id: string; date: string; professional_id?: string | null }) => {
    const q = new URLSearchParams({
      service_id: params.service_id,
      date: params.date,
    });
    if (params.professional_id) q.append('professional_id', params.professional_id);
    return fetchJson<any[]>(`/availability?${q.toString()}`);
  },

  // Citas
  getAppointments: (params?: { startDate?: string; endDate?: string; professionalId?: string; operatoryId?: string; status?: string }) => {
    const q = new URLSearchParams(params as any);
    return fetchJson<any[]>(`/appointments?${q.toString()}`);
  },
  publicBookAppointment: (data: any) => fetchJson<any>('/appointments/public-book', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createAppointment: (data: any) => fetchJson<any>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  moveAppointment: (data: { appointment_id: string; start_time: string; end_time: string; professional_id?: string; operatory_id?: string; reason?: string; notify_whatsapp?: boolean }) =>
    fetchJson<any>('/appointments/move', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  resizeAppointment: (data: { appointment_id: string; start_time: string; end_time: string; duration_minutes: number }) =>
    fetchJson<any>('/appointments/resize', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteAppointment: (id: string, notifyWhatsApp: boolean) =>
    fetchJson<{ id: string; whatsapp: { requested: boolean; sent: boolean; error?: string } }>(
      `/appointments/${id}?notify=${notifyWhatsApp}`, { method: 'DELETE' }),
  updateAppointmentStatus: (id: string, status: string, reason?: string) =>
    fetchJson<any>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  // Pacientes
  getPatients: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchJson<any[]>(`/patients${q}`);
  },
  getPatientById: (id: string) => fetchJson<any>(`/patients/${id}`),
  createPatient: (data: any) => fetchJson<any>('/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePatient: (id: string, data: any) => fetchJson<any>(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePatient: (id: string) => fetchJson<any>(`/patients/${id}`, {
    method: 'DELETE',
  }),
  updatePatientMedicalRecord: (id: string, data: any) => fetchJson<any>(`/patients/${id}/medical-record`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  anonymizePatient: (id: string) => fetchJson<any>(`/patients/${id}/anonymize`, {
    method: 'POST',
  }),

  // WhatsApp & Wawp
  getWawpStatus: () => fetchJson<{ mode: 'api' | 'sandbox'; connected: boolean | null; status: string; phoneSuffix?: string }>('/whatsapp/status'),
  getConversations: () => fetchJson<any[]>('/whatsapp/conversations'),
  getConversationMessages: (convId: string) => fetchJson<any[]>(`/whatsapp/conversations/${convId}/messages`),
  deleteConversation: (convId: string) => fetchJson<{ id: string }>(`/whatsapp/conversations/${convId}`, { method: 'DELETE' }),
  sendWhatsAppMessage: (data: { conversation_id?: string; phone_number: string; content: string; template_code?: string; template_variables?: Record<string, string>; appointment_id?: string }) =>
    fetchJson<any>('/whatsapp/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMessageTemplates: () => fetchJson<any[]>('/whatsapp/templates'),
  simulateIncomingWhatsApp: (phone: string, message: string) =>
    fetchJson<any>('/whatsapp/simulator/simulate-incoming', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phone, message }),
    }),

  // Configuración
  getSettings: () => fetchJson<any>('/settings'),
  updateSettings: (data: any) => fetchJson<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

