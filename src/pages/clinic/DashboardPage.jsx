import { Home } from "lucide-react";
import { useList } from "../../hooks/useResource";
import { billsApi, tokensApi, wardsApi } from "../../api/resources";
import { money, today } from "../../utils/date";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Stats from "../../components/ui/Stats";
import DataTable from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";

export default function DashboardPage() {
  const { can } = useAuth();
  const { data: tokens = [], isLoading } = useList(tokensApi, "tokens", { date: today() });
  const { data: bills = [] } = useList(billsApi, "bills", { date: today() });
  const { data: wards = [] } = useList(wardsApi, "wards");

  const collection = bills.reduce((s, b) => s + b.total, 0);
  const pending = tokens.filter((t) => t.status === "waiting").length;
  const occupied = wards.flatMap((w) => w.beds).filter((b) => b.status === "occupied").length;

  const columns = [
    { key: "tokenNo", label: "Token" },
    { key: "patientName", label: "Patient" },
    { key: "doctorName", label: "Doctor" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (t) => <Badge tone={t.status === "completed" ? "success" : "warn"}>{t.status}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Home" icon={Home} />
      <Stats items={[
        { label: "Today's patients", value: tokens.length },
        ...(can("finance.view") ? [{ label: "Cash collection", value: money(collection) }] : []),
        { label: "Pending appointments", value: pending },
        { label: "Occupied beds", value: occupied },
      ]} />
      <div className="card-title">Today's tokens</div>
      <DataTable columns={columns} rows={tokens} loading={isLoading} />
    </>
  );
}
