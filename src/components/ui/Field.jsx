// Label + input/select ka chota wrapper. Select ke liye children (options) do.
export default function Field({ label, as = "input", children, ...props }) {
  const Tag = as;
  return (
    <div className="field">
      <label>{label}</label>
      <Tag {...props}>{children}</Tag>
    </div>
  );
}
