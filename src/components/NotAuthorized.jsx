import { ShieldAlert } from "lucide-react";

export default function NotAuthorized() {
  return (
    <div className="card card-pad" style={{ textAlign: "center", padding: 48 }}>
      <ShieldAlert size={40} color="#c0392b" />
      <h2 style={{ margin: "12px 0 4px" }}>You are not authorized</h2>
      <p className="hint">Aap ke paas is section ka access nahi hai. Access ke liye clinic admin se rabta karein.</p>
    </div>
  );
}
