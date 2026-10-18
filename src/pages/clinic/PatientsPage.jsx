import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { patientsApi } from "../../api/resources";
import { useCreate, useList } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";

const fields = [
  { name: "name", label: "Name" },
  { name: "age", label: "Age", type: "number" },
  { name: "gender", label: "Gender", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }] },
  { name: "phone", label: "Phone" },
  { name: "address", label: "Address", optional: true },
];

export default function PatientsPage() {
  const { can } = useAuth();
  const [params] = useSearchParams(); // topbar search se ?q=... aata hai
  const [search, setSearch] = useState(params.get("q") || "");
  const [showForm, setShowForm] = useState(false);

  const { data: patients, isLoading } = useList(patientsApi, "patients", { search });
  const addPatient = useCreate(patientsApi, "patients");

  const columns = [
    { key: "mrNumber", label: "MR number" },
    { key: "name", label: "Name" },
    { key: "gender", label: "Gender" },
    { key: "age", label: "Age" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "registeredOn", label: "Registered" },
  ];

  return (
    <>
      <PageHeader title="Patients" icon={Users}>
        {can("patients.create") && <Button primary icon={Plus} onClick={() => setShowForm(!showForm)}>Add patient</Button>}
      </PageHeader>

      {showForm && (
        <FormCard
          title="New patient (MR number auto banega)"
          fields={fields}
          pending={addPatient.isPending}
          onSubmit={(v, reset) => addPatient.mutate(v, { onSuccess: () => { reset(); setShowForm(false); } })}
        />
      )}

      <DataTable columns={columns} rows={patients} loading={isLoading} search={search} onSearch={setSearch}
        searchPlaceholder="Search by name, MR number or phone" />
    </>
  );
}
