// Har user ka cash account: jo cash bills us ne banaye - jo handover owner ne receive kar liya.
// (Card / Online / Bank payment seedha clinic account mein jati hai, reception ke drawer mein nahi.)
const sum = (rows, f) => rows.reduce((s, r) => s + Number(f(r) || 0), 0);

export function accountOf(name, bills, handovers) {
  const cash = bills.filter((b) => b.user === name && b.method === "Cash");
  const mine = handovers.filter((h) => h.fromUser === name);
  const collected = sum(cash, (b) => b.total);
  const received = sum(mine.filter((h) => h.status === "received"), (h) => h.amount);
  const pending = sum(mine.filter((h) => h.status === "pending"), (h) => h.amount);
  return {
    name, collected, received, pending,
    balance: collected - received, // account mein abhi kitna cash hai
    available: collected - received - pending, // naya handover is se zyada nahi ho sakta
  };
}

export const accountNames = (bills, handovers) =>
  [...new Set([...bills.map((b) => b.user), ...handovers.map((h) => h.fromUser)].filter(Boolean))];

// Account ki entries (collections aur handovers) date ke hisab se
export function ledgerOf(name, bills, handovers) {
  const rows = [
    ...bills.filter((b) => b.user === name && b.method === "Cash").map((b) => ({
      id: `b${b.id}`, date: b.date, time: b.time, type: "Collection", ref: `${b.billNo} - ${b.patientName}`, amount: b.total,
    })),
    ...handovers.filter((h) => h.fromUser === name && h.status === "received").map((h) => ({
      id: `h${h.id}`, date: h.date, time: h.time, type: "Handover to owner", ref: h.note || `Received by ${h.receivedBy}`, amount: -h.amount,
    })),
  ];
  return rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
