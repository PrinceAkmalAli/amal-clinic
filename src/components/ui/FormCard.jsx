import { useState } from "react";
import Button from "../ui/Button";
import Field from "../ui/Field";

export default function FormCard({
  title,
  subtitle,
  fields = [],
  onSubmit,
  submitLabel = "Save",
  pending,
}) {
  // Safe initial values mapping with fallback to []
  const initialValues = {};
  (fields || []).forEach((f) => {
    initialValues[f.name] = f.defaultValue ?? "";
  });

  const [values, setValues] = useState(initialValues);

  const handleChange = (name, value) => {
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values, () => setValues(initialValues));
  };

  return (
    <div className="card card-pad mb">
      {title && <div className="card-title">{title}</div>}
      {subtitle && <p className="hint mb">{subtitle}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {(fields || []).map((f) => (
          <Field
            key={f.name}
            label={f.label}
            type={f.type}
            placeholder={f.placeholder}
            value={values[f.name] ?? ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            options={f.options || []} // Safe options mapping
            as={f.as}
          />
        ))}
        <div style={{ marginTop: "12px" }}>
          <Button primary type="submit" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
