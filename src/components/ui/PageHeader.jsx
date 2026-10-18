export default function PageHeader({ title, icon: Icon, children }) {
  return (
    <div className="page-header">
      <h1>
        {Icon && <Icon size={18} />}
        {title}
      </h1>
      <div>{children}</div>
    </div>
  );
}
