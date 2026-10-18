import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Field from "../../components/ui/Field";

// mode="platform" -> aap ka login, mode="clinic" -> clinic ka login (slug URL se)
export default function LoginPage({ mode }) {
  const { clinicSlug } = useParams();
  const { saveLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const mutation = useMutation({
    mutationFn: () => login({ ...form, clinicSlug: mode === "clinic" ? clinicSlug : undefined }),
    onSuccess: (data) => {
      saveLogin(data);
      navigate(mode === "clinic" ? `/${clinicSlug}` : "/platform/clinics");
    },
  });

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => { e.preventDefault(); mutation.mutate(); };

  return (
    <div className="login-wrap">
      <form className="card card-pad login-card" onSubmit={submit}>
        <h1>{mode === "clinic" ? clinicSlug.replace(/-/g, " ") : "Platform admin"}</h1>
        <p style={{ color: "var(--muted)" }}>Log in to continue</p>
        <Field label="Email" name="email" type="email" value={form.email} onChange={update} required />
        <Field label="Password" name="password" type="password" value={form.password} onChange={update} required />
        {mutation.isError && <p className="error">{mutation.error.message}</p>}
        <button className="btn primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Logging in..." : "Log in"}
        </button>
        <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 12 }}>Test password: admin123</p>
      </form>
    </div>
  );
}
