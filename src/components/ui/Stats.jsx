// items: [{ label, value }]
export default function Stats({ items }) {
  return (
    <div className="card stats" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <span className="label">{s.label}</span>
          <div className="value">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
