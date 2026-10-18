import http, { USE_MOCK } from "./http";
import { db, delay } from "./mockDb";

export async function getClinics() {
  if (USE_MOCK) return delay(db.clinics);
  const { data } = await http.get("/platform/clinics/");
  return data;
}

// Clinic register hone par Django naya database/schema banayega aur clinic admin create karega
export async function createClinic(payload) {
  if (USE_MOCK) {
    const clinic = { id: db.clinics.length + 1, status: "active", ...payload };
    db.clinics.push(clinic);
    return delay(clinic);
  }
  const { data } = await http.post("/platform/clinics/", payload);
  return data;
}
