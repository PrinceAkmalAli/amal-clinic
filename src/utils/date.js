export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
export const nowTime = () => new Date().toTimeString().slice(0, 5);
// Kam az kam 1 din (admission ke din bhi rent lagta hai)
export const daysBetween = (from, to = today()) => Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
export const toMinutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const money = (n) => `PKR ${Number(n || 0).toLocaleString()}`;
export const findById = (rows, id) => rows.find((r) => String(r.id) === String(id));
