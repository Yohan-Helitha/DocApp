// Seeds demo data for the Doctor Appointments UI via the API Gateway.
// Creates (if needed): doctor profile, 2 availability slots, 2 appointments; accepts 1 appointment.

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

const jsonFetch = async (path, { method = 'GET', token, body } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
};

const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const login = async (email, password) => {
  const out = await jsonFetch('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  must(out.status === 200 && out.body?.accessToken, `login_failed:${email}:${out.status}`);
  return out.body.accessToken;
};

const pad2 = (n) => String(n).padStart(2, '0');

const daysAheadISO = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const getSlotDate = () => {
  const explicit = (process.env.DEMO_SLOT_DATE || '').trim();
  if (explicit) return explicit;

  const rawDays = Number(process.env.DEMO_DAYS_AHEAD || '1');
  const days = Number.isFinite(rawDays) ? rawDays : 1;
  return daysAheadISO(days);
};

const main = async () => {
  const summary = { apiBase: API_BASE };

  // Credentials can be overridden via env vars.
  const doctorEmail = process.env.DEMO_DOCTOR_EMAIL || 'doctor1@example.com';
  const doctorPassword = process.env.DEMO_DOCTOR_PASSWORD || 'Password123';
  const patientEmail = process.env.DEMO_PATIENT_EMAIL || 'patient2@example.com';
  const patientPassword = process.env.DEMO_PATIENT_PASSWORD || 'Password123';

  const doctorToken = await login(doctorEmail, doctorPassword);
  const patientToken = await login(patientEmail, patientPassword);
  summary.tokens = { doctor: 'ok', patient: 'ok' };

  // 1) Ensure doctor profile exists
  const list = await jsonFetch('/api/v1/doctors', { token: doctorToken });
  must(list.status === 200, `list_doctors_failed:${list.status}`);
  let doctor = (list.body?.doctors || []).find((d) => d.email === doctorEmail);

  if (!doctor) {
    const create = await jsonFetch('/api/v1/doctors', {
      method: 'POST',
      token: doctorToken,
      body: {
        full_name: 'Demo Doctor',
        specialization: 'General Medicine',
        license_number: `LIC-${Date.now()}`,
        experience_years: 5,
        consultation_fee: 50,
        bio: 'Seeded demo doctor profile',
      },
    });
    must(create.status === 201 && create.body?.doctor?.doctor_id, `create_doctor_failed:${create.status}`);
    doctor = create.body.doctor;
    summary.doctorProfile = { created: true, doctor_id: doctor.doctor_id };
  } else {
    summary.doctorProfile = { created: false, doctor_id: doctor.doctor_id };
  }

  // 2) Create two availability slots for the requested date
  const slotDate = getSlotDate();
  const slot1 = await jsonFetch(`/api/v1/doctors/${doctor.doctor_id}/availability-slots`, {
    method: 'POST',
    token: doctorToken,
    body: { slot_date: slotDate, start_time: '09:00', end_time: '09:30' },
  });
  must(slot1.status === 201 && slot1.body?.slot?.slot_id, `create_slot1_failed:${slot1.status}`);

  const slot2 = await jsonFetch(`/api/v1/doctors/${doctor.doctor_id}/availability-slots`, {
    method: 'POST',
    token: doctorToken,
    body: { slot_date: slotDate, start_time: '10:00', end_time: '10:30' },
  });
  must(slot2.status === 201 && slot2.body?.slot?.slot_id, `create_slot2_failed:${slot2.status}`);

  summary.slots = [slot1.body.slot.slot_id, slot2.body.slot.slot_id];

  // 3) Book two appointments as the patient
  const appt1 = await jsonFetch('/api/v1/appointments', {
    method: 'POST',
    token: patientToken,
    body: {
      doctor_id: doctor.doctor_id,
      slot_id: slot1.body.slot.slot_id,
      reason_for_visit: 'Demo booking (will be accepted)',
    },
  });
  must(appt1.status === 201 && appt1.body?.appointment?.appointment_id, `book_appt1_failed:${appt1.status}`);

  const appt2 = await jsonFetch('/api/v1/appointments', {
    method: 'POST',
    token: patientToken,
    body: {
      doctor_id: doctor.doctor_id,
      slot_id: slot2.body.slot.slot_id,
      reason_for_visit: 'Demo booking (stays pending)',
    },
  });
  must(appt2.status === 201 && appt2.body?.appointment?.appointment_id, `book_appt2_failed:${appt2.status}`);

  summary.appointments = [
    { id: appt1.body.appointment.appointment_id, status: appt1.body.appointment.appointment_status },
    { id: appt2.body.appointment.appointment_id, status: appt2.body.appointment.appointment_status },
  ];

  // 4) Accept the first appointment as the doctor
  const accept = await jsonFetch(`/api/v1/appointments/${appt1.body.appointment.appointment_id}/doctor-decision`, {
    method: 'PUT',
    token: doctorToken,
    body: { decision: 'accept' },
  });
  must(accept.status === 200, `accept_failed:${accept.status}`);
  summary.accepted = { id: appt1.body.appointment.appointment_id, newStatus: accept.body?.appointment?.appointment_status };

  // 5) Final list check (doctor view)
  const listAppts = await jsonFetch(`/api/v1/appointments/doctors/${doctor.doctor_id}`, { token: doctorToken });
  must(listAppts.status === 200, `list_doctor_appointments_failed:${listAppts.status}`);
  summary.doctorAppointmentsCount = (listAppts.body?.appointments || []).length;

  console.log(JSON.stringify(summary, null, 2));
};

main().catch((err) => {
  console.error('seed_failed', err?.message || err);
  process.exit(1);
});
