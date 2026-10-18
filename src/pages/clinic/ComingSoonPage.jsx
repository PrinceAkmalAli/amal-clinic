import { useParams } from "react-router-dom";
import { ALL_NAV } from "../../config/navigation";
import PageHeader from "../../components/ui/PageHeader";

// Jin modules ka page abhi nahi bana unke liye placeholder
export default function ComingSoonPage() {
  const { module } = useParams();
  const item = ALL_NAV.find((n) => n.path === module);

  return (
    <>
      <PageHeader title={item?.label || "Page not found"} icon={item?.icon} />
      <div className="card empty">{item ? "Ye module jald banega." : "Ye page maujood nahi."}</div>
    </>
  );
}
