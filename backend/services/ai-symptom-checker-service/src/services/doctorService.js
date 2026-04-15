import env from "../config/environment.js";

export async function fetchDoctorsBySpecialty({ specialty, authorization }) {
  if (!specialty) return [];

  const url = new URL("/api/v1/doctors", env.DOCTOR_SERVICE_URL);
  url.searchParams.set("specialization", specialty);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: authorization || "",
    },
  });

  if (!res.ok) {
    const err = new Error("doctor_service_unavailable");
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  const doctors = data?.doctors || [];

  return doctors.map((d) => ({
    doctor_id: d.doctor_id,
    full_name: d.full_name,
    specialization: d.specialization,
    consultation_fee: d.consultation_fee,
    experience_years: d.experience_years,
  }));
}
