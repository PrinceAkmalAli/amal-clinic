import { useState } from "react";
import { Settings } from "lucide-react";
import { servicesApi, settingsApi } from "../../api/resources";
import {
  useCreate,
  useList,
  useRemove,
  useUpdate,
} from "../../hooks/useResource";
import { money } from "../../utils/date";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import FormCard from "../../components/ui/FormCard";
import DataTable from "../../components/ui/DataTable";
import { useTabParam } from "../../hooks/useTabParam";

const CATEGORIES = ["Consultation", "Procedure", "Lab"].map((c) => ({
  value: c,
  label: c,
}));

export default function SettingsPage() {
  const [tab, setTab] = useTabParam("profile");
  return (
    <>
      <PageHeader title="Settings" icon={Settings} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "profile", label: "Clinic profile" },
          { key: "rates", label: "Procedures & rate list" },
          { key: "eod", label: "Daily EOD summary" },
        ]}
      />
      {tab === "profile" && <Profile />}
      {tab === "rates" && <Rates />}
      {tab === "eod" && <Eod />}
    </>
  );
}

function useClinic() {
  const { data = [] } = useList(settingsApi, "settings");
  return { clinic: data[0], update: useUpdate(settingsApi, "settings") };
}

function Profile() {
  const { clinic, update } = useClinic();
  if (!clinic) return <div className="card empty">Loading...</div>;

  const onLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update.mutate({ id: clinic.id, logo: reader.result }); // base64 preview; Django mein file upload karein
    reader.readAsDataURL(file);
  };

  return (
    <>
      <FormCard
        key={clinic.id}
        title="Clinic details"
        initial={clinic}
        pending={update.isPending}
        onSubmit={(v) => update.mutate({ id: clinic.id, ...v })}
        fields={[
          { name: "name", label: "Clinic name" },
          { name: "address", label: "Address" },
          { name: "phone", label: "Phone" },
        ]}
      />
      <div className="card card-pad">
        <div className="card-title">Logo</div>
        {clinic.logo && (
          <img className="logo-img mb" src={clinic.logo} alt="logo" />
        )}
        <input type="file" accept="image/*" onChange={onLogo} />
      </div>
    </>
  );
}

function Rates() {
  const { data: services = [], isLoading } = useList(servicesApi, "services");
  const create = useCreate(servicesApi, "services");
  const update = useUpdate(servicesApi, "services"); // price change audit log mein jata hai
  const remove = useRemove(servicesApi, "services");
  const [editing, setEditing] = useState(null);

  const save = (v, reset) => {
    const done = {
      onSuccess: () => {
        reset();
        setEditing(null);
      },
    };
    editing
      ? update.mutate({ id: editing.id, ...v }, done)
      : create.mutate(v, done);
  };

  return (
    <>
      <FormCard
        key={editing?.id || "new"}
        title={editing ? `Edit: ${editing.name}` : "Add procedure / service"}
        initial={editing}
        submitLabel={editing ? "Update" : "Add"}
        onCancel={editing ? () => setEditing(null) : undefined}
        onSubmit={save}
        fields={[
          { name: "name", label: "Name" },
          { name: "category", label: "Category", options: CATEGORIES },
          { name: "price", label: "Fee (PKR)", type: "number" },
        ]}
      />
      <DataTable
        loading={isLoading}
        rows={services}
        columns={[
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "price", label: "Fee", render: (s) => money(s.price) },
          {
            key: "act",
            label: "",
            render: (s) => (
              <div className="actions">
                <Button small onClick={() => setEditing(s)}>
                  Edit
                </Button>
                <Button small onClick={() => remove.mutate(s.id)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

function Eod() {
  const { clinic, update } = useClinic();
  if (!clinic) return <div className="card empty">Loading...</div>;
  return (
    <>
      <p className="hint">
        Raat ko closing par owner ko poore din ki PDF summary WhatsApp / email
        par jaye gi. Bhejne ka kaam Django (scheduled task) karega; yahan sirf
        settings hain.
      </p>
      <FormCard
        key={clinic.id}
        title="Automated daily summary"
        initial={clinic}
        pending={update.isPending}
        onSubmit={(v) => update.mutate({ id: clinic.id, ...v })}
        fields={[
          {
            name: "eodEnabled",
            label: "Send daily summary",
            options: [
              { value: "No", label: "No" },
              { value: "Yes", label: "Yes" },
            ],
          },
          { name: "eodWhatsapp", label: "WhatsApp number", optional: true },
          { name: "eodEmail", label: "Email", type: "email", optional: true },
        ]}
      />
    </>
  );
}
