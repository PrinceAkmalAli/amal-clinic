import { useState } from "react";
import { HeartPulse } from "lucide-react";
import {
  labOrdersApi,
  labTestsApi,
  patientsApi,
  prescriptionsApi,
  staffApi,
  tokensApi,
  vitalsApi,
} from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useTabParam } from "../../hooks/useTabParam";
import { daysAgo, findById, nowTime, today } from "../../utils/date";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Stats from "../../components/ui/Stats";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";

const LIVE = { refetchInterval: 10000 }; // har 10 second mein naya data
const MEDICINES = [
  "Paracetamol 500mg",
  "Amoxicillin 500mg",
  "Ibuprofen 400mg",
  "Omeprazole 20mg",
  "Cetirizine 10mg",
  "ORS",
];
const DOSAGES = ["1+0+1", "1+1+1", "0+0+1", "1+0+0", "SOS"].map((d) => ({
  value: d,
  label: d,
}));
const READY = ["Results ready", "Verified"];

export default function DoctorDeskPage() {
  const { user } = useAuth();
  const [tab, setTab] = useTabParam("queue");
  const [pick, setPick] = useState("");
  const [viewId, setViewId] = useState(null);

  const { data: staff = [] } = useList(staffApi, "staff");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: tests = [] } = useList(labTestsApi, "labTests");
  const doctors = staff.filter((s) => s.role === "doctor");
  // Doctor apne login se, admin dropdown se kisi bhi doctor ko dekh sakta hai
  const doctorId = user?.doctorId || pick || doctors[0]?.id;
  const doctor = findById(doctors, doctorId);
  const ready = !!doctorId;

  const { data: todayTokens = [] } = useList(
    tokensApi,
    "tokens",
    { doctorId, date: today() },
    ready,
    LIVE,
  );
  const { data: allTokens = [] } = useList(
    tokensApi,
    "tokens",
    { doctorId },
    ready,
  );
  const { data: labOrders = [] } = useList(
    labOrdersApi,
    "labOrders",
    { doctorId },
    ready,
    LIVE,
  );
  const { data: prescriptions = [] } = useList(
    prescriptionsApi,
    "prescriptions",
    { doctorId },
    ready,
  );
  const updateToken = useUpdate(tokensApi, "tokens");
  const updateOrder = useUpdate(labOrdersApi, "labOrders");

  const waiting = todayTokens.filter((t) => t.status === "waiting");
  const serving = todayTokens.find((t) => t.status === "in_consultation");
  const completedToday = todayTokens.filter((t) => t.status === "completed");
  const newReports = labOrders.filter(
    (o) => READY.includes(o.status) && !o.reviewed,
  );
  const report = labOrders.find((o) => o.id === viewId);

  const callIn = (t) =>
    updateToken.mutate({
      id: t.id,
      status: "in_consultation",
      calledAt: nowTime(),
    });

  const done = allTokens.filter((t) => t.status === "completed");
  const since = (d) => done.filter((t) => t.date >= d).length;

  return (
    <>
      <PageHeader
        title={`Doctor desk${doctor ? ` - ${doctor.name}` : ""}`}
        icon={HeartPulse}
      >
        {!user?.doctorId && (
          <select
            className="plain-select"
            value={doctorId || ""}
            onChange={(e) => setPick(e.target.value)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </PageHeader>

      <Stats
        items={[
          { label: "Waiting", value: waiting.length },
          {
            label: "In consultation",
            value: serving ? `#${serving.tokenNo}` : "-",
          },
          { label: "Checked today", value: completedToday.length },
          { label: "New lab reports", value: newReports.length },
        ]}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "queue", label: "Patient queue" },
          {
            key: "labs",
            label: `Lab reports${newReports.length ? ` (${newReports.length})` : ""}`,
          },
          { key: "records", label: "My records" },
        ]}
      />

      {/* ---------- Queue ---------- */}
      {tab === "queue" && ready && (
        <>
          {serving ? (
            <Consultation
              key={serving.id}
              token={serving}
              doctor={doctor}
              patient={findById(patients, serving.patientId)}
              tests={tests}
            />
          ) : (
            <div className="card card-pad mb row-between">
              <span>
                {waiting.length
                  ? `${waiting.length} patient intezar mein hain`
                  : "Koi patient intezar mein nahi"}
              </span>
              <Button
                primary
                disabled={waiting.length === 0}
                onClick={() => callIn(waiting[0])}
              >
                Call next patient
              </Button>
            </div>
          )}
          <div className="card-title">Waiting list</div>
          <DataTable
            rows={waiting}
            columns={[
              { key: "tokenNo", label: "Token" },
              { key: "patientName", label: "Patient" },
              { key: "mrNumber", label: "MR no." },
              { key: "visitType", label: "Type" },
              { key: "time", label: "Arrived" },
              {
                key: "act",
                label: "",
                render: (t) => (
                  <Button small disabled={!!serving} onClick={() => callIn(t)}>
                    Call in
                  </Button>
                ),
              },
            ]}
          />
        </>
      )}

      {/* ---------- Lab reports ---------- */}
      {tab === "labs" && (
        <>
          {report && (
            <div className="card card-pad">
              <div className="card-title">
                {report.testName} - {report.patientName} ({report.date})
              </div>
              {report.results.length === 0 ? (
                <p>Natayej abhi taiyar nahi hain.</p>
              ) : (
                <table className="mb">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Result</th>
                      <th>Unit</th>
                      <th>Normal range</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((r) => (
                      <tr
                        key={r.name}
                        className={r.flag === "Normal" ? "" : "text-critical"}
                      >
                        <td>{r.name}</td>
                        <td>{r.value}</td>
                        <td>{r.unit}</td>
                        <td>{r.range}</td>
                        <td>{r.flag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="actions">
                {!report.reviewed && READY.includes(report.status) && (
                  <Button
                    primary
                    onClick={() =>
                      updateOrder.mutate({ id: report.id, reviewed: true })
                    }
                  >
                    Mark reviewed
                  </Button>
                )}
                <Button onClick={() => window.print()}>Print</Button>
                <Button onClick={() => setViewId(null)}>Close</Button>
              </div>
            </div>
          )}
          <DataTable
            rows={[...labOrders].reverse()}
            columns={[
              { key: "date", label: "Date" },
              { key: "patientName", label: "Patient" },
              { key: "testName", label: "Test" },
              {
                key: "status",
                label: "Status",
                render: (o) => (
                  <Badge tone={READY.includes(o.status) ? "success" : "warn"}>
                    {o.status}
                  </Badge>
                ),
              },
              {
                key: "new",
                label: "",
                render: (o) =>
                  READY.includes(o.status) && !o.reviewed ? (
                    <Badge tone="success">New</Badge>
                  ) : null,
              },
              {
                key: "act",
                label: "",
                render: (o) => (
                  <Button small onClick={() => setViewId(o.id)}>
                    View
                  </Button>
                ),
              },
            ]}
          />
        </>
      )}

      {/* ---------- My records ---------- */}
      {tab === "records" && (
        <>
          <Stats
            items={[
              { label: "Patients today", value: completedToday.length },
              { label: "Last 7 days", value: since(daysAgo(7)) },
              { label: "Last 30 days", value: since(daysAgo(30)) },
              { label: "All time", value: done.length },
            ]}
          />
          <div className="card-title">Patients checked</div>
          <DataTable
            rows={[...done].reverse()}
            columns={[
              { key: "date", label: "Date" },
              { key: "time", label: "Time" },
              { key: "patientName", label: "Patient" },
              { key: "mrNumber", label: "MR no." },
              { key: "visitType", label: "Type" },
            ]}
          />
          <div className="card-title">My prescriptions</div>
          <DataTable
            rows={[...prescriptions].reverse()}
            columns={[
              { key: "date", label: "Date" },
              { key: "patientName", label: "Patient" },
              { key: "diagnosis", label: "Diagnosis" },
              { key: "medicine", label: "Medicine" },
              { key: "dosage", label: "Dosage" },
              { key: "duration", label: "Duration" },
            ]}
          />
        </>
      )}
    </>
  );
}

/* ---------- Abhi dekha ja raha patient ---------- */
function Consultation({ token, doctor, patient, tests }) {
  const { user } = useAuth();
  const { data: vitals = [] } = useList(vitalsApi, "vitals", {
    patientId: token.patientId,
  });
  const { data: history = [] } = useList(prescriptionsApi, "prescriptions", {
    patientId: token.patientId,
  });
  const { data: orders = [] } = useList(
    labOrdersApi,
    "labOrders",
    { tokenId: token.id },
    true,
    LIVE,
  );
  const addRx = useCreate(prescriptionsApi, "prescriptions");
  const addOrder = useCreate(labOrdersApi, "labOrders");
  const updateToken = useUpdate(tokensApi, "tokens");

  const v = vitals[vitals.length - 1];
  const thisVisit = history.filter((r) => r.tokenId === token.id);
  const previous = history.filter((r) => r.tokenId !== token.id);

  // Prescription patient ki history mein bhi save hoti hai aur doctor ke record mein bhi (patientId + doctorId dono)
  const saveRx = (values, reset) =>
    addRx.mutate(
      {
        patientId: token.patientId,
        patientName: token.patientName,
        tokenId: token.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        date: today(),
        time: nowTime(),
        by: user?.name,
        ...values,
      },
      { onSuccess: reset },
    );

  // Test recommend: seedha lab queue mein jata hai, billing counter par payment hoti hai
  const recommend = (values, reset) => {
    const t = findById(tests, values.testId);
    if (!t) return;
    addOrder.mutate(
      {
        patientId: token.patientId,
        patientName: token.patientName,
        patientGender: patient?.gender,
        patientAge: patient?.age,
        testId: t.id,
        testName: t.name,
        price: t.price,
        date: today(),
        status: "Ordered",
        sampleId: null,
        results: [],
        doctorId: doctor.id,
        doctorName: doctor.name,
        tokenId: token.id,
        billed: false,
        reviewed: false,
        note: values.note,
      },
      { onSuccess: reset },
    );
  };

  return (
    <>
      <div className="card card-pad mb">
        <div className="row-between">
          <div>
            <h2>
              Token #{token.tokenNo} - {token.patientName}
            </h2>
            <p style={{ color: "var(--muted)" }}>
              {token.mrNumber} | {patient?.age} yrs, {patient?.gender}
              {v
                ? ` | BP ${v.bp}, Temp ${v.temperature}, Weight ${v.weight}, Pulse ${v.pulse}`
                : " | Vitals abhi record nahi hue"}
            </p>
          </div>
          <Button
            primary
            onClick={() =>
              updateToken.mutate({ id: token.id, status: "completed" })
            }
          >
            Complete visit
          </Button>
        </div>
      </div>

      <div className="grid-2">
        <FormCard
          title="Digital prescription"
          submitLabel="Add medicine"
          pending={addRx.isPending}
          onSubmit={saveRx}
          fields={[
            { name: "diagnosis", label: "Diagnosis" },
            { name: "medicine", label: "Medicine", list: MEDICINES },
            { name: "dosage", label: "Dosage", options: DOSAGES },
            { name: "duration", label: "Duration (e.g. 5 days)" },
            { name: "instructions", label: "Instructions", optional: true },
          ]}
        />
        <FormCard
          title="Recommend lab test"
          submitLabel="Send to lab"
          pending={addOrder.isPending}
          onSubmit={recommend}
          fields={[
            {
              name: "testId",
              label: "Test",
              options: tests.map((t) => ({ value: t.id, label: t.name })),
            },
            { name: "note", label: "Note for lab", optional: true },
          ]}
        />
      </div>

      <div className="card-title">This visit - prescription</div>
      <DataTable
        rows={thisVisit}
        columns={[
          { key: "diagnosis", label: "Diagnosis" },
          { key: "medicine", label: "Medicine" },
          { key: "dosage", label: "Dosage" },
          { key: "duration", label: "Duration" },
        ]}
      />
      <div className="card-title">This visit - lab tests</div>
      <DataTable
        rows={orders}
        columns={[
          { key: "testName", label: "Test" },
          { key: "status", label: "Status" },
          {
            key: "billed",
            label: "Payment",
            render: (o) => (
              <Badge tone={o.billed === false ? "warn" : "success"}>
                {o.billed === false ? "Pending at counter" : "Paid"}
              </Badge>
            ),
          },
        ]}
      />
      <div className="card-title">Previous visits</div>
      <DataTable
        rows={[...previous].reverse()}
        columns={[
          { key: "date", label: "Date" },
          { key: "doctorName", label: "Doctor" },
          { key: "diagnosis", label: "Diagnosis" },
          { key: "medicine", label: "Medicine" },
        ]}
      />
    </>
  );
}
