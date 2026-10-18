import { useState } from "react";
import Field from "./Field";
import Button from "./Button";

/*
  Chota reusable form. fields:
   { name, label, type?: "text|number|date|textarea", options?: [{value,label}], list?: ["a","b"], optional?: true }
  onSubmit(values, reset) - save kamyab hone par reset() call karein.
*/
const startValues = (fields, initial) =>
  Object.fromEntries(fields.map((f) => [f.name, initial?.[f.name] ?? (f.options ? f.options[0]?.value ?? "" : "")]));

export default function FormCard({ title, fields, onSubmit, pending, submitLabel = "Save", onCancel, initial }) {
  const [values, setValues] = useState(() => startValues(fields, initial));
  const update = (e) => setValues({ ...values, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const out = { ...values };
    fields.forEach((f) => {
      if (f.options && !out[f.name]) out[f.name] = f.options[0]?.value ?? ""; // select ka default
      if (f.type === "number") out[f.name] = Number(out[f.name] || 0);
    });
    onSubmit(out, () => setValues(startValues(fields)));
  };

  return (
    <form className="card card-pad" onSubmit={submit}>
      {title && <div className="card-title">{title}</div>}
      <div className="form-grid">
        {fields.map((f) =>
          f.options ? (
            <Field key={f.name} label={f.label} as="select" name={f.name} value={values[f.name]} onChange={update}>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Field>
          ) : f.type === "textarea" ? (
            <Field key={f.name} label={f.label} as="textarea" rows={4} name={f.name} value={values[f.name]} onChange={update} placeholder={f.placeholder} required={!f.optional} />
          ) : (
            <div key={f.name}>
              <Field label={f.label} type={f.type || "text"} name={f.name} value={values[f.name]} onChange={update}
                list={f.list ? `${f.name}-list` : undefined} required={!f.optional} />
              {f.list && <datalist id={`${f.name}-list`}>{f.list.map((x) => <option key={x} value={x} />)}</datalist>}
            </div>
          )
        )}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button primary type="submit" disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
