import { Search } from "lucide-react";

/*
  columns: [{ key, label, render?: (row) => JSX }]
  search + onSearch dene par upar search box aata hai
*/
export default function DataTable({ columns, rows = [], loading, search, onSearch, searchPlaceholder = "Search" }) {
  return (
    <div className="card">
      {onSearch && (
        <div className="toolbar">
          <Search size={14} />
          <input value={search ?? ""} placeholder={searchPlaceholder} onChange={(e) => onSearch(e.target.value)} />
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="empty">Loading...</div>}
      {!loading && rows.length === 0 && <div className="empty">Koi record nahi mila</div>}
    </div>
  );
}
