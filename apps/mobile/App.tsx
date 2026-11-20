import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Alert, Linking, SafeAreaView, StatusBar
} from 'react-native';

const API_BASE_URL = 'http://localhost:4000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'book' | 'doctor' | 'profile'>('appointments');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Booking State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('+34 ');
  const [bookingDate, setBookingDate] = useState('2026-11-21');
  const [bookingTime, setBookingTime] = useState('11:00');

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptsRes, srvsRes, profsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/appointments`).then(r => r.json()),
        fetch(`${API_BASE_URL}/services`).then(r => r.json()),
        fetch(`${API_BASE_URL}/professionals`).then(r => r.json()),
      ]);

      if (apptsRes.success) setAppointments(apptsRes.data);
      if (srvsRes.success) {
        setServices(srvsRes.data);
        if (srvsRes.data.length > 0) setSelectedServiceId(srvsRes.data[0].id);
      }
      if (profsRes.success) {
        setProfessionals(profsRes.data);
        if (profsRes.data.length > 0) setSelectedProfId(profsRes.data[0].id);
      }
    } catch (e) {
      console.log('Error conectando con la API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBooking = async () => {
    if (!patientName.trim() || !patientPhone.trim()) {
      Alert.alert('Datos incompletos', 'Por favor introduce tu nombre y teléfono móvil.');
      return;
    }

    try {
      const startTime = `${bookingDate}T${bookingTime}:00+01:00`;
      const res = await fetch(`${API_BASE_URL}/appointments/public-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedServiceId,
          professional_id: selectedProfId || null,
          start_time: startTime,
          first_name: patientName.split(' ')[0],
          last_name: patientName.split(' ').slice(1).join(' ') || 'Paciente',
          phone: patientPhone,
          rgpd_consent: true,
          whatsapp_consent: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      Alert.alert(
        '¡Cita Reservada!',
        'Hemos confirmado tu cita y te hemos enviado los detalles a tu WhatsApp por Wawp.',
        [{ text: 'Ver mis citas', onPress: () => { setActiveTab('appointments'); loadData(); } }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo reservar la cita.');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    Alert.alert(
      'Cancelar Cita',
      '¿Deseas cancelar esta cita médica?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled_by_patient', reason: 'Cancelada desde app móvil' }),
              });
              Alert.alert('Cita cancelada', 'Se ha notificado a la clínica y por WhatsApp.');
              loadData();
            } catch (e) {
              Alert.alert('Error', 'No se pudo cancelar la cita.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d9488" />
      
      {/* Top Clinic Header */}
      <View style={styles.header}>
        <Text style={styles.headerBadge}>CLÍNICA DENTAL EUGENIA</Text>
        <Text style={styles.headerTitle}>Portal del Paciente & Personal</Text>
      </View>

      {/* Main Tab Content */}
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* TAB 1: PRÓXIMAS CITAS */}
        {activeTab === 'appointments' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tus Próximas Citas</Text>
              <TouchableOpacity onPress={loadData} style={styles.reloadBtn}>
                <Text style={styles.reloadText}>Refrescar</Text>
              </TouchableOpacity>
            </View>

            {appointments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tienes citas pendientes.</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setActiveTab('book')}
                >
                  <Text style={styles.primaryBtnText}>Reservar Cita Ahora</Text>
                </TouchableOpacity>
              </View>
            ) : (
              appointments.map((appt) => (
                <View key={appt.id} style={styles.appointmentCard}>
                  <View style={styles.apptTopRow}>
                    <Text style={styles.apptServiceName}>{appt.service?.name}</Text>
                    <Text style={styles.apptStatusBadge}>{appt.status}</Text>
                  </View>

                  <Text style={styles.apptDateText}>
                    📅 {new Date(appt.start_time).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} a las {new Date(appt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.apptDoctorText}>
                    👨‍⚕️ {appt.professional?.first_name} {appt.professional?.last_name}
                  </Text>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.whatsappActionBtn}
                      onPress={() => Linking.openURL('https://wa.me/34600112233')}
                    >
                      <Text style={styles.whatsappActionText}>Chat WhatsApp</Text>
                    </TouchableOpacity>

                    {appt.status !== 'cancelled_by_patient' && (
                      <TouchableOpacity
                        style={styles.cancelActionBtn}
                        onPress={() => handleCancelAppointment(appt.id)}
                      >
                        <Text style={styles.cancelActionText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: RESERVAR CITA MÓVIL */}
        {activeTab === 'book' && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Nueva Reserva Dental</Text>
            <Text style={styles.formSubtitle}>Selecciona tu tratamiento y especialista sin costes adicionales.</Text>

            <Text style={styles.label}>Tratamiento:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {services.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSelectedServiceId(s.id)}
                  style={[styles.chip, selectedServiceId === s.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedServiceId === s.id && styles.chipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Odontólogo:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {professionals.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProfId(p.id)}
                  style={[styles.chip, selectedProfId === p.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedProfId === p.id && styles.chipTextActive]}>
                    {p.first_name} {p.last_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Tu Nombre y Apellidos:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Laura Gómez"
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.label}>Teléfono WhatsApp:</Text>
            <TextInput
              style={styles.input}
              placeholder="+34 600 000 000"
              keyboardType="phone-pad"
              value={patientPhone}
              onChangeText={setPatientPhone}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Fecha (AAAA-MM-DD):</Text>
                <TextInput
                  style={styles.input}
                  value={bookingDate}
                  onChangeText={setBookingDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hora (HH:MM):</Text>
                <TextInput
                  style={styles.input}
                  value={bookingTime}
                  onChangeText={setBookingTime}
                />
              </View>
            </View>

            <Text style={styles.rgpdText}>
              ✓ Conforme al RGPD: los datos médicos y de contacto se almacenan de forma segura para la gestión de tu cita.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateBooking}
            >
              <Text style={styles.primaryBtnText}>Confirmar Reserva</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: MODO PROFESIONAL (DOCTOR) */}
        {activeTab === 'doctor' && (
          <View>
            <Text style={styles.sectionTitle}>Agenda del Día - Dra. Eugenia Martínez</Text>
            <Text style={styles.formSubtitle}>Gabinete 3 · Quirófano e Implantes</Text>

            {appointments.map(a => (
              <View key={a.id} style={styles.doctorCard}>
                <View style={styles.apptTopRow}>
                  <Text style={styles.doctorTime}>
                    {new Date(a.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.apptStatusBadge}>{a.status}</Text>
                </View>
                <Text style={styles.doctorPatientName}>
                  {a.patient?.first_name} {a.patient?.last_name} ({a.patient?.phone})
                </Text>
                <Text style={styles.doctorServiceName}>Tratamiento: {a.service?.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: PERFIL Y RGPD */}
        {activeTab === 'profile' && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Tus Datos y Privacidad</Text>
            <Text style={styles.label}>Clínica Responsable:</Text>
            <Text style={styles.valueText}>Clínica Dental Eugenia S.L.P. (Madrid)</Text>

            <Text style={styles.label}>Consentimiento RGPD:</Text>
            <Text style={styles.valueText}>✓ Tratamiento médico y gestión de citas aceptado</Text>

            <Text style={styles.label}>Canal de Notificaciones:</Text>
            <Text style={styles.valueText}>✓ Mensajería WhatsApp automática mediante Wawp</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#dc2626', marginTop: 24 }]}
              onPress={() => Alert.alert('Derechos RGPD', 'Para ejercer tus derechos de acceso, rectificación o supresión de historial, contacta directamente con privacidad@clinicadentaleugenia.es')}
            >
              <Text style={styles.primaryBtnText}>Solicitar Supresión de Datos (RGPD)</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab('appointments')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'appointments' && styles.tabBtnActive]}>
            📅 Citas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab('book')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'book' && styles.tabBtnActive]}>
            ➕ Reservar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab('doctor')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'doctor' && styles.tabBtnActive]}>
            👨‍⚕️ Médico
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'profile' && styles.tabBtnActive]}>
            🛡️ Perfil
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerBadge: {
    color: '#ccfbf1',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  reloadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  reloadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  apptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  apptServiceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  apptStatusBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  apptDateText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 4,
  },
  apptDoctorText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  whatsappActionBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  whatsappActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
  },
  cancelActionText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#f8fafc',
  },
  row: {
    flexDirection: 'row',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#0d9488',
  },
  chipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rgpdText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 14,
    lineHeight: 14,
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0d9488',
  },
  doctorPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  doctorServiceName: {
    fontSize: 12,
    color: '#64748b',
  },
  valueText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    marginBottom: 8,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
});

