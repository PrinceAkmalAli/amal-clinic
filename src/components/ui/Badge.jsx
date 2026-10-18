// tone: "success" | "warn" | undefined
export default function Badge({ tone, children }) {
  return <span className={`badge ${tone || ""}`}>{children}</span>;
}
