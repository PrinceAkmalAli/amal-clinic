import http, { USE_MOCK } from "./http";
import { ROLES } from "../config/roles";
import { db } from "./mockDb";

// Mock login: password "admin123".
// Email "doctor@..." = doctor, "reception@..." = receptionist, baqi = clinic admin.
export async function login({ email, password, clinicSlug }) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    // Users page se bane huay users (db.users) pehle dekhe jate hain
    const found = clinicSlug
      ? db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      : null;
    if (password !== (found?.password || "admin123"))
      throw new Error("Email ya password ghalat hai");
    if (found && found.active === false)
      throw new Error("Ye account disabled hai");
    if (!clinicSlug) {
      return {
        token: "mock",
        user: {
          name: "Platform owner",
          email,
          role: "platform_admin",
          permissions: ["*"],
        },
      };
    }
    const role = found
      ? found.role
      : email.startsWith("doctor")
      ? "doctor"
      : email.startsWith("reception")
        ? "receptionist"
        : "clinic_admin";
    return {
      token: "mock",
      user: {
        name: found?.name || email.split("@")[0],
        email,
        role,
        clinicSlug,
        // user ki apni permissions ho to wo, warna role ki default
        permissions: found?.permissions || ROLES[role].permissions,
        doctorId: role === "doctor" ? found?.doctorId || 1 : undefined, // 1 = Dr. Usman (mock)
      },
    };
  }
  // clinicSlug na ho to platform login
  const url = clinicSlug ? "/auth/clinic-login/" : "/auth/platform-login/";
  const { data } = await http.post(url, {
    email,
    password,
    clinic_slug: clinicSlug,
  });
  return data; // { token, user: { name, email, role, clinicSlug, permissions } }
}
