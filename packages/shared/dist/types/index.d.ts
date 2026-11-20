export type AppointmentStatus = 'pending' | 'confirmed' | 'in_waiting_room' | 'in_progress' | 'completed' | 'cancelled_by_patient' | 'cancelled_by_clinic' | 'no_show';
export type UserRole = 'superadmin' | 'admin' | 'professional' | 'receptionist';
export type WhatsAppDirection = 'inbound' | 'outbound';
export type WhatsAppMessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationStatus = 'open' | 'pending' | 'closed';
export type ConsentType = 'rgpd' | 'whatsapp_communication' | 'clinical_treatment' | 'reminders';
export interface Clinic {
    id: string;
    name: string;
    legal_name: string;
    cif_nif: string;
    phone: string;
    emergency_phone?: string;
    email: string;
    address: string;
    postal_code: string;
    city: string;
    province: string;
    country: string;
    website_url?: string;
    google_maps_url?: string;
    timezone: string;
    is_active: boolean;
    created_at?: string;
}
export interface Service {
    id: string;
    clinic_id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    benefits?: string;
    duration_minutes: number;
    color: string;
    icon?: string;
    requires_consultation_first: boolean;
    is_public_bookable: boolean;
    is_active: boolean;
    sort_order: number;
}
export interface Professional {
    id: string;
    clinic_id: string;
    profile_id?: string;
    first_name: string;
    last_name: string;
    collegiated_number?: string;
    specialty: string;
    biography?: string;
    languages?: string;
    color: string;
    photo_url?: string;
    default_operatory_id?: string;
    is_active: boolean;
    sort_order: number;
    services?: Service[];
}
export interface Operatory {
    id: string;
    clinic_id: string;
    name: string;
    description?: string;
    color: string;
    is_active: boolean;
}
export interface Patient {
    id: string;
    clinic_id: string;
    first_name: string;
    last_name: string;
    dni_nie?: string;
    birth_date?: string;
    gender?: string;
    phone: string;
    email?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
    tags?: string[];
    acquisition_source?: string;
    status: 'active' | 'inactive' | 'archived';
    is_deleted?: boolean;
    created_at: string;
    updated_at: string;
    medical_record?: PatientMedicalRecord;
}
export interface PatientMedicalRecord {
    id: string;
    patient_id: string;
    blood_type?: string;
    allergies?: string;
    medical_conditions?: string;
    current_medications?: string;
    clinical_notes?: string;
    habits?: string;
    updated_at?: string;
}
export interface Appointment {
    id: string;
    clinic_id: string;
    patient_id: string;
    professional_id: string;
    operatory_id: string;
    service_id: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: AppointmentStatus;
    patient_notes?: string;
    clinical_notes?: string;
    cancellation_reason?: string;
    reschedule_reason?: string;
    is_recurring?: boolean;
    created_at: string;
    updated_at: string;
    patient?: Patient;
    professional?: Professional;
    service?: Service;
    operatory?: Operatory;
}
export interface ClinicSchedule {
    id: string;
    clinic_id: string;
    day_of_week: number;
    open_time: string;
    close_time: string;
    lunch_start?: string;
    lunch_end?: string;
    is_closed: boolean;
}
export interface ProfessionalSchedule {
    id: string;
    professional_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_start?: string;
    break_end?: string;
    is_working: boolean;
}
export interface BlockedSlot {
    id: string;
    clinic_id: string;
    operatory_id?: string;
    professional_id?: string;
    start_time: string;
    end_time: string;
    reason: string;
    is_all_day: boolean;
}
export interface AvailableTimeSlot {
    start_time: string;
    end_time: string;
    duration_minutes: number;
    professional_id: string;
    operatory_id: string;
}
export interface WhatsAppConversation {
    id: string;
    clinic_id: string;
    contact_id: string;
    patient_id?: string;
    status: ConversationStatus;
    assigned_to?: string;
    internal_notes?: string;
    last_message_text?: string;
    last_message_at: string;
    unread_count: number;
    contact?: {
        id: string;
        phone_number: string;
        display_name?: string;
    };
    patient?: Patient;
}
export interface WhatsAppMessage {
    id: string;
    conversation_id: string;
    direction: WhatsAppDirection;
    sender_phone: string;
    recipient_phone: string;
    message_type: string;
    content: string;
    media_url?: string;
    wawp_message_id?: string;
    status: WhatsAppMessageStatus;
    error_message?: string;
    sent_at: string;
    delivered_at?: string;
    read_at?: string;
}
export interface MessageTemplate {
    id: string;
    clinic_id: string;
    code: string;
    title: string;
    category: string;
    body_text: string;
    variables: string[];
    is_active: boolean;
}
export interface ClinicSettings {
    id: string;
    clinic_id: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    logo_url?: string;
    hero_title: string;
    hero_subtitle: string;
    min_notice_hours: number;
    max_advance_days: number;
    buffer_between_appointments_minutes: number;
    default_calendar_slot_minutes: number;
    allow_public_booking: boolean;
    wawp_enabled: boolean;
    wawp_instance_id?: string;
    wawp_phone_number?: string;
    wawp_sandbox_mode: boolean;
    reminder_24h_enabled: boolean;
    reminder_2h_enabled: boolean;
    reminder_post_enabled: boolean;
}
//# sourceMappingURL=index.d.ts.map