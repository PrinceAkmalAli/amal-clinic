import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { auditApi } from "../api/resources";
import { today, nowTime } from "../utils/date";

// Data lana:  const { data = [], isLoading } = useList(patientsApi, "patients", { search })
export const useList = (api, name, params, enabled = true, options = {}) =>
  useQuery({
    queryKey: [name, params],
    queryFn: () => api.list(params),
    enabled,
    ...options,
  });

// Save/Update/Delete ke baad list khud refresh hoti hai aur audit log mein entry jati hai
function useWrite(name, fn, action) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: fn,
    onSuccess: (row, vars) => {
      queryClient.invalidateQueries({ queryKey: [name] });
      if (name === "auditLogs") return;

      let detail = "";
      if (action === "updated") detail = JSON.stringify(vars).slice(0, 120);
      else if (row) detail = row.name || row.billNo || row.ipdNumber || "";

      const userName = user ? user.name : "";
      auditApi
        .create({
          user: userName,
          action,
          entity: name,
          detail,
          date: today(),
          time: nowTime(),
        })
        .then(() => queryClient.invalidateQueries({ queryKey: ["auditLogs"] }));
    },
  });
}

export const useCreate = (api, name) => useWrite(name, api.create, "created");
export const useUpdate = (api, name) =>
  useWrite(name, ({ id, ...data }) => api.update(id, data), "updated");
export const useRemove = (api, name) =>
  useWrite(name, (id) => api.remove(id), "deleted");
