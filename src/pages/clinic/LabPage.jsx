import { useState } from "react";
import { FlaskConical } from "lucide-react";
import {
  billsApi,
  labOrdersApi,
  labTestsApi,
  patientsApi,
  settingsApi,
} from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { findById, today } from "../../utils/date";
import { makeBill } from "../../utils/billing";
import { flagFor, parseParameters, rangeFor, rangeText } from "../../utils/lab";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Field from "../../components/ui/Field";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";
import { useTabParam } from "../../hooks/useTabParam";

const STATUS_TONE = {
  Ordered: "warn",
  "Sample collected": "warn",
  Processing: "warn",
  "Results ready": undefined,
  Verified: "success",
};

export default function LabPage() {
  const { user } = useAuth();
  const [tab, setTab] = useTabParam("orders");
  const [panel, setPanel] = useState(null); // { id, mode: results | report }
  const [values, setValues] = useState({});
  const [remarks, setRemarks] = useState("");

  const { data: tests = [] } = useList(labTestsApi, "labTests");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: orders = [], isLoading } = useList(labOrdersApi, "labOrders");
  const { data: settings = [] } = useList(settingsApi, "settings");
  const clinic = settings[0] || {};
  const createTest = useCreate(labTestsApi, "labTests");
  const createOrder = useCreate(labOrdersApi, "labOrders");
  const updateOrder = useUpdate(labOrdersApi, "labOrders");
  const createBill = useCreate(billsApi, "bills");

  const order = orders.find((o) => o.id === panel?.id);
  const testOf = (o) => tests.find((t) => t.id === o.testId);

  /* ---------- Doctor ke recommend kiye test ka payment ---------- */
  // Billing counter "Collect payment" dabata hai: bill banta hai, phir order "paid" ho jata hai
  const collect = async (o) => {
    await createBill.mutateAsync(
      makeBill({
        patientName: o.patientName,
        user: user?.name,
        doctorId: o.doctorId,
        doctorName: o.doctorName,
        lines: [{ name: o.testName, category: "Lab", amount: o.price }],
      }),
    );
    await updateOrder.mutateAsync({ id: o.id, billed: true });
  };

  /* ---------- Catalog ---------- */
  const addTest = (v, reset) =>
    createTest.mutate(
      {
        name: v.name,
        price: v.price,
        parameters: parseParameters(v.parameters),
      },
      { onSuccess: reset },
    );

  /* ---------- Orders (reception se) ---------- */
  const placeOrder = (v, reset) => {
    const p = findById(patients, v.patientId);
    const t = findById(tests, v.testId);
    if (!p || !t) return;
    createOrder.mutate(
      {
        patientId: p.id,
        patientName: p.name,
        patientGender: p.gender,
        patientAge: p.age,
        testId: t.id,
        testName: t.name,
        price: t.price,
        date: today(),
        status: "Ordered",
        sampleId: null,
        results: [],
        billed: true, // reception par bill usi waqt ban jata hai
      },
      {
        onSuccess: () => {
          createBill.mutate(
            makeBill({
              patientName: p.name,
              user: user?.name,
              lines: [{ name: t.name, category: "Lab", amount: t.price }],
            }),
          );
          reset();
        },
      },
    );
  };

  const step = (o) => {
    if (o.status === "Ordered")
      updateOrder.mutate({
        id: o.id,
        status: "Sample collected",
        sampleId: `S-${String(o.id).padStart(5, "0")}`, // sample ID / barcode
      });
    else if (o.status === "Sample collected")
      updateOrder.mutate({ id: o.id, status: "Processing" });
    else if (o.status === "Processing") {
      setValues({});
      setPanel({ id: o.id, mode: "results" });
    } else if (o.status === "Results ready")
      updateOrder.mutate({
        id: o.id,
        status: "Verified",
        verifiedBy: user?.name,
      });
  };
  const nextLabel = {
    Ordered: "Collect sample",
    "Sample collected": "Start processing",
    Processing: "Enter results",
    "Results ready": "Verify",
  };

  const saveResults = () => {
    const t = testOf(order);
    const results = t.parameters.map((p) => {
      const range = rangeFor(p, order.patientGender);
      return {
        name: p.name,
        unit: p.unit,
        range: rangeText(range),
        value: values[p.name] ?? "",
        flag: flagFor(values[p.name], range),
      };
    });
    updateOrder.mutate(
      { id: order.id, results, status: "Results ready", enteredBy: user?.name },
      { onSuccess: () => setPanel(null) },
    );
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "patientName", label: "Patient" },
    { key: "testName", label: "Test" },
    {
      key: "doctorName",
      label: "Recommended by",
      render: (o) => o.doctorName || "Reception",
    },
    { key: "sampleId", label: "Sample ID", render: (o) => o.sampleId || "-" },
    {
      key: "status",
      label: "Status",
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>,
    },
    {
      key: "act",
      label: "",
      render: (o) => (
        <div className="actions">
          {o.billed === false && (
            <Button
              small
              primary
              disabled={createBill.isPending}
              onClick={() => collect(o)}
            >
              Collect payment
            </Button>
          )}
          {o.billed !== false && nextLabel[o.status] && (
            <Button small onClick={() => step(o)}>
              {nextLabel[o.status]}
            </Button>
          )}
          {(o.status === "Results ready" || o.status === "Verified") && (
            <Button
              small
              onClick={() => {
                setRemarks("");
                setPanel({ id: o.id, mode: "report" });
              }}
            >
              Report
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Laboratory" icon={FlaskConical} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "orders", label: "Orders & results" },
          { key: "catalog", label: "Test catalog" },
        ]}
      />

      {tab === "catalog" && (
        <>
          <FormCard
            title="Add test"
            submitLabel="Save test"
            pending={createTest.isPending}
            onSubmit={addTest}
            fields={[
              { name: "name", label: "Test name (e.g. Lipid Profile)" },
              { name: "price", label: "Price (PKR)", type: "number" },
              {
                name: "parameters",
                label: "Parameters (ek line = ek parameter)",
                type: "textarea",
                placeholder: "Hemoglobin|g/dL|13-17|12-15",
              },
            ]}
          />
          <p className="hint">
            Format: naam | unit | male range | female range (female na likhein
            to male wali range lagegi)
          </p>
          <DataTable
            rows={tests}
            columns={[
              { key: "name", label: "Test" },
              { key: "price", label: "Price" },
              {
                key: "parameters",
                label: "Parameters",
                render: (t) => t.parameters.map((p) => p.name).join(", "),
              },
            ]}
          />
        </>
      )}

      {tab === "orders" && (
        <>
          <FormCard
            title="New lab order"
            submitLabel="Order & bill"
            pending={createOrder.isPending}
            onSubmit={placeOrder}
            fields={[
              {
                name: "patientId",
                label: "Patient",
                options: patients.map((p) => ({
                  value: p.id,
                  label: `${p.mrNumber} - ${p.name}`,
                })),
              },
              {
                name: "testId",
                label: "Test",
                options: tests.map((t) => ({
                  value: t.id,
                  label: `${t.name} (PKR ${t.price})`,
                })),
              },
            ]}
          />

          {order && panel.mode === "results" && (
            <div className="card card-pad">
              <div className="card-title">
                Enter results - {order.patientName} / {order.testName}
              </div>
              {testOf(order).parameters.map((p) => {
                const range = rangeFor(p, order.patientGender);
                const flag = flagFor(values[p.name], range);
                return (
                  <div className="form-grid mb" key={p.name}>
                    <Field
                      label={`${p.name} (${p.unit}) - normal ${rangeText(range)}`}
                      type="number"
                      value={values[p.name] ?? ""}
                      onChange={(e) =>
                        setValues({ ...values, [p.name]: e.target.value })
                      }
                    />
                    <div
                      style={{ alignSelf: "end", paddingBottom: 8 }}
                      className={
                        flag && flag !== "Normal" ? "text-critical" : ""
                      }
                    >
                      {flag}
                    </div>
                  </div>
                );
              })}
              <div className="actions">
                <Button primary onClick={saveResults}>
                  Save results
                </Button>
                <Button onClick={() => setPanel(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {order && panel.mode === "report" && (
            <div className="card card-pad">
              <div className="row-between mb">
                <div>
                  {clinic.logo && (
                    <img className="logo-img" src={clinic.logo} alt="logo" />
                  )}
                  <h2>{clinic.name}</h2>
                  <p>
                    {clinic.address} | {clinic.phone}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p>
                    Sample ID: <b>{order.sampleId}</b>
                  </p>
                  <p>Date: {order.date}</p>
                </div>
              </div>
              <p className="mb">
                Patient: <b>{order.patientName}</b> | Age/Gender:{" "}
                {order.patientAge} / {order.patientGender} | Test:{" "}
                <b>{order.testName}</b>
              </p>
              <table className="mb">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference range</th>
                    <th>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {order.results.map((r) => (
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
              <div className="no-print mb">
                <Field
                  label="Pathologist remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              <p className="mb">Remarks: {remarks}</p>
              <p>
                Pathologist signature: ____________{" "}
                {order.verifiedBy && `(verified by ${order.verifiedBy})`}
              </p>
              <div className="actions no-print" style={{ marginTop: 12 }}>
                <Button primary onClick={() => window.print()}>
                  Print / save PDF
                </Button>
                <Button onClick={() => setPanel(null)}>Close</Button>
              </div>
            </div>
          )}

          <DataTable columns={columns} rows={orders} loading={isLoading} />
        </>
      )}
    </>
  );
}
