import { useState } from "react";
import { Stethoscope } from "lucide-react";
import {
  labOrdersApi,
  patientsApi,
  prescriptionsApi,
  vitalsApi,
} from "../../api/resources";
import { useCreate, useList } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { nowTime, today } from "../../utils/date";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";

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

const vitalsFields = [
  { name: "bp", label: "Blood pressure (e.g. 120/80)" },
  { name: "temperature", label: "Temperature (°F)", type: "number" },
  { name: "weight", label: "Weight (kg)", type: "number" },
  { name: "pulse", label: "Pulse (bpm)", type: "number" },
];
const rxFields = [
  { name: "diagnosis", label: "Diagnosis" },
  { name: "medicine", label: "Medicine", list: MEDICINES },
  { name: "dosage", label: "Dosage", options: DOSAGES },
  { name: "duration", label: "Duration (e.g. 5 days)" },
  { name: "instructions", label: "Instructions", optional: true },
];

export default function EmrPage() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [tab, setTab] = useState("vitals");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const filter = { patientId };
  const ready = !!patientId;
  const { data: vitals = [] } = useList(vitalsApi, "vitals", filter, ready);
  const { data: rx = [] } = useList(
    prescriptionsApi,
    "prescriptions",
    filter,
    ready,
  );
  const { data: labs = [] } = useList(labOrdersApi, "labOrders", filter, ready);
  const addVitals = useCreate(vitalsApi, "vitals");
  const addRx = useCreate(prescriptionsApi, "prescriptions");

  const base = {
    patientId: Number(patientId),
    date: today(),
    time: nowTime(),
    by: user?.name,
    doctorId: user?.doctorId,
    doctorName: user?.name,
  };

  return (
    <>
      <PageHeader title="Clinical (EMR)" icon={Stethoscope} />
      <div className="mb">
        <select
          className="plain-select"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          <option value="">Select patient...</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.mrNumber} - {p.name}
            </option>
          ))}
        </select>
      </div>

      {!ready ? (
        <div className="card empty">Pehle patient select karein.</div>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "vitals", label: "Vitals" },
              { key: "rx", label: "Prescription" },
              { key: "history", label: "Medical history" },
            ]}
          />

          {tab === "vitals" && (
            <>
              <FormCard
                title="Record vitals"
                fields={vitalsFields}
                pending={addVitals.isPending}
                onSubmit={(v, reset) =>
                  addVitals.mutate({ ...base, ...v }, { onSuccess: reset })
                }
              />
              <DataTable
                rows={vitals}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "time", label: "Time" },
                  { key: "bp", label: "BP" },
                  { key: "temperature", label: "Temp" },
                  { key: "weight", label: "Weight" },
                  { key: "pulse", label: "Pulse" },
                  { key: "by", label: "By" },
                ]}
              />
            </>
          )}

          {tab === "rx" && (
            <>
              <FormCard
                title="New prescription"
                fields={rxFields}
                pending={addRx.isPending}
                onSubmit={(v, reset) =>
                  addRx.mutate({ ...base, ...v }, { onSuccess: reset })
                }
              />
              <DataTable
                rows={rx}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "diagnosis", label: "Diagnosis" },
                  { key: "medicine", label: "Medicine" },
                  { key: "dosage", label: "Dosage" },
                  { key: "duration", label: "Duration" },
                  { key: "by", label: "Doctor" },
                ]}
              />
            </>
          )}

          {tab === "history" && (
            <>
              <div className="card-title">Prescriptions & diagnoses</div>
              <DataTable
                rows={rx}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "diagnosis", label: "Diagnosis" },
                  { key: "medicine", label: "Medicine" },
                  { key: "dosage", label: "Dosage" },
                ]}
              />
              <div className="card-title">Vitals</div>
              <DataTable
                rows={vitals}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "bp", label: "BP" },
                  { key: "temperature", label: "Temp" },
                  { key: "pulse", label: "Pulse" },
                ]}
              />
              <div className="card-title">Lab reports</div>
              <DataTable
                rows={labs}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "testName", label: "Test" },
                  { key: "status", label: "Status" },
                ]}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
