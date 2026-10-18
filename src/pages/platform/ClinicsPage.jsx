import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { createClinic, getClinics } from "../../api/clinics";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Field from "../../components/ui/Field";
import DataTable from "../../components/ui/DataTable";

const emptyForm = { name: "", slug: "", adminEmail: "", adminPassword: "" };

export default function ClinicsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: clinics, isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: getClinics,
  });

  const addClinic = useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinics"] }); // list dobara load
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    addClinic.mutate(form);
  };

  const columns = [
    { key: "name", label: "Clinic" },
    { key: "slug", label: "Login URL", render: (c) => `/${c.slug}/login` },
    { key: "adminEmail", label: "Admin email" },
    {
      key: "status",
      label: "Status",
      render: (c) => <Badge tone="success">{c.status}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="Clinics" icon={Building2}>
        <Button primary icon={Plus} onClick={() => setShowForm(!showForm)}>
          Register clinic
        </Button>
      </PageHeader>

      {showForm && (
        <form className="card card-pad" onSubmit={submit}>
          <div className="card-title">New clinic</div>
          <div className="form-grid">
            <Field
              label="Clinic name"
              name="name"
              value={form.name}
              onChange={update}
              required
            />
            <Field
              label="URL slug (e.g. al-shifa)"
              name="slug"
              value={form.slug}
              onChange={update}
              required
            />
            <Field
              label="Admin email"
              name="adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={update}
              required
            />
            <Field
              label="Admin password"
              name="adminPassword"
              type="password"
              value={form.adminPassword}
              onChange={update}
              required
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <Button primary type="submit" disabled={addClinic.isPending}>
              {addClinic.isPending ? "Saving..." : "Save clinic"}
            </Button>
          </div>
        </form>
      )}

      <DataTable columns={columns} rows={clinics} loading={isLoading} />
    </>
  );
}
