// src/app/profile/page.jsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "../actions/auth";
import CopyButton from "@/app/media-details-components/CopyButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

function classNames(...x) {
  return x.filter(Boolean).join(" ");
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function fetchJSON(path, init) {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (!userId) redirect("/login");

  // Fetch profile core, stats, and recent activity from your backend:
  const [profile, stats, activity] = await Promise.all([
    fetchJSON(`/api/v1/users/${userId}`),
    fetchJSON(`/api/v1/users/${userId}/stats`),
    fetchJSON(`/api/v1/users/${userId}/activity?limit=10`),
  ]);

  const name = profile?.name || profile?.fullName || "Your Name";
  const email = profile?.email || "you@example.com";
  const joined = profile?.createdAt || profile?.joinedAt;
  const avatarUrl = profile?.avatarUrl;

  const mediaStats = {
    MOVIE: stats?.movieCount ?? 0,
    TV: stats?.tvCount ?? 0,
    MUSIC: stats?.musicCount ?? 0,
    BOOKS: stats?.booksCount ?? 0,
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <section className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-24 w-24 rounded-2xl object-cover shadow"
            />
          ) : (
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-2xl font-semibold text-slate-700 shadow">
              {initials(name)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {name}
          </h1>
          <p className="text-slate-600 mt-1">{email}</p>
          <p className="text-slate-500 text-sm mt-1">Joined {formatDate(joined)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/settings"
              className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition"
            >
              Edit profile
            </a>
            <a
              href="/collection"
              className="inline-flex items-center rounded-xl bg-black text-white px-4 py-2 text-sm hover:opacity-90 transition shadow"
            >
              View collection
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-medium mb-3">Your library</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Movies" value={mediaStats.MOVIE} href="/movie" />
          <StatCard label="TV" value={mediaStats.TV} href="/tv" />
          <StatCard label="Music" value={mediaStats.MUSIC} href="/music" />
          <StatCard label="Books" value={mediaStats.BOOKS} href="/books" />
        </div>
      </section>

      {/* Preferences & badges */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card title="Preferences">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span>Theme</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1">System</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Region</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1">NZ</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Content language</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1">English</span>
            </li>
          </ul>
        </Card>

        <Card title="Badges">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>Early Member</Badge>
            <Badge>Movie Buff</Badge>
            <Badge>Bookworm</Badge>
          </div>
        </Card>

        <Card title="Account">
          <div className="space-y-3 text-sm">
            <Row label="Plan" value={profile?.plan || "Free"} />
            <Row label="User ID" value={userId} copyable />
            <div className="pt-2">
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-50 transition"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </Card>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-medium mb-3">Recent activity</h2>
        {Array.isArray(activity) && activity.length > 0 ? (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur">
            {activity.map((evt, idx) => (
              <li key={idx} className="p-4 flex items-start gap-3">
                <div className={classNames(
                  "h-9 w-9 rounded-xl grid place-items-center text-xs font-medium",
                  iconTone(evt?.type)
                )}>
                  {iconFor(evt?.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{evt?.title || prettyType(evt?.type)}</span>
                    {evt?.detail ? <span className="text-slate-600"> — {evt.detail}</span> : null}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(evt?.createdAt)}</p>
                </div>
                {evt?.href ? (
                  <a href={evt.href} className="text-sm text-slate-600 hover:text-black">Open →</a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No recent activity"
            subtitle="Actions like adding to your collection, setting a status, or rating will appear here."
            ctaHref="/movie"
            ctaLabel="Browse now"
          />
        )}
      </section>
    </div>
  );
}

function prettyType(t) {
  return ({ ADD:"Added", RATE:"Rated", STATUS:"Updated status" }[t]) || "Updated";
}

function iconFor(t) {
  if (t === "ADD") return "＋";
  if (t === "RATE") return "★";
  if (t === "STATUS") return "☑";
  return "•";
}

function iconTone(t) {
  if (t === "ADD") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (t === "RATE") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (t === "STATUS") return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function StatCard({ label, value, href }) {
  return (
    <a
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white/70 p-4 hover:shadow transition backdrop-blur"
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </a>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
      {title ? <h3 className="text-base font-medium mb-3">{title}</h3> : null}
      {children}
    </div>
  );
}


function Row({ label, value, copyable }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900 font-medium break-all">{value}</span>
     {copyable ? (
       <form action={`/api/copy?text=${encodeURIComponent(value || "")}`}>
         <button type="submit" className="text-xs text-slate-600 hover:text-black">Copy</button>
       </form>
     ) : null}
     {copyable ? <CopyButton text={value || ''} /> : null}
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1 text-xs">
      {children}
    </span>
  );
}

function EmptyState({ title, subtitle, ctaHref, ctaLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-slate-600 mt-1 text-sm">{subtitle}</p>
      {ctaHref ? (
        <a href={ctaHref} className="inline-block mt-4 rounded-xl bg-black text-white px-4 py-2 text-sm hover:opacity-90">
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}
