// Bill ka object banata hai. lines = [{ name, category, amount }]
// category: Consultation | Procedure | Lab | Admission | IPD Advance | IPD Settlement
export function makeBill({ patientId, patientName, lines, discount = 0, method = "Cash", user, doctorId, doctorName }) {
  const subtotal = lines.reduce((s, l) => s + Number(l.amount), 0);
  return {
    patientId, patientName: patientName || "Walk-in",
    lines, discount: Number(discount), total: subtotal - Number(discount),
    method, user, doctorId, doctorName,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  };
}
