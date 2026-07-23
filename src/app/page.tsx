import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import Reveal from "./Reveal";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "🏗️",
    title: "פרויקטים ומשימות",
    body: "לוח משימות ברור, רצפי משימות ותבניות מוכנות — מהיסודות ועד המסירה.",
  },
  {
    icon: "🔗",
    title: "נתיב קריטי",
    body: "מפת ענף חזותית שמראה בדיוק מה חוסם את מה, כדי שלא תתקעו באתר.",
  },
  {
    icon: "📍",
    title: "מיקום וניווט Waze",
    body: "כתובת לכל פרויקט וכפתור ניווט ישיר ל-Waze — בלחיצה אחת מהמשרד לשטח.",
  },
  {
    icon: "👷",
    title: "פועלים והרשאות",
    body: "כל פועל רואה רק את המשימות שמשויכות אליו. שקט תפעולי, בלי בלגן.",
  },
  {
    icon: "📷",
    title: "תמונות מהשטח",
    body: "תיעוד ויזואלי מסונכרן לכל משימה ופרויקט — ההוכחה תמיד זמינה.",
  },
  {
    icon: "📦",
    title: "חומרים ולוגיסטיקה",
    body: "מעקב אחר הזמנות ואספקות, כדי שהחומר יגיע לפני שהצוות מחכה.",
  },
  {
    icon: "🔔",
    title: "התראות חכמות",
    body: "איחורים, חוסרים בחומרים וחוסר תיעוד — המערכת מתריעה לבד.",
  },
  {
    icon: "📄",
    title: "מסמכים וביטוחים",
    body: "כל האישורים במקום אחד, עם התראות לפני שתוקף פג.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "הקימו פרויקט",
    body: "הגדירו מיקום, בניינים, קומות ודירות — פעם אחת, וכל השאר נשען על זה.",
  },
  {
    n: "2",
    title: "שבצו משימות ופועלים",
    body: "עם תלויות, לוחות זמנים ושיוך אישי. המערכת בונה את הנתיב הקריטי לבד.",
  },
  {
    n: "3",
    title: "נהלו מהשטח",
    body: "עדכנו סטטוס, צלמו, וקבלו התראות — הכל מהנייד, בעברית מלאה.",
  },
];

