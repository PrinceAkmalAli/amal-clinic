import { createResource } from "./resource";
import { today } from "../utils/date";

const pad = (n, size = 4) => String(n).padStart(size, "0");

export const patientsApi = createResource("patients", "/patients/", {
  prefill: (rows) => ({ mrNumber: `MR-${pad(rows.length + 1)}`, registeredOn: today() }), // auto MR number
});
export const usersApi = createResource("users", "/users/");
export const staffApi = createResource("staff", "/staff/");
export const settingsApi = createResource("settings", "/settings/");
export const servicesApi = createResource("services", "/services/"); // rate list
export const tokensApi = createResource("tokens", "/opd/tokens/", {
  // doctor-wise token number, har din naye sirey se
  prefill: (rows, p) => ({ tokenNo: rows.filter((r) => r.date === p.date && String(r.doctorId) === String(p.doctorId)).length + 1 }),
});
export const vitalsApi = createResource("vitals", "/emr/vitals/");
export const prescriptionsApi = createResource("prescriptions", "/emr/prescriptions/");
export const wardsApi = createResource("wards", "/ipd/wards/");
export const admissionsApi = createResource("admissions", "/ipd/admissions/", {
  prefill: (rows) => ({ ipdNumber: `IPD-${pad(rows.length + 1)}` }),
});
export const labTestsApi = createResource("labTests", "/lab/tests/");
export const labOrdersApi = createResource("labOrders", "/lab/orders/");
export const billsApi = createResource("bills", "/billing/bills/", {
  prefill: (rows) => ({ billNo: `B-${pad(rows.length + 1)}` }),
});
export const expensesApi = createResource("expenses", "/billing/expenses/");
export const closingsApi = createResource("dayClosings", "/billing/closings/");
export const attendanceApi = createResource("attendance", "/hrm/attendance/");
export const advancesApi = createResource("advances", "/hrm/advances/");
export const payrollApi = createResource("payroll", "/hrm/payroll/");
export const auditApi = createResource("auditLogs", "/audit/");
