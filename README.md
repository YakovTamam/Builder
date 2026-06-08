# Builder

מערכת SaaS לניהול פרויקטים בתחום הבנייה — Next.js + MongoDB.

## פיתוח מקומי

1. העתק `.env.example` ל-`.env.local` ועדכן `MONGODB_URI`.
2. התקן תלויות: `npm install`
3. הרץ שרת פיתוח: `npm run dev`

## מבנה

- `src/app/(dashboard)` — מסכי האדמין פאנל (RTL): דשבורד, פרויקטים, משימות, תמונות, חומרים, התראות.
- `src/models` — מודלי Mongoose: User, Company, Project, Task, Photo, Material, Alert, ActivityLog.
- `src/lib/db.ts` — חיבור ל-MongoDB עם caching לשימוש ב-Next.js.
