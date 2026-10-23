// Har role ko kaunsi permissions milti hain (default). Users page se har banday ki
// permissions alag se bhi set ho sakti hain (user.permissions role ke default ko override karti hain).
// Naya feature add karein to PERMISSIONS mein key add kar dein.

// Users page ke checkboxes isi list se banti hain
export const PERMISSIONS = [
  { group: "Home", items: [["dashboard.view", "Home dashboard"]] },
  { group: "Doctor", items: [["doctor.desk", "Doctor desk"]] },
  {
    group: "OPD & Patients",
    items: [
      ["reception.view", "OPD & Patients page (front desk)"],
      ["patients.view", "Patients list dekhna"],
      ["patients.create", "Patient register karna"],
      ["patients.update", "Patient edit karna"],
      ["patients.delete", "Patient delete karna"],
      ["opd.view", "Appointments / queue dekhna"],
      ["opd.book", "Appointment book / manage karna"],
    ],
  },
  { group: "Front desk billing", items: [["billing.collect", "Payments collect karna (lab, admission, charges)"]] },
  {
    group: "Finance",
    items: [
      ["finance.self", "Apna account + handover"],
      ["finance.view", "Sab accounts, payment history dekhna"],
      ["finance.expenses", "Expenses"],
      ["finance.closing", "Day-end closing"],
      ["finance.manage", "Handover receive/confirm karna (owner)"],
    ],
  },
  { group: "Clinical", items: [["emr.view", "Clinical (EMR)"], ["ipd.view", "IPD & beds"], ["lab.view", "Laboratory"]] },
  { group: "Admin", items: [["hrm.view", "HRM"], ["reports.view", "Reports"], ["users.manage", "Users & roles"], ["settings.manage", "Settings"]] },
];

export const ROLES = {
  clinic_admin: { label: "Clinic admin", permissions: ["*"] }, // "*" = sab kuch
  doctor: {
    label: "Doctor",
    permissions: ["dashboard.view", "doctor.desk"], // sirf doctor ka section
  },
  receptionist: {
    label: "Receptionist",
    permissions: [
      "dashboard.view",
      "reception.view",
      "patients.view",
      "patients.create",
      "patients.update",
      "opd.view",
      "opd.book",
      "billing.collect",
      "finance.self",
    ],
  },
  nurse: {
    label: "Nurse",
    permissions: ["dashboard.view", "patients.view", "emr.view", "ipd.view"],
  },
  lab_technician: {
    label: "Lab technician",
    permissions: ["dashboard.view", "lab.view"],
  },
  accountant: {
    label: "Accountant",
    permissions: [
      "dashboard.view",
      "finance.view",
      "finance.expenses",
      "finance.closing",
      "reports.view",
      "hrm.view",
    ],
  },
};
