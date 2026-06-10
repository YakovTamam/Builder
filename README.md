# Builder

מערכת SaaS לניהול פרויקטים בתחום הבנייה — Next.js + MongoDB.

## פיתוח מקומי

1. צור קובץ `.env.local` עם:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/builder?retryWrites=true&w=majority
   AUTH_SECRET=<מחרוזת אקראית ארוכה וסודית>
   ```
2. התקן תלויות: `npm install`
3. הרץ שרת פיתוח: `npm run dev`

## אימות (Auth)

- בכניסה ראשונה למערכת (כשאין משתמשים ב-DB), `/login` מפנה אוטומטית ל-`/setup` ליצירת חשבון מנהל-העל הראשון והחברה.
- לאחר מכן מנהל-העל יכול להוסיף משתמשים נוספים (כרגע: מנהלי פרויקט) במסך `/users`.
- ההרשאה מבוססת על JWT ב-cookie httpOnly, נבדקת ב-`src/proxy.ts`.

## מבנה

- `src/app/(dashboard)` — מסכי האדמין פאנל (RTL): דשבורד, פרויקטים, משימות, תמונות, חומרים, התראות.
- `src/models` — מודלי Mongoose: User, Company, Project, Task, Photo, Material, Alert, ActivityLog, TaskCollaborator.
- `src/lib/db.ts` — חיבור ל-MongoDB עם caching לשימוש ב-Next.js.

## מנוע התראות

- משימות באיחור (`task_overdue`) מחושבות בזמן אמת בכל טעינה של `/alerts`, ללא צורך ב-cron.
- התראות על חומרים שאיחרו (`missing_material`) ופרויקטים ללא תמונות עדכניות (`no_recent_photos`) נוצרות ע"י סריקה תקופתית.
- הסריקה מופעלת ע"י `POST /api/alerts/scan` עם header `Authorization: Bearer <ALERTS_CRON_SECRET>`.
- הפעלה אוטומטית: `.github/workflows/check-alerts.yml` רץ כל שעה דרך GitHub Actions (חינמי). יש להגדיר ב-**Settings → Secrets and variables → Actions**:
  - `ALERTS_SCAN_URL` — לדוגמה `https://builder-amber.vercel.app/api/alerts/scan`
  - `ALERTS_CRON_SECRET` — מחרוזת אקראית סודית
- יש להגדיר את אותו `ALERTS_CRON_SECRET` גם כמשתנה סביבה ב-Vercel.
