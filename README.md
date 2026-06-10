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
- `src/models` — מודלי Mongoose: User, Company, Project, Task, Photo, Material, Alert, ActivityLog.
- `src/lib/db.ts` — חיבור ל-MongoDB עם caching לשימוש ב-Next.js.
