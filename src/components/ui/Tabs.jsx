export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs no-print">
      {tabs.map((t) => (
        <button key={t.key} type="button" className={`tab-btn ${value === t.key ? "active" : ""}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
