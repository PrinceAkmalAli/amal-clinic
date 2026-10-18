export default function Button({ primary, small, icon: Icon, children, ...props }) {
  return (
    <button type="button" className={`btn ${primary ? "primary" : ""} ${small ? "sm" : ""}`} {...props}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
