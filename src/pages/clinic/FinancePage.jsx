import { useState } from "react";
import { Wallet } from "lucide-react";
import { billsApi, closingsApi, expensesApi, handoversApi } from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { money, nowTime, today } from "../../utils/date";
import { accountNames, accountOf, ledgerOf } from "../../utils/finance";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Field from "../../components/ui/Field";
import Stats from "../../components/ui/Stats";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";
import NotAuthorized from "../../components/NotAuthorized";
import { History } from "../../components/Pos";
import { useTabParam } from "../../hooks/useTabParam";

const CATEGORIES = ["Consultation", "Procedure", "Lab", "Admission", "IPD Advance", "IPD Settlement"];
const EXPENSE_TYPES = ["Rent", "Utility", "Petty cash", "Maintenance", "Salary", "Other"].map((t) => ({ value: t, label: t }));

// Billing (POS, lab/admission payments) ab front desk (OPD & Patients) mein hai.
// Yahan: accounts, handover, payment history, expenses, day-end closing.
export default function FinancePage() {
  const { user, can } = useAuth();
  const hasAccount = can(["finance.self", "finance.view", "finance.manage"]);
  const tabs = [
    ...(hasAccount ? [{ key: "accounts", label: "Accounts" }, { key: "handover", label: "Cash handover" }] : []),
    ...(can("finance.view") ? [{ key: "history", label: "Payment history" }] : []),
    ...(can("finance.expenses") ? [{ key: "expenses", label: "Expenses" }] : []),
    ...(can("finance.closing") ? [{ key: "closing", label: "Day-end closing" }] : []),
  ];
  const [tab, setTab] = useTabParam(tabs[0]?.key || "accounts");
  const allowed = tabs.some((t) => t.key === tab);

  return (
    <>
      <PageHeader title="Finance & accounts" icon={Wallet} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {!allowed && <NotAuthorized />}
      {allowed && tab === "accounts" && <Accounts user={user} canAll={can("finance.view") || can("finance.manage")} />}
      {allowed && tab === "handover" && <Handover user={user} canManage={can("finance.manage")} canAll={can("finance.view") || can("finance.manage")} />}
      {allowed && tab === "history" && <History />}
      {allowed && tab === "expenses" && <Expenses />}
      {allowed && tab === "closing" && <DayEnd user={user} />}
    </>
  );
}

/* ---------- Accounts (har user ka balance) ---------- */
function Accounts({ user, canAll }) {
  const { data: bills = [] } = useList(billsApi, "bills");
  const { data: handovers = [] } = useList(handoversApi, "handovers");
  const [selected, setSelected] = useState("");

  const names = canAll ? accountNames(bills, handovers) : [user.name];
  const view = canAll ? selected || user.name : user.name;
  const mine = accountOf(user.name, bills, handovers);
  const todayCash = bills
    .filter((b) => b.user === user.name && b.method === "Cash" && b.date === today())
    .reduce((s, b) => s + b.total, 0);

  return (
    <>
      <Stats
        items={[
          { label: "My account balance", value: money(mine.balance) },
          { label: "Collected today (cash)", value: money(todayCash) },
          { label: "Handover pending", value: money(mine.pending) },
          { label: "Available to hand over", value: money(mine.available) },
        ]}
      />

      {canAll && (
        <>
          <div className="card-title">All user accounts</div>
          <DataTable
            rows={names.map((n) => ({ id: n, ...accountOf(n, bills, handovers) }))}
            columns={[
              { key: "name", label: "User" },
              { key: "collected", label: "Total cash collected", render: (a) => money(a.collected) },
              { key: "received", label: "Handed over (received)", render: (a) => money(a.received) },
              { key: "pending", label: "Pending handover", render: (a) => money(a.pending) },
              { key: "balance", label: "Balance", render: (a) => <b>{money(a.balance)}</b> },
              { key: "act", label: "", render: (a) => <Button small onClick={() => setSelected(a.name)}>View ledger</Button> },
            ]}
          />
        </>
      )}

      <div className="card-title" style={{ marginTop: 16 }}>Ledger - {view}</div>
      <DataTable
        rows={ledgerOf(view, bills, handovers)}
        columns={[
          { key: "date", label: "Date" },
          { key: "time", label: "Time" },
          { key: "type", label: "Type" },
          { key: "ref", label: "Details" },
          { key: "amount", label: "Amount", render: (r) => <span className={r.amount < 0 ? "text-critical" : ""}>{money(r.amount)}</span> },
        ]}
      />
    </>
  );
}

/* ---------- Handover: reception owner ko cash deta hai, owner confirm kare to account se cut ---------- */
function Handover({ user, canManage, canAll }) {
  const { data: bills = [] } = useList(billsApi, "bills");
  const { data: handovers = [], isLoading } = useList(handoversApi, "handovers");
  const create = useCreate(handoversApi, "handovers");
  const update = useUpdate(handoversApi, "handovers");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const mine = accountOf(user.name, bills, handovers);
  const rows = canAll ? handovers : handovers.filter((h) => h.fromUser === user.name);

  const submit = () => {
    const n = Number(amount);
    if (!n || n <= 0) return setError("Sahi amount likhein");
    if (n > mine.available) return setError(`Aap ke account mein sirf ${money(mine.available)} available hai`);
    setError("");
    create.mutate(
      { fromUser: user.name, amount: n, note, status: "pending", date: today(), time: nowTime() },
      { onSuccess: () => { setAmount(""); setNote(""); } },
    );
  };
  const decide = (h, status) =>
    update.mutate({ id: h.id, status, receivedBy: user.name, receivedAt: `${today()} ${nowTime()}` });

  return (
    <>
      <div className="card card-pad mb">
        <div className="card-title">Owner ko cash handover (available: {money(mine.available)})</div>
        <div className="form-grid">
          <Field label="Amount (PKR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <div className="text-critical" style={{ marginTop: 8 }}>{error}</div>}
        <div style={{ marginTop: 12 }}>
          <Button primary disabled={create.isPending} onClick={submit}>Submit handover</Button>
        </div>
        <p className="hint">Owner "Receive" kare to hi amount aap ke account se cut hogi.</p>
      </div>

      <DataTable
        loading={isLoading}
        rows={[...rows].reverse()}
        columns={[
          { key: "date", label: "Date" },
          { key: "time", label: "Time" },
          { key: "fromUser", label: "From" },
          { key: "amount", label: "Amount", render: (h) => money(h.amount) },
          { key: "note", label: "Note" },
          { key: "status", label: "Status", render: (h) => <Badge tone={h.status === "received" ? "success" : h.status === "pending" ? "warn" : undefined}>{h.status}</Badge> },
          { key: "receivedBy", label: "Received by" },
          {
            key: "act",
            label: "",
            render: (h) =>
              canManage && h.status === "pending" && h.fromUser !== user.name ? (
                <div className="actions">
                  <Button small primary onClick={() => decide(h, "received")}>Receive</Button>
                  <Button small onClick={() => decide(h, "rejected")}>Reject</Button>
                </div>
              ) : null,
          },
        ]}
      />
    </>
  );
}

/* ---------- Expenses (cash-out) ---------- */
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
  const expected = cash - spent; // kharche drawer se huay maan kar
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
