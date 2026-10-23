import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import {
  admissionsApi, billsApi, labOrdersApi, labTestsApi, patientsApi, servicesApi, staffApi, tokensApi,
} from "../../api/resources";
import { useCreate, useList, useRemove, useUpdate } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { findById, money, nowTime, today } from "../../utils/date";
import { makeBill } from "../../utils/billing";
import { Pos, History } from "../../components/Pos";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Field from "../../components/ui/Field";
import DataTable from "../../components/ui/DataTable";
import NotAuthorized from "../../components/NotAuthorized";
import { useTabParam } from "../../hooks/useTabParam";

/* ---------- CNIC helpers: 12345-1234567-1 ---------- */
const CNIC_RE = /^\d{5}-\d{7}-\d$/;
const fmtCnic = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 13);
  if (d.length > 12) return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
};
// Error text wapas deta hai (khali = sab theek)
function checkPatient(f, patients, selfId) {
  if (f.cnic) {
    if (!CNIC_RE.test(f.cnic)) return "CNIC format 12345-1234567-1 hona chahiye";
    const dup = patients.find((p) => p.cnic === f.cnic && p.id !== selfId);
    if (dup) return `Ye CNIC pehle se registered hai: ${dup.mrNumber} - ${dup.name}`;
  }
  return "";
}

/* ======================= Page ======================= */
export default function FrontDeskPage() {
  const { can } = useAuth();
  const tabs = [
    ...(can("patients.view") ? [{ key: "patients", label: "Patients" }] : []),
    ...(can("patients.create") ? [{ key: "register", label: "Register & book" }] : []),
    ...(can("opd.view") ? [{ key: "queue", label: "Appointments & queue" }] : []),
    ...(can("billing.collect") ? [{ key: "cashier", label: "Cashier (payments)" }, { key: "history", label: "My payment history" }] : []),
  ];
  const [tab, setTab] = useTabParam(tabs[0]?.key || "patients");
  const allowed = tabs.some((t) => t.key === tab);

  const { data: staff = [] } = useList(staffApi, "staff");
  const doctors = staff.filter((s) => s.role === "doctor");

  return (
    <>
      <PageHeader title="OPD & Patients" icon={Users} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {!allowed && <NotAuthorized />}
      {allowed && tab === "patients" && <PatientsTab doctors={doctors} goRegister={() => setTab("register")} />}
      {allowed && tab === "register" && <RegisterTab doctors={doctors} onDone={() => setTab("queue")} />}
      {allowed && tab === "queue" && <QueueTab doctors={doctors} />}
      {allowed && tab === "cashier" && <CashierTab />}
      {allowed && tab === "history" && <HistoryTab />}
    </>
  );
}

