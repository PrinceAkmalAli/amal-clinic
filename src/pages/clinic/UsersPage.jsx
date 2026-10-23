import { useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { usersApi } from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { PERMISSIONS, ROLES } from "../../config/roles";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";

const fields = [
  { name: "name", label: "Name" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
  { name: "role", label: "Role", options: Object.entries(ROLES).map(([value, r]) => ({ value, label: r.label })) },
];

// Clinic admin apne staff ke login yahan banata hai aur har banday ki permissions set karta hai
export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null); // { user, perms }
  const { data: users, isLoading } = useList(usersApi, "users");
  const addUser = useCreate(usersApi, "users");
  const updateUser = useUpdate(usersApi, "users");

  const defaultsOf = (u) => ROLES[u.role]?.permissions || [];
  const startEdit = (u) => { setShowForm(false); setEdit({ user: u, perms: u.permissions || defaultsOf(u) }); };
  const toggle = (key) =>
    setEdit({ ...edit, perms: edit.perms.includes(key) ? edit.perms.filter((k) => k !== key) : [...edit.perms, key] });
  const save = (perms) =>
    updateUser.mutate({ id: edit.user.id, permissions: perms }, { onSuccess: () => setEdit(null) });

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (u) => ROLES[u.role]?.label || u.role },
    { key: "access", label: "Access", render: (u) => (defaultsOf(u).includes("*") ? "Full access" : u.permissions ? <Badge tone="warn">Custom</Badge> : "Role default") },
    { key: "active", label: "Status", render: (u) => <Badge tone={u.active ? "success" : "warn"}>{u.active ? "Active" : "Disabled"}</Badge> },
    { key: "act", label: "", render: (u) => (
      <div className="actions">
        {!defaultsOf(u).includes("*") && <Button small onClick={() => startEdit(u)}>Permissions</Button>}
        <Button small onClick={() => updateUser.mutate({ id: u.id, active: !u.active })}>{u.active ? "Disable" : "Enable"}</Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Users & roles" icon={UserCog}>
        <Button primary icon={Plus} onClick={() => { setEdit(null); setShowForm(!showForm); }}>Add user</Button>
      </PageHeader>
      {showForm && (
        <FormCard title="New user (role ki default permissions milengi, baad mein badal sakte hain)" fields={fields} pending={addUser.isPending}
          onSubmit={(v, reset) => addUser.mutate({ ...v, active: true }, { onSuccess: () => { reset(); setShowForm(false); } })} />
      )}

      {edit && (
        <div className="card card-pad mb">
          <div className="card-title">Permissions - {edit.user.name} ({ROLES[edit.user.role]?.label})</div>
          {PERMISSIONS.map((g) => (
            <div key={g.group} style={{ marginBottom: 10 }}>
              <b>{g.group}</b>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", marginTop: 4 }}>
                {g.items.map(([key, label]) => (
                  <label key={key}>
                    <input type="checkbox" checked={edit.perms.includes(key)} onChange={() => toggle(key)} /> {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button primary disabled={updateUser.isPending} onClick={() => save(edit.perms)}>Save permissions</Button>
            <Button onClick={() => save(null)}>Reset to role default</Button>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
          </div>
          <p className="hint">Naye permissions user ke agle login par lagti hain.</p>
        </div>
      )}

      <DataTable columns={columns} rows={users} loading={isLoading} />
    </>
  );
}
