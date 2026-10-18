import { daysBetween, money, toMinutes } from "../utils/date";

/*
  Har report: { title, columns:[{key,label}], rows(d) -> [plain objects] }
  d = { from, to, tokens, wards, admissions, labOrders, bills, expenses, staff, attendance, payroll, auditLogs }
  Naya report add karna ho to bas yahan aik object add karein.
*/
const between = (d, rows, field = "date") => rows.filter((r) => r[field] >= d.from && r[field] <= d.to);
function group(rows, keyFn) {
  const map = {};
  rows.forEach((r) => { const k = keyFn(r); (map[k] = map[k] || []).push(r); });
  return Object.entries(map).sort(([a], [b]) => String(a).localeCompare(String(b)));
}
const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
const catSum = (bills, cat) => sum(bills.flatMap((b) => b.lines).filter((l) => l.category === cat), (l) => l.amount);

// P&L: period = 10 (daily), 7 (monthly), 4 (annual) - date string ke pehle N akshar
const profitLoss = (len, title) => ({
  title,
  columns: [{ key: "period", label: "Period" }, { key: "income", label: "Income" }, { key: "expenses", label: "Expenses" }, { key: "net", label: "Net" }],
  rows: (d) => {
    const periods = {};
    d.bills.forEach((b) => { const k = b.date.slice(0, len); periods[k] = periods[k] || { income: 0, expenses: 0 }; periods[k].income += b.total; });
    d.expenses.forEach((e) => { const k = e.date.slice(0, len); periods[k] = periods[k] || { income: 0, expenses: 0 }; periods[k].expenses += e.amount; });
    return Object.entries(periods).sort().map(([period, v]) => ({ period, ...v, net: v.income - v.expenses }));
  },
});

