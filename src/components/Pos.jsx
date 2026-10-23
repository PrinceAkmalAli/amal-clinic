import { useState } from "react";
import { billsApi, patientsApi, servicesApi, staffApi } from "../api/resources";
import { useCreate, useList } from "../hooks/useResource";
import { findById, money, today } from "../utils/date";
import { makeBill } from "../utils/billing";
import Button from "./ui/Button";
import Field from "./ui/Field";
import DataTable from "./ui/DataTable";

// Front desk POS: consultation, admission fee, procedures aur baqi charges yahan se bill hote hain.
// Lab / IPD ke pending payments FrontDeskPage ke "Cashier" tab mein collect hote hain.

/* ---------- POS ---------- */
export function Pos({ user }) {
  const { data: services = [] } = useList(servicesApi, "services");
  const { data: patients = [] } = useList(patientsApi, "patients");
  const { data: staff = [] } = useList(staffApi, "staff");
  const createBill = useCreate(billsApi, "bills");
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
    if (s)
      setCart([
        ...cart,
        { name: s.name, category: s.category, amount: s.price },
      ]);
  };
  const generate = () => {
    if (cart.length === 0) return;
    const patient = findById(patients, patientId);
    const doctor = findById(doctors, doctorId);
    createBill.mutate(
      makeBill({
        patientId: patient?.id,
        patientName: patient?.name,
        lines: cart,
        discount,
        method,
        user: user?.name,
        doctorId: doctor?.id,
        doctorName: doctor?.name,
      }),
      {
        onSuccess: (bill) => {
          setDone(`Bill ${bill.billNo} ban gaya - ${money(bill.total)}`);
          setCart([]);
          setDiscount(0);
        },
      },
    );
  };

  return (
    <>
      {done && <div className="success-note">{done}</div>}
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
            <label>Doctor (commission ke liye)</label>
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
            <label>Service</label>
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
            <Button onClick={addItem}>Add to bill</Button>
          </div>
        </div>
      </div>

      <DataTable
        rows={cart.map((l, i) => ({ ...l, id: i }))}
        columns={[
          { key: "name", label: "Item" },
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

      <div className="card card-pad">
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
          Generate bill
        </Button>
      </div>
    </>
  );
}

/* ---------- Payment history ---------- */
export function History({ onlyUser }) {
  const [date, setDate] = useState(today());
  const { data: all = [], isLoading } = useList(billsApi, "bills", { date });
  const bills = onlyUser ? all.filter((b) => b.user === onlyUser) : all; // reception sirf apne bills dekhe
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
          { key: "billNo", label: "Bill" },
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
          { key: "user", label: "By" },
        ]}
      />
    </>
  );
}

