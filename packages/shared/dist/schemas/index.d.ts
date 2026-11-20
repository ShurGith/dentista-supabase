import { z } from 'zod';
export declare const patientSchema: z.ZodObject<{
    first_name: z.ZodString;
    last_name: z.ZodString;
    dni_nie: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birth_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    gender: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    postal_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    emergency_contact_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    emergency_contact_phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    acquisition_source: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    first_name: string;
    last_name: string;
    phone: string;
    status: "active" | "inactive" | "archived";
    tags: string[];
    acquisition_source: string;
    dni_nie?: string | null | undefined;
    birth_date?: string | null | undefined;
    gender?: string | null | undefined;
    email?: string | undefined;
    address?: string | null | undefined;
    postal_code?: string | null | undefined;
    city?: string | null | undefined;
    emergency_contact_name?: string | null | undefined;
    emergency_contact_phone?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    first_name: string;
    last_name: string;
    phone: string;
    dni_nie?: string | null | undefined;
    birth_date?: string | null | undefined;
    gender?: string | null | undefined;
    email?: string | undefined;
    status?: "active" | "inactive" | "archived" | undefined;
    address?: string | null | undefined;
    postal_code?: string | null | undefined;
    city?: string | null | undefined;
    emergency_contact_name?: string | null | undefined;
    emergency_contact_phone?: string | null | undefined;
    notes?: string | null | undefined;
    tags?: string[] | undefined;
    acquisition_source?: string | undefined;
}>;
export declare const publicBookingSchema: z.ZodObject<{
    service_id: z.ZodString;
    professional_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    start_time: z.ZodString;
    first_name: z.ZodString;
    last_name: z.ZodString;
    phone: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    patient_notes: z.ZodOptional<z.ZodString>;
    rgpd_consent: z.ZodLiteral<true>;
    whatsapp_consent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    first_name: string;
    last_name: string;
    phone: string;
    service_id: string;
    start_time: string;
    rgpd_consent: true;
    whatsapp_consent: boolean;
    email?: string | undefined;
    professional_id?: string | null | undefined;
    patient_notes?: string | undefined;
}, {
    first_name: string;
    last_name: string;
    phone: string;
    service_id: string;
    start_time: string;
    rgpd_consent: true;
    email?: string | undefined;
    professional_id?: string | null | undefined;
    patient_notes?: string | undefined;
    whatsapp_consent?: boolean | undefined;
}>;
export declare const createAppointmentSchema: z.ZodObject<{
    clinic_id: z.ZodOptional<z.ZodString>;
    patient_id: z.ZodString;
    professional_id: z.ZodString;
    operatory_id: z.ZodOptional<z.ZodString>;
    service_id: z.ZodString;
    start_time: z.ZodString;
    end_time: z.ZodOptional<z.ZodString>;
    duration_minutes: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["pending", "confirmed", "in_waiting_room", "in_progress", "completed", "cancelled_by_patient", "cancelled_by_clinic", "no_show"]>>;
    patient_notes: z.ZodOptional<z.ZodString>;
    clinical_notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "confirmed" | "in_waiting_room" | "in_progress" | "completed" | "cancelled_by_patient" | "cancelled_by_clinic" | "no_show";
    service_id: string;
    professional_id: string;
    start_time: string;
    patient_id: string;
    patient_notes?: string | undefined;
    clinic_id?: string | undefined;
    operatory_id?: string | undefined;
    end_time?: string | undefined;
    duration_minutes?: number | undefined;
    clinical_notes?: string | undefined;
}, {
    service_id: string;
    professional_id: string;
    start_time: string;
    patient_id: string;
    status?: "pending" | "confirmed" | "in_waiting_room" | "in_progress" | "completed" | "cancelled_by_patient" | "cancelled_by_clinic" | "no_show" | undefined;
    patient_notes?: string | undefined;
    clinic_id?: string | undefined;
    operatory_id?: string | undefined;
    end_time?: string | undefined;
    duration_minutes?: number | undefined;
    clinical_notes?: string | undefined;
}>;
export declare const moveAppointmentSchema: z.ZodObject<{
    appointment_id: z.ZodString;
    start_time: z.ZodString;
    end_time: z.ZodString;
    professional_id: z.ZodOptional<z.ZodString>;
    operatory_id: z.ZodOptional<z.ZodString>;
    reason: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    notify_whatsapp: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    start_time: string;
    end_time: string;
    appointment_id: string;
    reason: string;
    notify_whatsapp: boolean;
    professional_id?: string | undefined;
    operatory_id?: string | undefined;
}, {
    start_time: string;
    end_time: string;
    appointment_id: string;
    professional_id?: string | undefined;
    operatory_id?: string | undefined;
    reason?: string | undefined;
    notify_whatsapp?: boolean | undefined;
}>;
export declare const resizeAppointmentSchema: z.ZodObject<{
    appointment_id: z.ZodString;
    start_time: z.ZodString;
    end_time: z.ZodString;
    duration_minutes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    start_time: string;
    end_time: string;
    duration_minutes: number;
    appointment_id: string;
}, {
    start_time: string;
    end_time: string;
    duration_minutes: number;
    appointment_id: string;
}>;
export declare const cancelAppointmentSchema: z.ZodObject<{
    reason: z.ZodString;
    cancelled_by: z.ZodDefault<z.ZodEnum<["patient", "clinic"]>>;
    notify_whatsapp: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    notify_whatsapp: boolean;
    cancelled_by: "patient" | "clinic";
}, {
    reason: string;
    notify_whatsapp?: boolean | undefined;
    cancelled_by?: "patient" | "clinic" | undefined;
}>;
export declare const availabilityQuerySchema: z.ZodObject<{
    clinic_id: z.ZodOptional<z.ZodString>;
    service_id: z.ZodString;
    professional_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    date: z.ZodString;
    duration_minutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    date: string;
    service_id: string;
    professional_id?: string | null | undefined;
    clinic_id?: string | undefined;
    duration_minutes?: number | undefined;
}, {
    date: string;
    service_id: string;
    professional_id?: string | null | undefined;
    clinic_id?: string | undefined;
    duration_minutes?: number | undefined;
}>;
export declare const wawpSendMessageSchema: z.ZodObject<{
    conversation_id: z.ZodOptional<z.ZodString>;
    phone_number: z.ZodString;
    content: z.ZodString;
    template_code: z.ZodOptional<z.ZodString>;
    template_variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    appointment_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone_number: string;
    content: string;
    appointment_id?: string | undefined;
    conversation_id?: string | undefined;
    template_code?: string | undefined;
    template_variables?: Record<string, string> | undefined;
}, {
    phone_number: string;
    content: string;
    appointment_id?: string | undefined;
    conversation_id?: string | undefined;
    template_code?: string | undefined;
    template_variables?: Record<string, string> | undefined;
}>;
export declare const wawpWebhookPayloadSchema: z.ZodObject<{
    event: z.ZodString;
    instance_id: z.ZodOptional<z.ZodString>;
    data: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodOptional<z.ZodString>;
        to: z.ZodOptional<z.ZodString>;
        body: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        sender_name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string | undefined;
        type?: string | undefined;
        id?: string | undefined;
        from?: string | undefined;
        to?: string | undefined;
        body?: string | undefined;
        timestamp?: string | number | undefined;
        sender_name?: string | undefined;
    }, {
        status?: string | undefined;
        type?: string | undefined;
        id?: string | undefined;
        from?: string | undefined;
        to?: string | undefined;
        body?: string | undefined;
        timestamp?: string | number | undefined;
        sender_name?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    event: string;
    data: {
        status?: string | undefined;
        type?: string | undefined;
        id?: string | undefined;
        from?: string | undefined;
        to?: string | undefined;
        body?: string | undefined;
        timestamp?: string | number | undefined;
        sender_name?: string | undefined;
    };
    instance_id?: string | undefined;
}, {
    event: string;
    data: {
        status?: string | undefined;
        type?: string | undefined;
        id?: string | undefined;
        from?: string | undefined;
        to?: string | undefined;
        body?: string | undefined;
        timestamp?: string | number | undefined;
        sender_name?: string | undefined;
    };
    instance_id?: string | undefined;
}>;
export declare const updateSettingsSchema: z.ZodObject<{
    primary_color: z.ZodOptional<z.ZodString>;
    secondary_color: z.ZodOptional<z.ZodString>;
    hero_title: z.ZodOptional<z.ZodString>;
    hero_subtitle: z.ZodOptional<z.ZodString>;
    min_notice_hours: z.ZodOptional<z.ZodNumber>;
    max_advance_days: z.ZodOptional<z.ZodNumber>;
    buffer_between_appointments_minutes: z.ZodOptional<z.ZodNumber>;
    default_calendar_slot_minutes: z.ZodOptional<z.ZodNumber>;
    wawp_enabled: z.ZodOptional<z.ZodBoolean>;
    wawp_instance_id: z.ZodOptional<z.ZodString>;
    wawp_api_token: z.ZodOptional<z.ZodString>;
    wawp_phone_number: z.ZodOptional<z.ZodString>;
    wawp_sandbox_mode: z.ZodOptional<z.ZodBoolean>;
    reminder_24h_enabled: z.ZodOptional<z.ZodBoolean>;
    reminder_2h_enabled: z.ZodOptional<z.ZodBoolean>;
    reminder_post_enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    primary_color?: string | undefined;
    secondary_color?: string | undefined;
    hero_title?: string | undefined;
    hero_subtitle?: string | undefined;
    min_notice_hours?: number | undefined;
    max_advance_days?: number | undefined;
    buffer_between_appointments_minutes?: number | undefined;
    default_calendar_slot_minutes?: number | undefined;
    wawp_enabled?: boolean | undefined;
    wawp_instance_id?: string | undefined;
    wawp_api_token?: string | undefined;
    wawp_phone_number?: string | undefined;
    wawp_sandbox_mode?: boolean | undefined;
    reminder_24h_enabled?: boolean | undefined;
    reminder_2h_enabled?: boolean | undefined;
    reminder_post_enabled?: boolean | undefined;
}, {
    primary_color?: string | undefined;
    secondary_color?: string | undefined;
    hero_title?: string | undefined;
    hero_subtitle?: string | undefined;
    min_notice_hours?: number | undefined;
    max_advance_days?: number | undefined;
    buffer_between_appointments_minutes?: number | undefined;
    default_calendar_slot_minutes?: number | undefined;
    wawp_enabled?: boolean | undefined;
    wawp_instance_id?: string | undefined;
    wawp_api_token?: string | undefined;
    wawp_phone_number?: string | undefined;
    wawp_sandbox_mode?: boolean | undefined;
    reminder_24h_enabled?: boolean | undefined;
    reminder_2h_enabled?: boolean | undefined;
    reminder_post_enabled?: boolean | undefined;
}>;
//# sourceMappingURL=index.d.ts.map