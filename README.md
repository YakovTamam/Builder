# Builder

מערכת SaaS לניהול פרויקטים בתחום הבנייה — Next.js + MongoDB.

## פיתוח מקומי

1. צור קובץ `.env.local` עם:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/builder?retryWrites=true&w=majority
   AUTH_SECRET=<מחרוזת אקראית ארוכה וסודית>
   BLOB_READ_WRITE_TOKEN=<טוקן של Vercel Blob להעלאת תמונות>
   TELEGRAM_BOT_TOKEN=<טוקן הבוט מ-BotFather>
   TELEGRAM_BOT_USERNAME=<שם המשתמש של הבוט, ללא @>
   TELEGRAM_WEBHOOK_SECRET=<מחרוזת אקראית סודית לאימות ה-webhook>
   ```
   > `BLOB_READ_WRITE_TOKEN` נדרש להעלאת תמונות מהשטח. ב-Vercel: **Storage → Create → Blob**, וה-token מוזרק אוטומטית ל-deployment. לפיתוח מקומי הריצו `vercel env pull` או העתיקו את הערך מ-Vercel. ללא הטוקן, שאר המערכת פועלת אך העלאת תמונות תחזיר שגיאה ברורה.

## התראות Telegram (חינמי)

המערכת יכולה לשלוח כל התראה חדשה (משימה באיחור, חומר חוסם, אין תמונות עדכניות, תפוגת מסמך) ישירות ל-Telegram של הנמענים הרלוונטיים — מנהלי החברה, מנהל הפרויקט, ולמשימה באיחור גם הפועל המשויך.

**הגדרה חד-פעמית:**

1. צרו בוט דרך [@BotFather](https://t.me/BotFather) וקבלו `TELEGRAM_BOT_TOKEN`. הגדירו את שם המשתמש של הבוט כ-`TELEGRAM_BOT_USERNAME`.
2. בחרו מחרוזת סודית אקראית ל-`TELEGRAM_WEBHOOK_SECRET`.
3. רשמו את ה-webhook (פעם אחת), כדי ש-Telegram ידווח על לחיצות "Start":
   ```
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<הדומיין-שלכם>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
4. הגדירו את שלושת משתני הסביבה גם ב-Vercel.

**חיבור משתמש:** כל משתמש נכנס למערכת, לוחץ על "חבר Telegram" בדשבורד, פותח את הבוט ולוחץ **Start**. מאותו רגע הוא מקבל התראות. לניתוק — כפתור "נתק" בדשבורד או שליחת `/stop` לבוט. ללא הגדרת `TELEGRAM_BOT_TOKEN`, שאר המערכת פועלת רגיל וההתראות פשוט לא נשלחות.

**בוקר טוב (brief יומי):** אחת ליום המערכת יכולה לשלוח לכל פועל את רשימת המשימות שלו להיום ב-Telegram. ההפעלה זהה למנוע ההתראות — `POST /api/notify/daily` עם header `Authorization: Bearer <ALERTS_CRON_SECRET>`. הפעלה אוטומטית: `.github/workflows/daily-briefing.yml` (יש להסיר את ההערה מ-`schedule` ולהגדיר את ה-secret `DAILY_BRIEF_URL`, למשל `https://<הדומיין>/api/notify/daily`).
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
