import { useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { usersApi } from "../../api/resources";
import { useCreate, useList, useUpdate } from "../../hooks/useResource";
import { ROLES } from "../../config/roles";
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

// Clinic admin apne staff ke login yahan banata hai
export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: users, isLoading } = useList(usersApi, "users");
  const addUser = useCreate(usersApi, "users");
  const updateUser = useUpdate(usersApi, "users");

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (u) => ROLES[u.role]?.label || u.role },
    { key: "active", label: "Status", render: (u) => <Badge tone={u.active ? "success" : "warn"}>{u.active ? "Active" : "Disabled"}</Badge> },
    { key: "act", label: "", render: (u) => (
      <Button small onClick={() => updateUser.mutate({ id: u.id, active: !u.active })}>{u.active ? "Disable" : "Enable"}</Button>
    ) },
  ];

  return (
    <>
      <PageHeader title="Users & roles" icon={UserCog}>
        <Button primary icon={Plus} onClick={() => setShowForm(!showForm)}>Add user</Button>
      </PageHeader>
      {showForm && (
        <FormCard title="New user" fields={fields} pending={addUser.isPending}
          onSubmit={(v, reset) => addUser.mutate({ ...v, active: true }, { onSuccess: () => { reset(); setShowForm(false); } })} />
      )}
      <DataTable columns={columns} rows={users} loading={isLoading} />
    </>
  );
}