/* ---------- Patient form fields (register + edit dono mein) ---------- */
function PatientFields({ form, set, doctors, doctorLabel = "Preferred doctor" }) {
  return (
    <div className="form-grid">
      <Field label="Name" name="name" value={form.name} onChange={set} required />
      <Field label="Age" type="number" name="age" value={form.age} onChange={set} required />
      <Field label="Gender" as="select" name="gender" value={form.gender} onChange={set}>
        <option>Male</option>
        <option>Female</option>
      </Field>
      <Field label="Phone" name="phone" value={form.phone} onChange={set} required />
      <Field label="CNIC (12345-1234567-1)" name="cnic" value={form.cnic}
        onChange={(e) => set({ target: { name: "cnic", value: fmtCnic(e.target.value) } })} placeholder="00000-0000000-0" />
      <Field label="Address" name="address" value={form.address} onChange={set} />
      <Field label={doctorLabel} as="select" name="preferredDoctorId" value={form.preferredDoctorId} onChange={set}>
        <option value="">- select -</option>
        {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Field>
    </div>
  );
}

const emptyPatient = { name: "", age: "", gender: "Male", phone: "", cnic: "", address: "", preferredDoctorId: "" };
const patientPayload = (f, doctors) => {
  const doc = findById(doctors, f.preferredDoctorId);
  return {
    name: f.name.trim(), age: Number(f.age), gender: f.gender, phone: f.phone, cnic: f.cnic, address: f.address,
    preferredDoctorId: doc?.id ?? "", preferredDoctorName: doc?.name ?? "",
  };
};

/* ---------- Appointment (token) + consultation fee: register aur "Book" dono use karte hain ---------- */
function useBooking() {
  const { user } = useAuth();
  const { data: services = [] } = useList(servicesApi, "services");
  const createToken = useCreate(tokensApi, "tokens");
  const createBill = useCreate(billsApi, "bills");
  const consult = services.find((s) => s.category === "Consultation");

  // patient: saved patient row, doctor: staff row
  const book = async ({ patient, doctor, date, time, visitType, collectFee, method }) => {
    const token = await createToken.mutateAsync({
      patientId: patient.id, patientName: patient.name, mrNumber: patient.mrNumber,
      doctorId: doctor.id, doctorName: doctor.name, visitType, date, time, status: "waiting",
    });
    let bill = null;
    if (collectFee && consult) {
      bill = await createBill.mutateAsync(
        makeBill({
          patientId: patient.id, patientName: patient.name, method, user: user?.name,
          doctorId: doctor.id, doctorName: doctor.name,
          lines: [{ name: consult.name, category: consult.category, amount: consult.price }],
        }),
      );
    }
    return { token, bill };
  };
  return { book, consult, pending: createToken.isPending || createBill.isPending };
}

function BookingFields({ b, setB, consult, doctors }) {
  const set = (e) => setB({ ...b, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <>
      <div className="form-grid">
        <Field label="Doctor" as="select" name="doctorId" value={b.doctorId} onChange={set}>
          <option value="">- select -</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Field>
        <Field label="Appointment date" type="date" name="date" value={b.date} onChange={set} min={today()} />
        <Field label="Time" type="time" name="time" value={b.time} onChange={set} />
        <Field label="Visit type" as="select" name="visitType" value={b.visitType} onChange={set}>
          <option value="new">New</option>
          <option value="followup">Follow-up</option>
        </Field>
      </div>
      {consult && (
        <div style={{ marginTop: 10, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <label><input type="checkbox" name="collectFee" checked={b.collectFee} onChange={set} /> Consultation fee abhi collect karein ({money(consult.price)})</label>
          {b.collectFee && (
            <select className="plain-select" name="method" value={b.method} onChange={set}>
              {["Cash", "Card", "Online", "Bank transfer"].map((m) => <option key={m}>{m}</option>)}
            </select>
          )}
        </div>
      )}
    </>
  );
}
const emptyBooking = (doctorId = "") => ({ doctorId, date: today(), time: nowTime(), visitType: "new", collectFee: true, method: "Cash" });

/* ---------- Register patient + appointment book ---------- */
function RegisterTab({ doctors, onDone }) {
  const { data: patients = [] } = useList(patientsApi, "patients");
  const create = useCreate(patientsApi, "patients");
  const { book, consult, pending } = useBooking();
  const [form, setForm] = useState(emptyPatient);
  const [bookNow, setBookNow] = useState(true);
  const [b, setB] = useState(emptyBooking());
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setDone("");
    const err = checkPatient(form, patients);
    if (err) return setError(err);
    // Preferred doctor ko hi appointment ka default doctor banate hain
    const doctor = findById(doctors, b.doctorId || form.preferredDoctorId);
    if (bookNow && !doctor) return setError("Appointment ke liye doctor select karein");
    setError("");

    const patient = await create.mutateAsync(patientPayload(form, doctors));
    let msg = `${patient.mrNumber} - ${patient.name} register ho gaya.`;
    if (bookNow) {
      const { token, bill } = await book({ patient, doctor, ...b, collectFee: b.collectFee, method: b.method });
      msg += ` Token #${token.tokenNo} (${doctor.name}, ${b.date}).`;
      if (bill) msg += ` Bill ${bill.billNo} - ${money(bill.total)}.`;
    }
    setDone(msg);
    setForm(emptyPatient);
    setB(emptyBooking());
    if (bookNow) setTimeout(onDone, 1500);
  };

  return (
    <form className="card card-pad" onSubmit={submit}>
      <div className="card-title">New patient (MR number auto banega)</div>
      {done && <div className="success-note">{done}</div>}
      <PatientFields form={form} set={set} doctors={doctors} />

      <div className="card-title" style={{ marginTop: 16 }}>
        <label><input type="checkbox" checked={bookNow} onChange={(e) => setBookNow(e.target.checked)} /> Appointment bhi book karein</label>
      </div>
      {bookNow && <BookingFields b={{ ...b, doctorId: b.doctorId || form.preferredDoctorId }} setB={setB} consult={consult} doctors={doctors} />}

      {error && <div className="text-critical" style={{ marginTop: 10 }}>{error}</div>}
      <div style={{ marginTop: 14 }}>
        <Button primary type="submit" disabled={create.isPending || pending}>
          {create.isPending || pending ? "Saving..." : bookNow ? "Register & book" : "Register patient"}
        </Button>
      </div>
    </form>
  );
}

/* ---------- Patients list: edit / delete / book ---------- */
function PatientsTab({ doctors, goRegister }) {
  const { can } = useAuth();
  const [params] = useSearchParams(); // topbar search se ?q=...
  const [search, setSearch] = useState(params.get("q") || "");
  const [edit, setEdit] = useState(null); // { id, form }
  const [bookFor, setBookFor] = useState(null); // { patient, b }
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const { data: patients = [], isLoading } = useList(patientsApi, "patients", { search });
  const { data: allPatients = [] } = useList(patientsApi, "patients");
  const { data: bills = [] } = useList(billsApi, "bills");
  const { data: admissions = [] } = useList(admissionsApi, "admissions");
  const update = useUpdate(patientsApi, "patients");
  const remove = useRemove(patientsApi, "patients");
  const { book, consult, pending } = useBooking();

  const startEdit = (p) => {
    setError(""); setNote(""); setBookFor(null);
    setEdit({ id: p.id, form: { name: p.name, age: p.age, gender: p.gender, phone: p.phone, cnic: p.cnic || "", address: p.address || "", preferredDoctorId: p.preferredDoctorId || "" } });
  };
  const saveEdit = (e) => {
    e.preventDefault();
    const err = checkPatient(edit.form, allPatients, edit.id);
    if (err) return setError(err);
    setError("");
    update.mutate({ id: edit.id, ...patientPayload(edit.form, doctors) }, { onSuccess: () => { setEdit(null); setNote("Patient update ho gaya."); } });
  };

  const del = (p) => {
    setNote(""); setError("");
    if (admissions.some((a) => String(a.patientId) === String(p.id) && a.status === "admitted"))
      return setError(`${p.name} abhi IPD mein admit hai, delete nahi ho sakta.`);
    if (bills.some((x) => String(x.patientId) === String(p.id)))
      return setError(`${p.name} ke bills maujood hain, delete nahi ho sakta (records safe rakhne ke liye).`);
    if (window.confirm(`${p.mrNumber} - ${p.name} ko delete karna hai?`))
      remove.mutate(p.id, { onSuccess: () => setNote("Patient delete ho gaya.") });
  };

  const startBook = (p) => {
    setEdit(null); setNote(""); setError("");
    setBookFor({ patient: p, b: emptyBooking(p.preferredDoctorId ? String(p.preferredDoctorId) : "") });
  };
  const confirmBook = async () => {
    const doctor = findById(doctors, bookFor.b.doctorId);
    if (!doctor) return setError("Doctor select karein");
    setError("");
    const { token, bill } = await book({ patient: bookFor.patient, doctor, ...bookFor.b });
    setNote(`${bookFor.patient.name}: Token #${token.tokenNo} (${doctor.name}, ${bookFor.b.date})${bill ? `, bill ${bill.billNo}` : ""}.`);
    setBookFor(null);
  };

  const columns = [
    { key: "mrNumber", label: "MR number" },
    { key: "name", label: "Name" },
    { key: "cnic", label: "CNIC", render: (p) => p.cnic || "-" },
    { key: "gender", label: "Gender" },
    { key: "age", label: "Age" },
    { key: "phone", label: "Phone" },
    { key: "preferredDoctorName", label: "Preferred doctor", render: (p) => p.preferredDoctorName || "-" },
    { key: "registeredOn", label: "Registered" },
    {
      key: "act", label: "",
      render: (p) => (
        <div className="actions">
          {can("opd.book") && <Button small onClick={() => startBook(p)}>Book</Button>}
          {can("patients.update") && <Button small onClick={() => startEdit(p)}>Edit</Button>}
          {can("patients.delete") && <Button small onClick={() => del(p)}>Delete</Button>}
        </div>
      ),
    },
  ];

  return (
    <>
      {can("patients.create") && (
        <div className="mb"><Button primary icon={Plus} onClick={goRegister}>Register patient</Button></div>
      )}
      {note && <div className="success-note">{note}</div>}
      {error && <div className="text-critical mb">{error}</div>}

      {edit && (
        <form className="card card-pad mb" onSubmit={saveEdit}>
          <div className="card-title">Edit patient</div>
          <PatientFields form={edit.form} set={(e) => setEdit({ ...edit, form: { ...edit.form, [e.target.name]: e.target.value } })} doctors={doctors} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button primary type="submit" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save changes"}</Button>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </form>
      )}

      {bookFor && (
        <div className="card card-pad mb">
          <div className="card-title">Appointment - {bookFor.patient.mrNumber} {bookFor.patient.name}</div>
          <BookingFields b={bookFor.b} setB={(b) => setBookFor({ ...bookFor, b })} consult={consult} doctors={doctors} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button primary disabled={pending} onClick={confirmBook}>{pending ? "Saving..." : "Book appointment"}</Button>
            <Button onClick={() => setBookFor(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={patients} loading={isLoading} search={search} onSearch={setSearch}
        searchPlaceholder="Search by name, MR number, CNIC or phone" />
    </>
  );
}

/* ---------- Appointments & queue ---------- */
function QueueTab({ doctors }) {
  const { can } = useAuth();
  const [date, setDate] = useState(today());
  const [doctorFilter, setDoctorFilter] = useState("");
  const { data: tokens = [], isLoading } = useList(tokensApi, "tokens", { date });
  const updateToken = useUpdate(tokensApi, "tokens");
  const shown = tokens.filter((t) => !doctorFilter || String(t.doctorId) === doctorFilter);
  const setStatus = (t, status) =>
    updateToken.mutate({ id: t.id, status, ...(status === "in_consultation" ? { calledAt: nowTime() } : {}) });

  const columns = [
    { key: "tokenNo", label: "Token" },
    { key: "patientName", label: "Patient" },
    { key: "mrNumber", label: "MR" },
    { key: "doctorName", label: "Doctor" },
    { key: "visitType", label: "Type" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (t) => <Badge tone={t.status === "completed" ? "success" : t.status === "waiting" ? "warn" : undefined}>{t.status.replace("_", " ")}</Badge> },
    { key: "act", label: "", render: (t) => can("opd.book") && (
      <div className="actions">
        {t.status === "waiting" && <Button small onClick={() => setStatus(t, "in_consultation")}>Call in</Button>}
        {t.status === "in_consultation" && <Button small onClick={() => setStatus(t, "completed")}>Complete</Button>}
        {(t.status === "waiting" || t.status === "in_consultation") && <Button small onClick={() => setStatus(t, "cancelled")}>Cancel</Button>}
      </div>
    ) },
  ];

  return (
    <>
      {date === today() && (
        <div className="card card-pad mb">
          <div className="card-title">Waiting room display</div>
          <div className="chips">
            {doctors.map((d) => {
              const serving = tokens.find((t) => t.doctorId === d.id && t.status === "in_consultation");
              const waiting = tokens.filter((t) => t.doctorId === d.id && t.status === "waiting").length;
              return (
                <div className="chip" key={d.id} style={{ minWidth: 180 }}>
                  <b>{d.name}</b>
                  <span>Now serving: {serving ? `#${serving.tokenNo}` : "-"}</span>
                  <span style={{ color: "var(--muted)" }}>Waiting: {waiting}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="row-between mb">
        <input type="date" className="plain-select" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="plain-select" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          <option value="">All doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={shown} loading={isLoading} />
    </>
  );
}

/* ---------- Cashier: lab / admission ki payments + baqi charges ---------- */
function CashierTab() {
  const { user } = useAuth();
  const { data: orders = [] } = useList(labOrdersApi, "labOrders");
  const { data: admissions = [] } = useList(admissionsApi, "admissions");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: tests = [] } = useList(labTestsApi, "labTests");
  const updateOrder = useUpdate(labOrdersApi, "labOrders");
  const updateAdm = useUpdate(admissionsApi, "admissions");
  const createOrder = useCreate(labOrdersApi, "labOrders");
  const createBill = useCreate(billsApi, "bills");
  const [method, setMethod] = useState("Cash");
  const [form, setForm] = useState({ patientId: "", testId: "" });
  const [msg, setMsg] = useState("");

  const pay = (patient, lines, extra = {}) =>
    createBill.mutateAsync(makeBill({ ...patient, lines, method, user: user?.name, ...extra }));
  const patientOfAdm = (a) => ({ patientId: a.patientId, patientName: a.patientName });

  // Jo payments abhi baqi hain
  const pending = [
    ...orders.filter((o) => o.billed === false).map((o) => ({
      key: `lab${o.id}`, patient: o.patientName, what: `Lab: ${o.testName}`, from: o.doctorName || "Reception", amount: o.price,
      collect: async () => {
        await pay({ patientId: o.patientId, patientName: o.patientName }, [{ name: o.testName, category: "Lab", amount: o.price }], { doctorId: o.doctorId, doctorName: o.doctorName });
        await updateOrder.mutateAsync({ id: o.id, billed: true, paidAt: `${today()} ${nowTime()}`, paidBy: user?.name });
      },
    })),
    ...admissions.filter((a) => a.depositPending && a.deposit > 0).map((a) => ({
      key: `dep${a.id}`, patient: a.patientName, what: `IPD advance deposit (${a.ipdNumber})`, from: "IPD admission", amount: a.deposit,
      collect: async () => {
        await pay(patientOfAdm(a), [{ name: "IPD advance deposit", category: "IPD Advance", amount: a.deposit }]);
        await updateAdm.mutateAsync({ id: a.id, depositPending: false });
      },
    })),
    ...admissions.filter((a) => a.settlementPending).map((a) => ({
      key: `set${a.id}`, patient: a.patientName, what: `IPD final settlement (${a.ipdNumber})${a.balance < 0 ? " - REFUND" : ""}`, from: "IPD discharge", amount: a.balance,
      collect: async () => {
        await pay(patientOfAdm(a), [{ name: `IPD final settlement (${a.ipdNumber})`, category: "IPD Settlement", amount: a.balance }]);
        await updateAdm.mutateAsync({ id: a.id, settlementPending: false });
      },
    })),
  ];

  const collect = async (row) => {
    setMsg("");
    await row.collect();
    setMsg(`${row.what} - ${money(row.amount)} (${method}) collect ho gaya.`);
  };

  // Reception se seedha test: order + payment aik saath (lab mein "Paid" dikhega)
  const orderTest = async () => {
    const p = findById(patients, form.patientId || patients[0]?.id);
    const t = findById(tests, form.testId || tests[0]?.id);
    if (!p || !t) return;
    await createOrder.mutateAsync({
      patientId: p.id, patientName: p.name, patientGender: p.gender, patientAge: p.age,
      testId: t.id, testName: t.name, price: t.price, date: today(), status: "Ordered",
      sampleId: null, results: [], billed: true, paidAt: `${today()} ${nowTime()}`, paidBy: user?.name,
    });
    await pay({ patientId: p.id, patientName: p.name }, [{ name: t.name, category: "Lab", amount: t.price }]);
    setMsg(`${t.name} - ${money(t.price)} (${method}) collect ho gaya, lab mein Paid dikhega.`);
  };

  return (
    <>
      {msg && <div className="success-note">{msg}</div>}
      <div className="row-between mb">
        <div className="card-title" style={{ margin: 0 }}>Pending payments (lab, admission)</div>
        <select className="plain-select" value={method} onChange={(e) => setMethod(e.target.value)}>
          {["Cash", "Card", "Online", "Bank transfer"].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <DataTable
        rows={pending.map((r) => ({ ...r, id: r.key }))}
        columns={[
          { key: "patient", label: "Patient" },
          { key: "what", label: "Item" },
          { key: "from", label: "Recommended by" },
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          { key: "act", label: "", render: (r) => (
            <Button small primary disabled={createBill.isPending} onClick={() => collect(r)}>{r.amount < 0 ? "Pay refund" : "Collect payment"}</Button>
          ) },
        ]}
      />

      <div className="card card-pad mb" style={{ marginTop: 16 }}>
        <div className="card-title">Lab test (walk-in) - order & payment</div>
        <div className="form-grid">
          <Field label="Patient" as="select" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.mrNumber} - {p.name}</option>)}
          </Field>
          <Field label="Test" as="select" value={form.testId} onChange={(e) => setForm({ ...form, testId: e.target.value })}>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.name} ({money(t.price)})</option>)}
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button primary disabled={createOrder.isPending || createBill.isPending} onClick={orderTest}>Order & collect payment</Button>
        </div>
      </div>

      <div className="card-title">Other charges (consultation, admission fee, procedures)</div>
      <Pos user={user} />
    </>
  );
}

/* ---------- Reception ke apne bills; finance wale sab dekhte hain ---------- */
function HistoryTab() {
  const { user, can } = useAuth();
  return <History onlyUser={can("finance.view") ? undefined : user.name} />;
}
