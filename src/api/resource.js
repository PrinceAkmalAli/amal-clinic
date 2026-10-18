import http, { USE_MOCK } from "./http";
import { db, delay, nextId } from "./mockDb";

/*
  Aik jagah se har module ka CRUD banata hai.
    list(params) -> GET    url?search=..&date=..
    create(data) -> POST   url
    update(id,d) -> PATCH  url/id/
    remove(id)   -> DELETE url/id/
  prefill(rows, payload) sirf mock mein auto-number (MR number, token...) banata hai.
  Django mein ye kaam backend karega.
*/
export function createResource(name, url, { prefill } = {}) {
  return {
    list: async (params = {}) => {
      if (USE_MOCK) {
        const { search, ...filters } = params;
        let rows = db[name].filter((r) =>
          Object.entries(filters).every(([k, v]) => v === undefined || v === "" || String(r[k]) === String(v))
        );
        if (search) rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
        return delay(rows);
      }
      const { data } = await http.get(url, { params });
      return data;
    },
    create: async (payload) => {
      if (USE_MOCK) {
        const row = { id: nextId(), ...(prefill ? prefill(db[name], payload) : {}), ...payload };
        db[name].push(row);
        return delay(row);
      }
      const { data } = await http.post(url, payload);
      return data;
    },
    update: async (id, payload) => {
      if (USE_MOCK) {
        const row = db[name].find((r) => r.id === id);
        Object.assign(row, payload);
        return delay(row);
      }
      const { data } = await http.patch(`${url}${id}/`, payload);
      return data;
    },
    remove: async (id) => {
      if (USE_MOCK) {
        db[name] = db[name].filter((r) => r.id !== id);
        return delay({ id });
      }
      await http.delete(`${url}${id}/`);
      return { id };
    },
  };
}
