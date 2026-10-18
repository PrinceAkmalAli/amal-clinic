import { useSearchParams } from "react-router-dom";

// Tab ab URL (?tab=...) se aata hai, is liye sidebar ke sub-menu aur page ke tabs sync rehte hain
export function useTabParam(defaultTab) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || defaultTab;
  const setTab = (t) => setParams({ tab: t });
  return [tab, setTab];
}
