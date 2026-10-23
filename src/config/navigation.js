import {
  Home,
  Users,
  Stethoscope,
  Briefcase,
  Wallet,
  BedDouble,
  FlaskConical,
  BarChart3,
  Settings,
  UserCog,
  HeartPulse,
} from "lucide-react";

/*
  Menu yahan se banta hai.
  children: [{ label, tab, isDefault?, permission? }]  -> sub-menu, URL mein ?tab=... lagta hai
  title: section ka heading (jaise Shopify mein "Sales channels")
*/
export const NAV_GROUPS = [
  {
    items: [
      { label: "Home", path: "", icon: Home, permission: "dashboard.view" },
      {
        label: "OPD & Patients",
        path: "patients",
        icon: Users,
        permission: ["reception.view", "patients.view"],
        children: [
          { label: "Patients", tab: "patients", isDefault: true, permission: "patients.view" },
          { label: "Register & book", tab: "register", permission: "patients.create" },
          { label: "Appointments & queue", tab: "queue", permission: "opd.view" },
          { label: "Cashier (payments)", tab: "cashier", permission: "billing.collect" },
          { label: "My payment history", tab: "history", permission: "billing.collect" },
        ],
      },
      {
        label: "Doctor desk",
        path: "doctor",
        icon: HeartPulse,
        permission: "doctor.desk",
        children: [
          { label: "Patient queue", tab: "queue", isDefault: true },
          { label: "Lab reports", tab: "labs" },
          { label: "My records", tab: "records" },
        ],
      },

      {
        label: "Clinical (EMR)",
        path: "emr",
        icon: Stethoscope,
        permission: "emr.view",
      },
      {
        label: "IPD & beds",
        path: "ipd",
        icon: BedDouble,
        permission: "ipd.view",
        children: [
          { label: "Admissions", tab: "admissions", isDefault: true },
          { label: "Wards & beds", tab: "wards" },
        ],
      },
      {
        label: "Laboratory",
        path: "lab",
        icon: FlaskConical,
        permission: "lab.view",
        children: [
          { label: "Orders & results", tab: "orders", isDefault: true },
          { label: "Test catalog", tab: "catalog" },
        ],
      },
      {
        label: "Finance & accounts",
        path: "finance",
        icon: Wallet,
        permission: ["finance.self", "finance.view", "finance.manage", "finance.expenses", "finance.closing"],
        children: [
          { label: "Accounts", tab: "accounts", isDefault: true, permission: ["finance.self", "finance.view", "finance.manage"] },
          { label: "Cash handover", tab: "handover", permission: ["finance.self", "finance.view", "finance.manage"] },
          { label: "Payment history", tab: "history", permission: "finance.view" },
          { label: "Expenses", tab: "expenses", permission: "finance.expenses" },
          { label: "Day-end closing", tab: "closing", permission: "finance.closing" },
        ],
      },
      {
        label: "HRM",
        path: "hrm",
        icon: Briefcase,
        permission: "hrm.view",
        children: [
          { label: "Staff profiles", tab: "staff", isDefault: true },
          { label: "Attendance", tab: "attendance" },
          { label: "Payroll & advances", tab: "payroll" },
        ],
      },
      {
        label: "Reports",
        path: "reports",
        icon: BarChart3,
        permission: "reports.view",
        children: [
          { label: "OPD & patient flow", tab: "opd", isDefault: true },
          { label: "IPD & beds", tab: "ipd" },
          { label: "Laboratory", tab: "lab" },
          { label: "Financial", tab: "finance" },
          { label: "HRM", tab: "hrm" },
          { label: "Audit & security", tab: "audit" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Users & roles",
        path: "users",
        icon: UserCog,
        permission: "users.manage",
      },
      {
        label: "Settings",
        path: "settings",
        icon: Settings,
        permission: "settings.manage",
        children: [
          { label: "Clinic profile", tab: "profile", isDefault: true },
          { label: "Rate list", tab: "rates" },
          { label: "Daily EOD summary", tab: "eod" },
        ],
      },
    ],
  },
];

// RecentTabs aur ComingSoon page isay use karte hain
export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
