import { useState } from "react";
import { Ticket } from "lucide-react";
import { patientsApi, staffApi, tokensApi } from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { findById, nowTime, today } from "../../utils/date";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";

export default function OpdPage() {
  const [doctorFilter, setDoctorFilter] = useState("");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: staff = [] } = useList(staffApi, "staff");
  const { data: tokens = [], isLoading } = useList(tokensApi, "tokens", { date: today() });
  const createToken = useCreate(tokensApi, "tokens");
  const updateToken = useUpdate(tokensApi, "tokens");

  const doctors = staff.filter((s) => s.role === "doctor");
  const shown = tokens.filter((t) => !doctorFilter || String(t.doctorId) === doctorFilter);

  const fields = [
    { name: "patientId", label: "Patient", options: patients.map((p) => ({ value: p.id, label: `${p.mrNumber} - ${p.name}` })) },
    { name: "doctorId", label: "Doctor", options: doctors.map((d) => ({ value: d.id, label: d.name })) },
    { name: "visitType", label: "Visit type", options: [{ value: "new", label: "New" }, { value: "followup", label: "Follow-up" }] },
  ];

  const generate = (v, reset) => {
    const p = findById(patients, v.patientId);
    const d = findById(doctors, v.doctorId);
    if (!p || !d) return;
    createToken.mutate(
      { patientId: p.id, patientName: p.name, mrNumber: p.mrNumber, doctorId: d.id, doctorName: d.name,
        visitType: v.visitType, date: today(), time: nowTime(), status: "waiting" },
      { onSuccess: reset }
    );
  };

  const setStatus = (t, status) =>
    updateToken.mutate({ id: t.id, status, ...(status === "in_consultation" ? { calledAt: nowTime() } : {}) });

  const columns = [
    { key: "tokenNo", label: "Token" },
    { key: "patientName", label: "Patient" },
    { key: "doctorName", label: "Doctor" },
    { key: "visitType", label: "Type" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (t) => <Badge tone={t.status === "completed" ? "success" : t.status === "waiting" ? "warn" : undefined}>{t.status.replace("_", " ")}</Badge> },
    { key: "act", label: "", render: (t) => (
      <div className="actions">
        {t.status === "waiting" && <Button small onClick={() => setStatus(t, "in_consultation")}>Call in</Button>}
        {t.status === "in_consultation" && <Button small onClick={() => setStatus(t, "completed")}>Complete</Button>}
        {(t.status === "waiting" || t.status === "in_consultation") && <Button small onClick={() => setStatus(t, "cancelled")}>Cancel</Button>}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="OPD & tokens" icon={Ticket} />

      <FormCard title="Generate token" fields={fields} submitLabel="Generate token" pending={createToken.isPending} onSubmit={generate} />

      {/* Waiting room display */}
      <div className="card card-pad">
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

      <div className="row-between mb">
        <div className="card-title" style={{ margin: 0 }}>Today's queue</div>
        <select className="plain-select" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          <option value="">All doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={shown} loading={isLoading} />
    </>
  );
}
