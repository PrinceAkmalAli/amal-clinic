import { useState } from "react";
import { Wallet } from "lucide-react";
import {
  billsApi,
  closingsApi,
  expensesApi,
  labOrdersApi,
  patientsApi,
  servicesApi,
  staffApi,
} from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { findById, money, today } from "../../utils/date";
import { makeBill } from "../../utils/billing";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Stats from "../../components/ui/Stats";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import { useTabParam } from "../../hooks/useTabParam";

const CATEGORIES = [
  "Consultation",
  "Procedure",
  "Lab",
  "IPD Advance",
  "IPD Settlement",
];

const EXPENSE_TYPES = [
  "Rent",
  "Utility",
  "Petty cash",
  "Maintenance",
  "Salary",
  "Other",
].map((t) => ({ value: t, label: t }));

export default function BillingPage() {
  const { user, can } = useAuth();
  const [tab, setTab] = useTabParam("pos");
  const tabs = [
    { key: "pos", label: "POS billing & Unpaid Labs" },
    { key: "history", label: "Payment history" },
    ...(can("finance.view")
      ? [
          { key: "expenses", label: "Expenses" },
          { key: "closing", label: "Day-end closing" },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Billing & Finance Counter" icon={Wallet} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "pos" && <Pos user={user} />}
      {tab === "history" && <History />}
      {tab === "expenses" && <Expenses />}
      {tab === "closing" && <DayEnd user={user} />}
    </>
  );
}

/* ---------- POS & Unpaid Lab Orders Counter ---------- */
function Pos({ user }) {
  const { data: services = [] } = useList(servicesApi, "services");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: staff = [] } = useList(staffApi, "staff");
  const { data: labOrders = [] } = useList(labOrdersApi, "labOrders");

  const createBill = useCreate(billsApi, "bills");
  const updateLabOrder = useUpdate(labOrdersApi, "labOrders");

  const [cart, setCart] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [done, setDone] = useState("");

  const doctors = staff.filter((s) => s.role === "doctor");
  const subtotal = cart.reduce((s, l) => s + l.amount, 0);

  const addItem = () => {
    const s = findById(services, serviceId || services[0]?.id);
    if (s) {
      setCart([
        ...cart,
        {
          name: s.name,
          category: s.category || "Consultation",
          amount: s.price,
        },
      ]);
    }
  };

  // Lab order ko bill mein add karne ka quick action
  const addLabToCart = (order) => {
    // Check if already in cart
    if (cart.some((item) => item.labOrderId === order.id)) return;
    setCart([
      ...cart,
      {
        name: `Lab Test: ${order.testName}`,
        category: "Lab",
        amount: order.price,
        labOrderId: order.id,
      },
    ]);
  };

  const generate = () => {
    if (cart.length === 0) return;
    const patient = findById(patients, patientId);
    const doctor = findById(doctors, doctorId);

    createBill.mutate(
      makeBill({
        patientName: patient?.name || "Walk-in Patient",
        lines: cart,
        discount,
        method,
        user: user?.name,
        doctorId: doctor?.id,
        doctorName: doctor?.name,
      }),
      {
        onSuccess: (bill) => {
          // Agar cart mein koi lab order tha, toh usko billed: true update kar do taaki lab mein Paid show ho jaye
          cart.forEach((item) => {
            if (item.labOrderId) {
              updateLabOrder.mutate({ id: item.labOrderId, billed: true });
            }
          });

          setDone(
            `Bill #${bill.billNo} successfully generate ho gaya - Total: ${money(bill.total)}`,
          );
          setCart([]);
          setDiscount(0);
        },
      },
    );
  };

  // Unpaid lab orders jo reception/doctors se aaye hain
  const unpaidLabOrders = labOrders.filter((o) => o.billed === false);

  return (
    <>
      {done && (
        <div
          className="success-note mb"
          style={{
            padding: "10px",
            background: "#d4edda",
            color: "#155724",
            marginBottom: "15px",
            borderRadius: "4px",
          }}
        >
          {done}
        </div>
      )}

      {/* Unpaid Lab Orders Queue for Billing Counter */}
      {unpaidLabOrders.length > 0 && (
        <div
          className="card card-pad mb"
          style={{ borderLeft: "4px solid #ffc107" }}
        >
          <h3>Pending Lab Payments (Collected at Counter)</h3>
          <p className="hint mb" style={{ fontSize: "13px", color: "#666" }}>
            Neche diye gaye lab tests ki payment abhi pending hai. 'Add to POS
            Bill' par click karke bill generate karein.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Patient</th>
                  <th style={{ padding: "8px" }}>Test Name</th>
                  <th style={{ padding: "8px" }}>Price</th>
                  <th style={{ padding: "8px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaidLabOrders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid #dee2e6" }}
                  >
                    <td style={{ padding: "8px" }}>{order.patientName}</td>
                    <td style={{ padding: "8px" }}>{order.testName}</td>
                    <td style={{ padding: "8px" }}>{money(order.price)}</td>
                    <td style={{ padding: "8px" }}>
                      <Button small onClick={() => addLabToCart(order)}>
                        Add to POS Bill
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Billing POS Form */}
      <div className="card card-pad mb">
        <div className="form-grid">
          <div className="field">
            <label>Patient (optional)</label>
            <select
              className="plain-select"
              style={{ width: "100%" }}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">Walk-in</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mrNumber} - {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Doctor (Commission ke liye)</label>
            <select
              className="plain-select"
              style={{ width: "100%" }}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">None</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Service / Consultation / Procedure</label>
            <select
              className="plain-select"
              style={{ width: "100%" }}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {money(s.price)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: "end" }}>
            <Button onClick={addItem}>Add item</Button>
          </div>
        </div>
      </div>

      <DataTable
        rows={cart.map((l, i) => ({ ...l, id: i }))}
        columns={[
          { key: "name", label: "Item / Service / Lab Test" },
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount", render: (l) => money(l.amount) },
          {
            key: "x",
            label: "",
            render: (l) => (
              <Button
                small
                onClick={() => setCart(cart.filter((_, i) => i !== l.id))}
              >
                Remove
              </Button>
            ),
          },
        ]}
      />

      <div className="card card-pad mt">
        <div className="form-grid">
          <Field
            label="Discount (PKR)"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <Field
            label="Payment method"
            as="select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {["Cash", "Card", "Online", "Bank transfer"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Field>
        </div>
        <p style={{ margin: "12px 0" }}>
          Subtotal: {money(subtotal)} |{" "}
          <b>Total: {money(subtotal - Number(discount))}</b>
        </p>
        <Button
          primary
          onClick={generate}
          disabled={createBill.isPending || cart.length === 0}
        >
          Generate Bill & Verify Payment
        </Button>
      </div>
    </>
  );
}

/* ---------- Payment history ---------- */
function History() {
  const [date, setDate] = useState(today());
  const { data: bills = [], isLoading } = useList(billsApi, "bills", { date });

  return (
    <>
      <div className="mb">
        <input
          type="date"
          className="plain-select"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <DataTable
        loading={isLoading}
        rows={bills}
        columns={[
          { key: "billNo", label: "Bill #" },
          { key: "time", label: "Time" },
          { key: "patientName", label: "Patient" },
          {
            key: "items",
            label: "Items",
            render: (b) => b.lines.map((l) => l.name).join(", "),
          },
          {
            key: "discount",
            label: "Discount",
            render: (b) => money(b.discount),
          },
          { key: "total", label: "Total", render: (b) => money(b.total) },
          { key: "method", label: "Method" },
          { key: "user", label: "Collector" },
        ]}
      />
    </>
  );
}

/* ---------- Expenses (Cash-out) ---------- */
function Expenses() {
  const { data: expenses = [], isLoading } = useList(expensesApi, "expenses");
  const add = useCreate(expensesApi, "expenses");

  return (
    <>
      <FormCard
        title="New expense"
        pending={add.isPending}
        onSubmit={(v, reset) =>
          add.mutate({ ...v, date: today() }, { onSuccess: reset })
        }
        fields={[
          { name: "category", label: "Category", options: EXPENSE_TYPES },
          { name: "description", label: "Description" },
          { name: "amount", label: "Amount (PKR)", type: "number" },
        ]}
      />
      <DataTable
        loading={isLoading}
        rows={expenses}
        columns={[
          { key: "date", label: "Date" },
          { key: "category", label: "Category" },
          { key: "description", label: "Description" },
          { key: "amount", label: "Amount", render: (e) => money(e.amount) },
        ]}
      />
    </>
  );
}

/* ---------- Day-end closing ---------- */
function DayEnd({ user }) {
  const [date, setDate] = useState(today());
  const [counted, setCounted] = useState("");
  const { data: bills = [] } = useList(billsApi, "bills", { date });
  const { data: expenses = [] } = useList(expensesApi, "expenses", { date });
  const { data: closings = [] } = useList(closingsApi, "dayClosings", { date });
  const close = useCreate(closingsApi, "dayClosings");

  const lines = bills.flatMap((b) => b.lines);
  const byCat = (c) =>
    lines.filter((l) => l.category === c).reduce((s, l) => s + l.amount, 0);
  const discounts = bills.reduce((s, b) => s + b.discount, 0);
  const net = bills.reduce((s, b) => s + b.total, 0);
  const cash = bills
    .filter((b) => b.method === "Cash")
    .reduce((s, b) => s + b.total, 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const expected = cash - spent;
  const difference = Number(counted || 0) - expected;

  return (
    <>
      <div className="mb">
        <input
          type="date"
          className="plain-select"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Stats
        items={CATEGORIES.slice(0, 3)
          .map((c) => ({ label: c, value: money(byCat(c)) }))
          .concat([{ label: "Discounts", value: money(discounts) }])}
      />
      <Stats
        items={[
          { label: "IPD advance", value: money(byCat("IPD Advance")) },
          { label: "IPD settlement", value: money(byCat("IPD Settlement")) },
          { label: "Net collection", value: money(net) },
          { label: "Expenses", value: money(spent) },
        ]}
      />
      <Stats
        items={[
          { label: "Net cash", value: money(cash) },
          { label: "Online / card / bank", value: money(net - cash) },
          { label: "Profit / loss", value: money(net - spent) },
          { label: "Expected cash in drawer", value: money(expected) },
        ]}
      />
      <div className="card card-pad">
        <div className="card-title">Cash drawer reconciliation</div>
        <div className="form-grid">
          <Field
            label="Counted cash (PKR)"
            type="number"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
          <div style={{ alignSelf: "end", paddingBottom: 8 }}>
            Difference:{" "}
            <b className={difference !== 0 ? "text-critical" : ""}>
              {money(difference)}
            </b>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button
            primary
            disabled={counted === ""}
            onClick={() =>
              close.mutate({
                date,
                expected,
                counted: Number(counted),
                difference,
                closedBy: user?.name,
              })
            }
          >
            Close day
          </Button>
        </div>
      </div>
      {closings.length > 0 && (
        <DataTable
          rows={closings}
          columns={[
            { key: "date", label: "Date" },
            {
              key: "expected",
              label: "Expected",
              render: (c) => money(c.expected),
            },
            {
              key: "counted",
              label: "Counted",
              render: (c) => money(c.counted),
            },
            {
              key: "difference",
              label: "Difference",
              render: (c) => money(c.difference),
            },
            { key: "closedBy", label: "Closed by" },
          ]}
        />
      )}
    </>
  );
}
zzy;
