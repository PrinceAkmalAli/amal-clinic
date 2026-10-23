// Sirf testing ke liye fake data (VITE_USE_MOCK=true). Django ready hone par is ki zarurat nahi.
import { today, daysAgo } from "../utils/date";

let counter = 1000;
export const nextId = () => ++counter;
export const delay = (data, ms = 150) => new Promise((r) => setTimeout(() => r(structuredClone(data)), ms));

const pat = (id, name, gender, age, phone, cnic) => ({
  id, mrNumber: `MR-${String(id).padStart(4, "0")}`, name, gender, age, phone, cnic, address: "Mianwali", registeredOn: daysAgo(3),
  preferredDoctorId: 1, preferredDoctorName: "Dr. Usman",
});

export const db = {
  clinics: [{ id: 1, name: "Al-Shifa Clinic", slug: "al-shifa", adminEmail: "admin@alshifa.com", status: "active" }],
  users: [
    { id: 1, name: "Clinic Admin", email: "admin@clinic.com", role: "clinic_admin", active: true },
    { id: 2, name: "Dr. Usman", email: "doctor@clinic.com", role: "doctor", active: true, doctorId: 1 },
    { id: 3, name: "Bilal", email: "reception@clinic.com", role: "receptionist", active: true },
    { id: 4, name: "Accountant", email: "accountant@clinic.com", role: "accountant", active: true },
  ],
  settings: [{ id: 1, name: "Al-Shifa Clinic", address: "Main Road, Mianwali", phone: "0459-000000", logo: "", eodEnabled: "No", eodWhatsapp: "", eodEmail: "" }],
  patients: [pat(1, "Ahmed Khan", "Male", 34, "0300-1234567", "38302-1234567-1"), pat(2, "Sara Bibi", "Female", 27, "0311-7654321", "38302-7654321-2")],
  staff: [
    { id: 1, name: "Dr. Usman", role: "doctor", phone: "0300-1111111", salary: 150000, commission: 20 },
    { id: 2, name: "Dr. Ayesha", role: "doctor", phone: "0300-2222222", salary: 140000, commission: 15 },
    { id: 3, name: "Nurse Hina", role: "nurse", phone: "0300-3333333", salary: 45000, commission: 0 },
    { id: 4, name: "Bilal", role: "receptionist", phone: "0300-4444444", salary: 35000, commission: 0 },
  ],
  tokens: [
    { id: 1, tokenNo: 1, patientId: 1, patientName: "Ahmed Khan", mrNumber: "MR-0001", doctorId: 1, doctorName: "Dr. Usman", visitType: "new", date: today(), time: "09:10", calledAt: "09:25", status: "completed" },
    { id: 2, tokenNo: 2, patientId: 2, patientName: "Sara Bibi", mrNumber: "MR-0002", doctorId: 1, doctorName: "Dr. Usman", visitType: "followup", date: today(), time: "10:05", status: "waiting" },
  ],
  vitals: [], prescriptions: [],
  wards: [
    { id: 1, name: "General Ward", type: "General", ratePerDay: 2000, beds: [1, 2, 3, 4].map((n) => ({ no: `Bed #0${n}`, status: "available" })) },
    { id: 2, name: "Private Room", type: "Private", ratePerDay: 6000, beds: [1, 2].map((n) => ({ no: `Room #0${n}`, status: "available" })) },
  ],
  admissions: [],
  labTests: [
    { id: 1, name: "CBC", price: 800, parameters: [
      { name: "Hemoglobin", unit: "g/dL", male: { min: 13, max: 17 }, female: { min: 12, max: 15 } },
      { name: "WBC", unit: "x10^3/uL", male: { min: 4, max: 11 }, female: { min: 4, max: 11 } },
      { name: "Platelets", unit: "x10^3/uL", male: { min: 150, max: 450 }, female: { min: 150, max: 450 } },
    ] },
    { id: 2, name: "Blood Sugar (Random)", price: 200, parameters: [
      { name: "Glucose", unit: "mg/dL", male: { min: 70, max: 140 }, female: { min: 70, max: 140 } },
    ] },
  ],
  labOrders: [],
  services: [
    { id: 1, name: "Consultation fee", category: "Consultation", price: 1000 },
    { id: 2, name: "Dressing", category: "Procedure", price: 500 },
    { id: 3, name: "ECG", category: "Procedure", price: 700 },
    { id: 4, name: "Admission fee", category: "Admission", price: 2000 },
  ],
  bills: [
    { id: 1, billNo: "B-0001", patientName: "Ahmed Khan", lines: [{ name: "Consultation fee", category: "Consultation", amount: 1000 }], discount: 0, total: 1000, method: "Cash", user: "Bilal", doctorId: 1, doctorName: "Dr. Usman", date: today(), time: "09:12" },
  ],
  expenses: [{ id: 1, category: "Utility", description: "Electricity bill", amount: 3500, date: today() }],
  handovers: [],
  attendance: [], advances: [], payroll: [], dayClosings: [], auditLogs: [],
};
