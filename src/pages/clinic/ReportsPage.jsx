import { useState } from "react";
import { BarChart3, Download, Printer } from "lucide-react";
import {
  admissionsApi,
  attendanceApi,
  auditApi,
  billsApi,
  expensesApi,
  labOrdersApi,
  payrollApi,
  staffApi,
  tokensApi,
  wardsApi,
} from "../../api/resources";
import { useList } from "../../hooks/useResource";
import { daysAgo, today } from "../../utils/date";
import { exportCsv } from "../../utils/exportCsv";
import { REPORT_GROUPS } from "../../reports/definitions";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import DataTable from "../../components/ui/DataTable";
import { useTabParam } from "../../hooks/useTabParam";

export default function ReportsPage() {
  const [group, setGroup] = useTabParam("opd");
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());

  // Saara data aik dafa load; reports sab isi se hisab hoti hain
  const { data: tokens = [] } = useList(tokensApi, "tokens");
  const { data: wards = [] } = useList(wardsApi, "wards");
  const { data: admissions = [] } = useList(admissionsApi, "admissions");
  const { data: labOrders = [] } = useList(labOrdersApi, "labOrders");
  const { data: bills = [] } = useList(billsApi, "bills");
  const { data: expenses = [] } = useList(expensesApi, "expenses");
  const { data: staff = [] } = useList(staffApi, "staff");
  const { data: attendance = [] } = useList(attendanceApi, "attendance");
  const { data: payroll = [] } = useList(payrollApi, "payroll");
  const { data: auditLogs = [] } = useList(auditApi, "auditLogs");

  const data = {
    from,
    to,
    tokens,
    wards,
    admissions,
    labOrders,
    bills,
    expenses,
    staff,
    attendance,
    payroll,
    auditLogs,
  };
  const current = REPORT_GROUPS.find((g) => g.key === group);

  return (
    <>
      <PageHeader title="Reports" icon={BarChart3} />
      <Tabs
        value={group}
        onChange={setGroup}
        tabs={REPORT_GROUPS.map((g) => ({ key: g.key, label: g.label }))}
      />
      <div className="form-grid mb no-print">
        <Field
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Field
          label="To"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {current.reports.map((r) => {
        const rows = r.rows(data);
        return (
          <div key={r.title}>
            <div className="row-between mb">
              <div className="card-title" style={{ margin: 0 }}>
                {r.title}
              </div>
              <div className="actions no-print">
                <Button
                  small
                  icon={Download}
                  onClick={() => exportCsv(r.title, r.columns, rows)}
                >
                  Excel / CSV
                </Button>
                <Button small icon={Printer} onClick={() => window.print()}>
                  PDF / Print
                </Button>
              </div>
            </div>
            <DataTable columns={r.columns} rows={rows} />
          </div>
        );
      })}
    </>
  );
}
