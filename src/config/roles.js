// Har role ko kaunsi permissions milti hain.
// Naya feature add karein to yahan permission string add kar dein.
export const ROLES = {
  clinic_admin: { label: "Clinic admin", permissions: ["*"] }, // "*" = sab kuch
  doctor: {
    label: "Doctor",
    permissions: [
      "dashboard.view",
      "doctor.desk",
      "patients.view",
      "opd.view",
      "emr.view",
      "lab.view",
      "ipd.view",
    ],
  },
  receptionist: {
    label: "Receptionist",
    permissions: [
      "dashboard.view",
      "patients.view",
      "patients.create",
      "billing.view",
      "opd.view",
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
      "billing.view",
      "finance.view",
      "reports.view",
      "hrm.view",
    ],
  },
};
