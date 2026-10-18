import { useState } from "react";
import { BedDouble } from "lucide-react";
import {
  admissionsApi,
  billsApi,
  patientsApi,
  wardsApi,
} from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { daysBetween, findById, money, nowTime, today } from "../../utils/date";
import { makeBill } from "../../utils/billing";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Field from "../../components/ui/Field";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";
import { useTabParam } from "../../hooks/useTabParam";

const WARD_TYPES = [
  "General",
  "Semi-Private",
  "Private",
  "ICU",
  "VIP Suite",
].map((t) => ({ value: t, label: t }));
const BED_STATUS = ["available", "maintenance", "reserved"];

export default function IpdPage() {
  const { user } = useAuth();
  const [tab, setTab] = useTabParam("admissions");
  const [active, setActive] = useState(null); // { id, mode: transfer | discharge | notes }

  const { data: wards = [] } = useList(wardsApi, "wards");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: admissions = [], isLoading } = useList(
    admissionsApi,
    "admissions",
  );
  const createWard = useCreate(wardsApi, "wards");
  const updateWard = useUpdate(wardsApi, "wards");
  const createAdm = useCreate(admissionsApi, "admissions");
  const updateAdm = useUpdate(admissionsApi, "admissions");
  const createBill = useCreate(billsApi, "bills");

  const adm = admissions.find((a) => a.id === active?.id);
  const wardOf = (a) => wards.find((w) => w.id === a.wardId);

  /* ---------- Ward & bed setup ---------- */
  const addWard = (v, reset) => {
    const beds = Array.from({ length: v.bedCount }, (_, i) => ({
      no: `Bed #${String(i + 1).padStart(2, "0")}`,
      status: "available",
    }));
    createWard.mutate(
      { name: v.name, type: v.type, ratePerDay: v.ratePerDay, beds },
      { onSuccess: reset },
    );
  };
  const setBedStatus = (ward, no, status) =>
    updateWard.mutate({
      id: ward.id,
      beds: ward.beds.map((b) => (b.no === no ? { ...b, status } : b)),
    });

  /* ---------- Admit ---------- */
  const [form, setForm] = useState({
    patientId: "",
    wardId: "",
    bedNo: "",
    reason: "",
    doctorName: "",
    emergencyContact: "",
    deposit: 0,
  });
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const formWard = findById(wards, form.wardId || wards[0]?.id);
  const freeBeds = formWard?.beds.filter((b) => b.status === "available") || [];

  const admit = async (e) => {
    e.preventDefault();
    const patient = findById(patients, form.patientId || patients[0]?.id);
    const bedNo = form.bedNo || freeBeds[0]?.no;
    if (!patient || !formWard || !bedNo) return;
    const deposit = Number(form.deposit);
    await createAdm.mutateAsync({
      patientId: patient.id,
      patientName: patient.name,
      mrNumber: patient.mrNumber,
      wardId: formWard.id,
      wardName: formWard.name,
      bedNo,
      reason: form.reason,
      doctorName: form.doctorName,
      emergencyContact: form.emergencyContact,
      deposit,
      admittedOn: today(),
      status: "admitted",
      notes: [],
      transfers: [],
    });
    await updateWard.mutateAsync({
      id: formWard.id,
      beds: formWard.beds.map((b) =>
        b.no === bedNo ? { ...b, status: "occupied" } : b,
      ),
    });
    if (deposit > 0) {
      await createBill.mutateAsync(
        makeBill({
          patientName: patient.name,
          user: user?.name,
          lines: [
            {
              name: "IPD advance deposit",
              category: "IPD Advance",
              amount: deposit,
            },
          ],
        }),
      );
    }
    setForm({
      ...form,
      reason: "",
      doctorName: "",
      emergencyContact: "",
      deposit: 0,
      bedNo: "",
    });
  };

  /* ---------- Transfer ---------- */
  const [target, setTarget] = useState({ wardId: "", bedNo: "" });
  const transfer = async () => {
    const newWard = findById(wards, target.wardId || wards[0]?.id);
    const newBed =
      target.bedNo || newWard?.beds.find((b) => b.status === "available")?.no;
    if (!newWard || !newBed) return;
    const changes = {}; // wardId -> naye beds (same ward ho to dono changes ek hi array mein)
    const beds = (w) => changes[w.id] || w.beds;
    const oldWard = wardOf(adm);
    changes[oldWard.id] = beds(oldWard).map((b) =>
      b.no === adm.bedNo ? { ...b, status: "available" } : b,
    );
    changes[newWard.id] = beds(newWard).map((b) =>
      b.no === newBed ? { ...b, status: "occupied" } : b,
    );
    for (const id of Object.keys(changes))
      await updateWard.mutateAsync({ id: Number(id), beds: changes[id] });
    await updateAdm.mutateAsync({
      id: adm.id,
      wardId: newWard.id,
      wardName: newWard.name,
      bedNo: newBed,
      transfers: [
        ...adm.transfers,
        {
          from: `${adm.wardName} / ${adm.bedNo}`,
          to: `${newWard.name} / ${newBed}`,
          date: today(),
        },
      ],
    });
    setActive(null);
  };

  /* ---------- Discharge ---------- */
  const [extra, setExtra] = useState({
    doctorVisits: 0,
    medicines: 0,
    labTests: 0,
    misc: 0,
  });
  const calc = (a) => {
    const days = daysBetween(a.admittedOn);
    const bedCharges = days * (wardOf(a)?.ratePerDay || 0);
    const total =
      bedCharges + Object.values(extra).reduce((s, n) => s + Number(n), 0);
    return { days, bedCharges, total, balance: total - a.deposit };
  };
  const discharge = async () => {
    const c = calc(adm);
    const ward = wardOf(adm);
    await updateWard.mutateAsync({
      id: ward.id,
      beds: ward.beds.map((b) =>
        b.no === adm.bedNo ? { ...b, status: "available" } : b,
      ),
    });
    await updateAdm.mutateAsync({
      id: adm.id,
      status: "discharged",
      dischargedOn: today(),
      ...c,
      charges: extra,
    });
    await createBill.mutateAsync(
      makeBill({
        patientName: adm.patientName,
        user: user?.name,
        lines: [
          {
            name: `IPD final settlement (${adm.ipdNumber})`,
            category: "IPD Settlement",
            amount: c.balance,
          },
        ],
      }),
    );
    setExtra({ doctorVisits: 0, medicines: 0, labTests: 0, misc: 0 });
    setActive(null);
  };

  /* ---------- Table ---------- */
  const columns = [
    { key: "ipdNumber", label: "IPD no." },
    { key: "patientName", label: "Patient" },
    {
      key: "bed",
      label: "Ward / bed",
      render: (a) => `${a.wardName} / ${a.bedNo}`,
    },
    { key: "doctorName", label: "Doctor" },
    { key: "admittedOn", label: "Admitted" },
    {
      key: "days",
      label: "Days",
      render: (a) =>
        a.status === "admitted" ? daysBetween(a.admittedOn) : a.days,
    },
    {
      key: "rent",
      label: "Bed charges",
      render: (a) =>
        money(
          a.status === "admitted"
            ? daysBetween(a.admittedOn) * (wardOf(a)?.ratePerDay || 0)
            : a.bedCharges,
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (a) => (
        <Badge tone={a.status === "admitted" ? "warn" : "success"}>
          {a.status}
        </Badge>
      ),
    },
    {
      key: "act",
      label: "",
      render: (a) => (
        <div className="actions">
          {a.status === "admitted" && (
            <Button
              small
              onClick={() => setActive({ id: a.id, mode: "transfer" })}
            >
              Transfer
            </Button>
          )}
          <Button small onClick={() => setActive({ id: a.id, mode: "notes" })}>
            Notes
          </Button>
          {a.status === "admitted" && (
            <Button
              small
              primary
              onClick={() => setActive({ id: a.id, mode: "discharge" })}
            >
              Discharge
            </Button>
          )}
        </div>
      ),
    },
  ];

  const c = adm ? calc(adm) : null;

  return (
    <>
      <PageHeader title="IPD & beds" icon={BedDouble} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "admissions", label: "Admissions" },
          { key: "wards", label: "Wards & beds" },
        ]}
      />

      {tab === "wards" && (
        <>
          <FormCard
            title="Add ward / room"
            submitLabel="Create ward"
            pending={createWard.isPending}
            onSubmit={addWard}
            fields={[
              { name: "name", label: "Ward name" },
              { name: "type", label: "Type", options: WARD_TYPES },
              { name: "bedCount", label: "Number of beds", type: "number" },
              {
                name: "ratePerDay",
                label: "Rent per day (PKR)",
                type: "number",
              },
            ]}
          />
          {wards.map((w) => (
            <div className="card card-pad" key={w.id}>
              <div className="card-title">
                {w.name}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  - {money(w.ratePerDay)} / day
                </span>
              </div>
              <div className="chips">
                {w.beds.map((b) => (
                  <div className="chip" key={b.no}>
                    <b>{b.no}</b>
                    {b.status === "occupied" ? (
                      <Badge tone="warn">occupied</Badge>
                    ) : (
                      <select
                        value={b.status}
                        onChange={(e) => setBedStatus(w, b.no, e.target.value)}
                      >
                        {BED_STATUS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "admissions" && (
        <>
          <form className="card card-pad" onSubmit={admit}>
            <div className="card-title">Admit patient</div>
            <div className="form-grid">
              <Field
                label="Patient"
                as="select"
                name="patientId"
                value={form.patientId}
                onChange={set}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrNumber} - {p.name}
                  </option>
                ))}
              </Field>
              <Field
                label="Ward"
                as="select"
                name="wardId"
                value={form.wardId}
                onChange={(e) =>
                  setForm({ ...form, wardId: e.target.value, bedNo: "" })
                }
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Field>
              <Field
                label="Bed"
                as="select"
                name="bedNo"
                value={form.bedNo}
                onChange={set}
              >
                {freeBeds.map((b) => (
                  <option key={b.no}>{b.no}</option>
                ))}
              </Field>
              <Field
                label="Treating doctor"
                name="doctorName"
                value={form.doctorName}
                onChange={set}
                required
              />
              <Field
                label="Reason for admission"
                name="reason"
                value={form.reason}
                onChange={set}
                required
              />
              <Field
                label="Emergency contact"
                name="emergencyContact"
                value={form.emergencyContact}
                onChange={set}
                required
              />
              <Field
                label="Advance deposit (PKR)"
                type="number"
                name="deposit"
                value={form.deposit}
                onChange={set}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Button primary type="submit" disabled={freeBeds.length === 0}>
                Admit (IPD number auto)
              </Button>
            </div>
          </form>

          {adm && active.mode === "transfer" && (
            <div className="card card-pad">
              <div className="card-title">
                Transfer {adm.patientName} (abhi: {adm.wardName} / {adm.bedNo})
              </div>
              <div className="form-grid">
                <Field
                  label="New ward"
                  as="select"
                  value={target.wardId}
                  onChange={(e) =>
                    setTarget({ wardId: e.target.value, bedNo: "" })
                  }
                >
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Field>
                <Field
                  label="New bed"
                  as="select"
                  value={target.bedNo}
                  onChange={(e) =>
                    setTarget({ ...target, bedNo: e.target.value })
                  }
                >
                  {(findById(wards, target.wardId || wards[0]?.id)?.beds || [])
                    .filter((b) => b.status === "available")
                    .map((b) => (
                      <option key={b.no}>{b.no}</option>
                    ))}
                </Field>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <Button primary onClick={transfer}>
                  Confirm transfer
                </Button>
                <Button onClick={() => setActive(null)}>Close</Button>
              </div>
              {adm.transfers.length > 0 && (
                <p className="hint" style={{ marginTop: 10 }}>
                  History:{" "}
                  {adm.transfers
                    .map((t) => `${t.date}: ${t.from} → ${t.to}`)
                    .join(" | ")}
                </p>
              )}
            </div>
          )}

          {adm && active.mode === "discharge" && (
            <div className="card card-pad">
              <div className="card-title">
                Discharge {adm.patientName} ({adm.ipdNumber})
              </div>
              <div className="form-grid">
                {[
                  ["doctorVisits", "Doctor visits"],
                  ["medicines", "Medicines"],
                  ["labTests", "Lab tests"],
                  ["misc", "Miscellaneous"],
                ].map(([k, label]) => (
                  <Field
                    key={k}
                    label={`${label} (PKR)`}
                    type="number"
                    value={extra[k]}
                    onChange={(e) =>
                      setExtra({ ...extra, [k]: e.target.value })
                    }
                  />
                ))}
              </div>
              <p style={{ margin: "12px 0" }}>
                Stay: <b>{c.days} days</b> | Bed charges:{" "}
                <b>{money(c.bedCharges)}</b> | Total: <b>{money(c.total)}</b> |
                Deposit: <b>{money(adm.deposit)}</b> |{" "}
                {c.balance >= 0 ? "Balance to collect" : "Refund"}:{" "}
                <b>{money(Math.abs(c.balance))}</b>
              </p>
              <div className="actions">
                <Button primary onClick={discharge}>
                  Discharge & collect
                </Button>
                <Button onClick={() => window.print()}>Print summary</Button>
                <Button onClick={() => setActive(null)}>Close</Button>
              </div>
            </div>
          )}

          {adm && active.mode === "notes" && (
            <>
              <FormCard
                title={`Nursing / doctor notes - ${adm.patientName}`}
                submitLabel="Add note"
                pending={updateAdm.isPending}
                onCancel={() => setActive(null)}
                fields={[
                  {
                    name: "type",
                    label: "Type",
                    options: ["Daily round", "Vitals", "Treatment"].map(
                      (t) => ({ value: t, label: t }),
                    ),
                  },
                  { name: "text", label: "Note", type: "textarea" },
                ]}
                onSubmit={(v, reset) =>
                  updateAdm.mutate(
                    {
                      id: adm.id,
                      notes: [
                        ...adm.notes,
                        {
                          ...v,
                          by: user?.name,
                          date: today(),
                          time: nowTime(),
                        },
                      ],
                    },
                    { onSuccess: reset },
                  )
                }
              />
              <DataTable
                rows={[...adm.notes].reverse()}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "time", label: "Time" },
                  { key: "type", label: "Type" },
                  { key: "text", label: "Note" },
                  { key: "by", label: "By" },
                ]}
              />
            </>
          )}

          <DataTable columns={columns} rows={admissions} loading={isLoading} />
        </>
      )}
    </>
  );
}
