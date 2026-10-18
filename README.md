# Clinic Portal (React frontend)

    npm install
    npm run dev

Test logins (VITE_USE_MOCK=true, password: admin123)
- Platform owner: /platform/login (any email)
- Clinic: /al-shifa/login  ->  admin@x.com (clinic admin), doctor@x.com, reception@x.com

Modules: Home, Patients, OPD & tokens, EMR, IPD & beds, Laboratory, Billing & finance,
HRM, Reports, Users & roles, Settings.

Django se jodna
1. .env mein VITE_USE_MOCK=false
2. src/api/resources.js mein har module ka URL likha hai (createResource)
3. MR number, token number, IPD number, bill number ab mock mein banta hai; Django mein backend banaye
4. Audit log, EOD WhatsApp/email, logo upload backend ka kaam hai