const VALUES = [
  { icon: "📱", title: "נבנה למובייל", body: "עובד בדפדפן ובנייד כאפליקציה (PWA), עם ניווט תחתון נוח לשטח." },
  { icon: "🇮🇱", title: "עברית מלאה, RTL", body: "כל המערכת מימין לשמאל, בשפה של האתר — בלי פשרות." },
  { icon: "⚡", title: "מהיר ופשוט", body: "פחות טפסים, יותר עבודה. כל פעולה נמצאת במרחק לחיצה." },
];

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden bg-white text-gray-900">
      {/* ---- Sticky nav -------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logoUrl} alt="Builder" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold tracking-tight">Builder</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-gray-600 md:flex">
            <a href="#features" className="transition-colors hover:text-gray-900">
              יכולות
            </a>
            <a href="#how" className="transition-colors hover:text-gray-900">
              איך זה עובד
            </a>
            <a href="#why" className="transition-colors hover:text-gray-900">
              למה Builder
            </a>
          </nav>
          <Link href="/login" className="btn-primary">
            כניסה למערכת
          </Link>
        </div>
      </header>

      {/* ---- Hero -------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden">
        {/* background glows + grid */}
        <div className="lp-grid absolute inset-0 -z-10" />
        <div className="absolute -top-40 right-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl" />
        <div className="absolute -top-24 left-1/4 -z-10 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          {/* copy */}
          <div className="lp-fade text-center lg:text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              מערכת ניהול בנייה — מהמשרד ועד השטח
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              כל אתר בנייה.
              <br />
              <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                מערכת אחת.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0">
              Builder מרכזת פרויקטים, משימות, פועלים, חומרים ותמונות מהשטח — עם נתיב
              קריטי, התראות חכמות וניווט ישיר לאתר. פחות טלפונים, יותר שליטה.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="btn-primary w-full px-6 py-3 text-base sm:w-auto"
              >
                התחילו עכשיו
              </Link>
              <a href="#features" className="btn-outline w-full px-6 py-3 text-base sm:w-auto">
                גלו את היכולות
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">ללא התקנה · עובד בנייד · בעברית מלאה</p>
          </div>

          {/* product mockup */}
          <div className="relative">
            <div className="lp-float rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur">
              {/* window chrome */}
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="ms-2 text-xs text-gray-400">Builder · דשבורד</span>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { k: "פרויקטים", v: "12", tone: "text-gray-900" },
                  { k: "משימות פתוחות", v: "48", tone: "text-gray-900" },
                  { k: "באיחור", v: "3", tone: "text-red-600" },
                ].map((c) => (
                  <div key={c.k} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500">{c.k}</p>
                    <p className={`text-2xl font-bold ${c.tone}`}>{c.v}</p>
                  </div>
                ))}
              </div>

              {/* progress bars */}
              <div className="mt-3 space-y-2.5 rounded-xl border border-gray-100 bg-white p-3">
                {[
                  { name: "מגדל הדקלים", pct: 78 },
                  { name: "פרויקט הרצליה", pct: 45 },
                  { name: "שכונת הגפן", pct: 92 },
                ].map((p) => (
                  <div key={p.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{p.name}</span>
                      <span className="text-gray-400">{p.pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-l from-emerald-500 to-teal-400"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* floating chips */}
            <div className="lp-float-slow absolute -bottom-5 -left-4 hidden rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl sm:block">
              <div className="flex items-center gap-2 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-base">🚗</span>
                <div>
                  <p className="font-semibold leading-tight">ניווט ב-Waze</p>
                  <p className="text-xs text-gray-500">3 דק׳ מהמשרד</p>
                </div>
              </div>
            </div>
            <div className="lp-float absolute -top-4 -right-3 hidden rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl sm:block">
              <div className="flex items-center gap-2 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-base">🔔</span>
                <div>
                  <p className="font-semibold leading-tight">התראה חדשה</p>
                  <p className="text-xs text-gray-500">חוסר בחומר</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Stat band --------------------------------------------------- */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4">
          {[
            { v: "10+", k: "מודולים משולבים" },
            { v: "מובייל", k: "נבנה קודם לשטח" },
            { v: "RTL", k: "עברית מלאה" },
            { v: "0₪", k: "התקנה או שרתים" },
          ].map((s) => (
            <div key={s.k} className="text-center">
              <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{s.v}</p>
              <p className="mt-1 text-sm text-gray-500">{s.k}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Features ---------------------------------------------------- */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">כל מה שאתר בנייה צריך</h2>
          <p className="mt-4 text-lg text-gray-600">
            מודול לכל תחום — משולבים למערכת אחת שמדברת עם עצמה.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 80} className="h-full">
              <div className="card group h-full p-5 transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-2xl transition-colors group-hover:bg-emerald-100">
                  {f.icon}
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- How it works ------------------------------------------------ */}
      <section id="how" className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">שלושה צעדים לשליטה מלאה</h2>
            <p className="mt-4 text-lg text-gray-600">מהקמה ראשונה ועד ניהול יומיומי מהשטח.</p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100} className="h-full">
                <div className="card relative h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-l from-emerald-600 to-teal-500 text-lg font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Why / values ------------------------------------------------ */}
      <section id="why" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">נבנה לשטח, לא למצגות</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              מנהלי עבודה לא יושבים מול מחשב. Builder תוכננה מהיסוד לעבודה מהנייד, בעברית,
              עם המסכים החשובים במרחק לחיצה — כדי שהמערכת תשרת את האתר, לא להפך.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              {VALUES.map((v) => (
                <div key={v.title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl">
                    {v.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{v.title}</p>
                    <p className="text-sm text-gray-600">{v.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative rounded-3xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-gray-500">רשימת המשימות של היום</p>
                <ul className="space-y-2.5">
                  {[
                    { t: "יציקת יסודות — בניין A", done: true },
                    { t: "זיון עמודים — קומה 3", done: true },
                    { t: "טיח פנים — דירה 12", done: false },
                    { t: "בדיקת אינסטלציה", done: false },
                  ].map((item) => (
                    <li key={item.t} className="flex items-center gap-3 text-sm">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-md border text-xs ${
                          item.done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {item.done ? "✓" : ""}
                      </span>
                      <span className={item.done ? "text-gray-400 line-through" : "text-gray-800"}>
                        {item.t}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <span className="text-sm font-medium text-gray-700">מגדל הדקלים · תל אביב</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white">
                  🚗 נווט ב-Waze
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Final CTA --------------------------------------------------- */}
      <section className="px-5 pb-20">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-600 px-6 py-14 text-center shadow-xl">
            <div className="absolute -top-16 right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              מוכנים לקחת שליטה על האתר?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-emerald-50">
              היכנסו למערכת והתחילו לנהל את הפרויקטים שלכם בצורה חכמה יותר — כבר היום.
            </p>
            <div className="relative mt-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3 text-base font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
              >
                כניסה למערכת
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- Footer ------------------------------------------------------ */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logoUrl} alt="Builder" className="h-7 w-7 object-contain" />
            <span className="font-semibold">Builder</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900">
              יכולות
            </a>
            <a href="#how" className="hover:text-gray-900">
              איך זה עובד
            </a>
            <Link href="/login" className="hover:text-gray-900">
              כניסה
            </Link>
          </div>
          <span className="text-sm text-gray-400">© {new Date().getFullYear()} Builder</span>
        </div>
      </footer>
    </div>
  );
}
