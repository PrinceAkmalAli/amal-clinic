import { useState } from "react";
import { Briefcase } from "lucide-react";
import {
  advancesApi,
  attendanceApi,
  expensesApi,
  payrollApi,
  staffApi,
} from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { findById, money, nowTime, today } from "../../utils/date";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Field from "../../components/ui/Field";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";
import { useTabParam } from "../../hooks/useTabParam";

const STAFF_ROLES = [
  "doctor",
  "nurse",
  "receptionist",
  "accountant",
  "lab_technician",
  "pathologist",
].map((r) => ({ value: r, label: r.replace("_", " ") }));

export default function HrmPage() {
  const [tab, setTab] = useTabParam("staff");
  return (
    <>
      <PageHeader title="HRM" icon={Briefcase} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "staff", label: "Staff profiles" },
          { key: "attendance", label: "Attendance" },
          { key: "payroll", label: "Payroll & advances" },
        ]}
      />
      {tab === "staff" && <Staff />}
      {tab === "attendance" && <Attendance />}
      {tab === "payroll" && <Payroll />}
    </>
  );
}

function Staff() {
  const { data: staff = [], isLoading } = useList(staffApi, "staff");
  const add = useCreate(staffApi, "staff");
  return (
    <>
      <FormCard
        title="Add staff"
        pending={add.isPending}
        onSubmit={(v, reset) => add.mutate(v, { onSuccess: reset })}
        fields={[
          { name: "name", label: "Name" },
          { name: "role", label: "Role", options: STAFF_ROLES },
          { name: "phone", label: "Phone" },
          { name: "salary", label: "Monthly salary (PKR)", type: "number" },
          {
            name: "commission",
            label: "Doctor commission % (doctors only)",
            type: "number",
            optional: true,
          },
        ]}
      />
      <DataTable
        loading={isLoading}
        rows={staff}
        columns={[
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
          { key: "phone", label: "Phone" },
          { key: "salary", label: "Salary", render: (s) => money(s.salary) },
          { key: "commission", label: "Commission %" },
        ]}
      />
    </>
  );
}

function Attendance() {
  const { data: staff = [] } = useList(staffApi, "staff");
  const { data: records = [] } = useList(attendanceApi, "attendance", {
    date: today(),
  });
  const create = useCreate(attendanceApi, "attendance");
  const update = useUpdate(attendanceApi, "attendance");

  const checkIn = (s) => {
    const t = nowTime();
    create.mutate({
      staffId: s.id,
      staffName: s.name,
      date: today(),
      checkIn: t,
      status: t > "09:30" ? "Late" : "Present",
    }); // 9:30 ke baad late
  };
  const leave = (s) =>
    create.mutate({
      staffId: s.id,
      staffName: s.name,
      date: today(),
      status: "Leave",
    });

  return (
    <DataTable
      rows={staff}
      columns={[
        { key: "name", label: "Staff" },
        {
          key: "status",
          label: "Today",
          render: (s) => {
            const r = records.find((x) => x.staffId === s.id);
            return r ? (
              <Badge tone={r.status === "Present" ? "success" : "warn"}>
                {r.status}
              </Badge>
            ) : (
              "-"
            );
          },
        },
        {
          key: "in",
          label: "Check-in",
          render: (s) =>
            records.find((x) => x.staffId === s.id)?.checkIn || "-",
        },
        {
          key: "out",
          label: "Check-out",
          render: (s) =>
            records.find((x) => x.staffId === s.id)?.checkOut || "-",
        },
        {
          key: "act",
          label: "",
          render: (s) => {
            const r = records.find((x) => x.staffId === s.id);
            if (!r)
              return (
                <div className="actions">
                  <Button small onClick={() => checkIn(s)}>
                    Check in
                  </Button>
                  <Button small onClick={() => leave(s)}>
                    Leave
                  </Button>
                </div>
              );
            if (r.status !== "Leave" && !r.checkOut)
              return (
                <Button
                  small
                  onClick={() =>
                    update.mutate({ id: r.id, checkOut: nowTime() })
                  }
                >
                  Check out
                </Button>
              );
            return null;
          },
        },
      ]}
    />
  );
}

function Payroll() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const { data: staff = [] } = useList(staffApi, "staff");
  const { data: advances = [] } = useList(advancesApi, "advances");
  const { data: payroll = [] } = useList(payrollApi, "payroll", { month });
  const addAdvance = useCreate(advancesApi, "advances");
  const pay = useCreate(payrollApi, "payroll");
  const addExpense = useCreate(expensesApi, "expenses");

  const advanceOf = (s) =>
    advances
      .filter((a) => a.staffId === s.id && a.date.startsWith(month))
      .reduce((t, a) => t + a.amount, 0);

  const paySalary = (s) => {
    const adv = advanceOf(s);
    const net = s.salary - adv;
    pay.mutate({
      staffId: s.id,
      staffName: s.name,
      month,
      salary: s.salary,
      advances: adv,
      net,
      paidOn: today(),
    });
    addExpense.mutate({
      category: "Salary",
      description: `${s.name} - ${month}`,
      amount: net,
      date: today(),
    }); // cash-out mein bhi entry
  };

  return (
    <>
      <FormCard
        title="Give advance"
        submitLabel="Save advance"
        pending={addAdvance.isPending}
        onSubmit={(v, reset) => {
          const s = findById(staff, v.staffId);
          if (s)
            addAdvance.mutate(
              {
                staffId: s.id,
                staffName: s.name,
                amount: v.amount,
                date: today(),
              },
              { onSuccess: reset },
            );
        }}
        fields={[
          {
            name: "staffId",
            label: "Staff",
            options: staff.map((s) => ({ value: s.id, label: s.name })),
          },
          { name: "amount", label: "Amount (PKR)", type: "number" },
        ]}
      />
      <div className="mb">
        <Field
          label="Month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>
      <DataTable
        rows={staff}
        columns={[
          { key: "name", label: "Staff" },
          { key: "salary", label: "Salary", render: (s) => money(s.salary) },
          { key: "adv", label: "Advances", render: (s) => money(advanceOf(s)) },
          {
            key: "net",
            label: "Net payable",
            render: (s) => money(s.salary - advanceOf(s)),
          },
          {
            key: "act",
            label: "",
            render: (s) =>
              payroll.some((p) => p.staffId === s.id) ? (
                <Badge tone="success">Paid</Badge>
              ) : (
                <Button small primary onClick={() => paySalary(s)}>
                  Pay salary
                </Button>
              ),
          },
        ]}
      />
    </>
  );
}