export const REPORT_GROUPS = [
  {
    key: "opd", label: "OPD & patient flow",
    reports: [
      { title: "Daily OPD visitors log",
        columns: [{ key: "date", label: "Date" }, { key: "mrNumber", label: "MR no." }, { key: "patientName", label: "Patient" }, { key: "doctorName", label: "Doctor" }, { key: "tokenNo", label: "Token" }, { key: "status", label: "Status" }],
        rows: (d) => between(d, d.tokens) },
      { title: "Doctor-wise consultation summary",
        columns: [{ key: "doctor", label: "Doctor" }, { key: "total", label: "Total" }, { key: "completed", label: "Completed" }, { key: "cancelled", label: "Cancelled" }, { key: "followUp", label: "Follow-ups" }],
        rows: (d) => group(between(d, d.tokens), (t) => t.doctorName).map(([doctor, r]) => ({
          doctor, total: r.length, completed: r.filter((t) => t.status === "completed").length,
          cancelled: r.filter((t) => t.status === "cancelled").length, followUp: r.filter((t) => t.visitType === "followup").length })) },
      { title: "New vs returning patients",
        columns: [{ key: "type", label: "Type" }, { key: "count", label: "Patients" }, { key: "percent", label: "Share %" }],
        rows: (d) => { const t = between(d, d.tokens); const n = t.filter((x) => x.visitType === "new").length; const total = t.length || 1;
          return [{ type: "New", count: n, percent: Math.round((n / total) * 100) }, { type: "Returning", count: t.length - n, percent: Math.round(((t.length - n) / total) * 100) }]; } },
      { title: "Peak hours & average waiting time",
        columns: [{ key: "hour", label: "Hour" }, { key: "patients", label: "Patients" }, { key: "avgWait", label: "Avg wait (min)" }],
        rows: (d) => group(between(d, d.tokens), (t) => `${t.time.slice(0, 2)}:00`).map(([hour, r]) => {
          const waits = r.filter((t) => t.calledAt).map((t) => toMinutes(t.calledAt) - toMinutes(t.time));
          return { hour, patients: r.length, avgWait: waits.length ? Math.round(sum(waits, (x) => x) / waits.length) : "-" }; }) },
    ],
  },
  {
    key: "ipd", label: "IPD & beds",
    reports: [
      { title: "Bed occupancy & availability",
        columns: [{ key: "ward", label: "Ward" }, { key: "total", label: "Beds" }, { key: "occupied", label: "Occupied" }, { key: "available", label: "Available" }, { key: "maintenance", label: "Maintenance" }, { key: "reserved", label: "Reserved" }, { key: "rate", label: "Occupancy %" }],
        rows: (d) => d.wards.map((w) => { const c = (s) => w.beds.filter((b) => b.status === s).length;
          return { ward: w.name, total: w.beds.length, occupied: c("occupied"), available: c("available"), maintenance: c("maintenance"), reserved: c("reserved"), rate: Math.round((c("occupied") / (w.beds.length || 1)) * 100) }; }) },
      { title: "Admissions, discharges & transfers",
        columns: [{ key: "ipdNumber", label: "IPD no." }, { key: "patientName", label: "Patient" }, { key: "where", label: "Ward / bed" }, { key: "admittedOn", label: "Admitted" }, { key: "dischargedOn", label: "Discharged" }, { key: "transfers", label: "Transfers" }, { key: "status", label: "Status" }],
        rows: (d) => between(d, d.admissions, "admittedOn").map((a) => ({ ...a, where: `${a.wardName} / ${a.bedNo}`, dischargedOn: a.dischargedOn || "-", transfers: a.transfers.length })) },
      { title: "Stay duration & cost analysis",
        columns: [{ key: "ipdNumber", label: "IPD no." }, { key: "patientName", label: "Patient" }, { key: "days", label: "Days" }, { key: "bedCharges", label: "Bed charges" }, { key: "total", label: "Total bill" }],
        rows: (d) => between(d, d.admissions, "admittedOn").map((a) => ({
          ipdNumber: a.ipdNumber, patientName: a.patientName, days: a.status === "admitted" ? daysBetween(a.admittedOn) : a.days,
          bedCharges: a.bedCharges ?? "-", total: a.total ?? "-" })) },
    ],
  },
  {
    key: "lab", label: "Laboratory",
    reports: [
      { title: "Daily lab test volume",
        columns: [{ key: "test", label: "Test" }, { key: "count", label: "Count" }],
        rows: (d) => group(between(d, d.labOrders), (o) => o.testName).map(([test, r]) => ({ test, count: r.length })) },
      { title: "Pending & processing tests",
        columns: [{ key: "date", label: "Date" }, { key: "patientName", label: "Patient" }, { key: "testName", label: "Test" }, { key: "sampleId", label: "Sample ID" }, { key: "status", label: "Status" }],
        rows: (d) => between(d, d.labOrders).filter((o) => !["Results ready", "Verified"].includes(o.status)).map((o) => ({ ...o, sampleId: o.sampleId || "-" })) },
      { title: "Critical / abnormal values",
        columns: [{ key: "date", label: "Date" }, { key: "patientName", label: "Patient" }, { key: "testName", label: "Test" }, { key: "parameter", label: "Parameter" }, { key: "value", label: "Value" }, { key: "range", label: "Normal range" }, { key: "flag", label: "Flag" }],
        rows: (d) => between(d, d.labOrders).flatMap((o) => o.results.filter((r) => r.flag && r.flag !== "Normal").map((r) => ({ ...o, parameter: r.name, value: r.value, range: r.range, flag: r.flag }))) },
      { title: "Technician & pathologist activity",
        columns: [{ key: "user", label: "User" }, { key: "entered", label: "Results entered" }, { key: "verified", label: "Reports verified" }],
        rows: (d) => { const o = between(d, d.labOrders); const users = [...new Set(o.flatMap((x) => [x.enteredBy, x.verifiedBy]).filter(Boolean))];
          return users.map((user) => ({ user, entered: o.filter((x) => x.enteredBy === user).length, verified: o.filter((x) => x.verifiedBy === user).length })); } },
    ],
  },
  {
    key: "finance", label: "Financial",
    reports: [
      { title: "Daily cash drawer summary",
        columns: [{ key: "date", label: "Date" }, { key: "opd", label: "OPD consultation" }, { key: "proc", label: "Procedures" }, { key: "lab", label: "Lab" }, { key: "adv", label: "IPD advance" }, { key: "settle", label: "IPD settlement" }, { key: "discount", label: "Discounts" }, { key: "net", label: "Net" }, { key: "cash", label: "Cash" }, { key: "other", label: "Online/card" }],
        rows: (d) => group(d.bills, (b) => b.date).map(([date, b]) => { const net = sum(b, (x) => x.total); const cash = sum(b.filter((x) => x.method === "Cash"), (x) => x.total);
          return { date, opd: catSum(b, "Consultation"), proc: catSum(b, "Procedure"), lab: catSum(b, "Lab"), adv: catSum(b, "IPD Advance"), settle: catSum(b, "IPD Settlement"), discount: sum(b, (x) => x.discount), net, cash, other: net - cash }; }) },
      { title: "Expense & cash-out register",
        columns: [{ key: "date", label: "Date" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount" }],
        rows: (d) => d.expenses },
      { title: "Discounts, refunds & waive-offs",
        columns: [{ key: "date", label: "Date" }, { key: "billNo", label: "Bill" }, { key: "patientName", label: "Patient" }, { key: "discount", label: "Discount" }, { key: "user", label: "Approved by" }],
        rows: (d) => d.bills.filter((b) => b.discount > 0 || b.total < 0) },
      profitLoss(10, "Profit & loss - daily"),
      profitLoss(7, "Profit & loss - monthly"),
      profitLoss(4, "Profit & loss - annual"),
    ],
  },
  {
    key: "hrm", label: "HRM",
    reports: [
      { title: "Staff attendance & roster",
        columns: [{ key: "date", label: "Date" }, { key: "staffName", label: "Staff" }, { key: "checkIn", label: "Check-in" }, { key: "checkOut", label: "Check-out" }, { key: "status", label: "Status" }],
        rows: (d) => between(d, d.attendance) },
      { title: "Doctor commission",
        columns: [{ key: "doctor", label: "Doctor" }, { key: "amount", label: "Billed amount" }, { key: "percent", label: "Commission %" }, { key: "commission", label: "Commission" }],
        rows: (d) => group(between(d, d.bills).filter((b) => b.doctorId), (b) => b.doctorName).map(([doctor, b]) => {
          const percent = d.staff.find((s) => s.id === b[0].doctorId)?.commission || 0; const amount = sum(b, (x) => x.total);
          return { doctor, amount, percent, commission: Math.round((amount * percent) / 100) }; }) },
      { title: "Payroll & salary ledger",
        columns: [{ key: "month", label: "Month" }, { key: "staffName", label: "Staff" }, { key: "salary", label: "Salary" }, { key: "advances", label: "Advances" }, { key: "net", label: "Net paid" }, { key: "paidOn", label: "Paid on" }],
        rows: (d) => d.payroll },
    ],
  },
  {
    key: "audit", label: "Audit & security",
    reports: [
      { title: "User activity log",
        columns: [{ key: "date", label: "Date" }, { key: "time", label: "Time" }, { key: "user", label: "User" }, { key: "action", label: "Action" }, { key: "entity", label: "Module" }, { key: "detail", label: "Detail" }],
        rows: (d) => between(d, d.auditLogs) },
      { title: "Price override & system changes",
        columns: [{ key: "date", label: "Date" }, { key: "user", label: "User" }, { key: "detail", label: "Change" }],
        rows: (d) => between(d, d.auditLogs).filter((l) => l.entity === "services") },
    ],
  },
];
