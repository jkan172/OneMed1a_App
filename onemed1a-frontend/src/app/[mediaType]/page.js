import MediaGrid from "@/components/MediaGrid";
import { getUserMediaByUserId } from "@/api/mediaAPI";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/";

const normalizeTypeKey = (t = "") => {
  const key = String(t).toLowerCase();
  if (key === "movie") return "movie";
  if (key === "tv") return "tv";
  if (key === "music" || key === "audio") return "music";
  if (key === "books" || key === "book") return "books";
  return key;
};

// Map route key -> backend media type
const typeMap = {
  movie: "MOVIE",
  tv: "TV",
  music: "MUSIC",
  books: "BOOKS",
};

const toYear = (dateStr) => (dateStr ? Number(String(dateStr).slice(0, 4)) : undefined);

function isFullUrl(value) { return typeof value === "string" && /^https?:\/\//i.test(value); }
function withSize(path, size) {
  if (!path) return null;
  if (isFullUrl(path)) return path;
  const p = String(path).startsWith("/") ? String(path) : `/${path}`;
  return `${TMDB_IMG_BASE}${size}${p}`;
}
function pickCover(posterPath, backdropPath, posterSize = "w342", backdropSize = "w780") {
  return withSize(posterPath, posterSize) || withSize(backdropPath, backdropSize) || "/next.svg";
}

/**
 * Media page, showing grid of media items for a given media type (movie, tv, music, books).
 * @param {{ params: Promise<{ mediaType: string }> }} props
 */
export default async function MediaPage({ params }) {
  const { mediaType: rawMediaType } = await params;
  const mediaTypeKey = normalizeTypeKey(rawMediaType);
  const wantedType = typeMap[mediaTypeKey];

  // Optional: guard unknown types
  if (!wantedType) redirect("/");

  const cookieStore = await cookies(); // cookies() is async in Next 15
  const userId = cookieStore.get("userId")?.value;
  if (!userId) redirect("/");

  // Load user's tracked statuses
  let raw = [];
  try {
    raw = (await getUserMediaByUserId(userId)) ?? [];
  } catch (e) {
    console.error("Failed to load user media:", e);
  }

  // Always fetch external discover list for this media type so we can show unrated items
  let external = [];
  if (["movie", "tv", "music", "books"].includes(mediaTypeKey)) {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      const url =
        mediaTypeKey === "tv"
          ? `${base}/api/v1/externalMediaData/tv`
          : mediaTypeKey === "music"
          ? `${base}/api/v1/externalMediaData/music`
          : mediaTypeKey === "books"
          ? `${base}/api/v1/externalMediaData/books`
          : `${base}/api/v1/externalMediaData/movies`;

      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        external = Array.isArray(data) ? data : [];
      } else {
        console.error("Discover fetch failed:", res.status, await res.text());
      }
    } catch (e) {
      console.error("Discover fetch error:", e);
    }
  }

  // Build external items and alias maps to canonicalize ids (mediaId and externalMediaId)
  const externalMap = new Map();
  const aliasMap = new Map();
  const externalItems = external.map((m) => {
    const idKey = m.mediaId || m.externalMediaId || m.id;
    const canonical = String(idKey);
    const item = {
      id: canonical,
      title: m.title ?? "Untitled",
      type: (m.type || "").toLowerCase(),
      year: (m.releaseDate || "").slice(0, 4) || undefined,
      rating: m.rating || undefined,
      coverUrl: pickCover(m.posterUrl, m.backdropUrl),
      href: `/collection/${(m.type || "").toLowerCase()}/${canonical}`,
      _raw: m,
    };
    externalMap.set(canonical, item);
    if (m.externalMediaId) aliasMap.set(String(m.externalMediaId), canonical);
    if (m.mediaId) aliasMap.set(String(m.mediaId), canonical);
    return item;
  });

  // Overlay tracked statuses onto external items, matching by mediaId or externalMediaId.
  const itemsMap = new Map();
  for (const it of externalItems) itemsMap.set(String(it.id), { ...it });

  const byWantedType = raw.filter((ums) => ums?.media?.type === wantedType);
  for (const ums of byWantedType) {
    const m = ums.media ?? {};
    const umsInternal = m.mediaId ? String(m.mediaId) : null;
    const umsExternal = m.externalMediaId ? String(m.externalMediaId) : null;

    // resolve canonical id
    let canonical = null;
    if (umsInternal && itemsMap.has(umsInternal)) canonical = umsInternal;
    else if (umsExternal && aliasMap.has(umsExternal)) canonical = aliasMap.get(umsExternal);
    else if (umsExternal && itemsMap.has(umsExternal)) canonical = umsExternal;
    else if (umsInternal && aliasMap.has(umsInternal)) canonical = aliasMap.get(umsInternal);

    if (canonical) {
      const base = itemsMap.get(canonical) || externalMap.get(canonical) || {};
      itemsMap.set(canonical, {
        ...base,
        status: ums.status,
        rating: ums.rating ?? base.rating,
        href: `/collection/${(m.type || "").toLowerCase()}/${m.mediaId ?? ums.id}`,
      });
      if (umsExternal) aliasMap.set(umsExternal, canonical);
      if (umsInternal) aliasMap.set(umsInternal, canonical);
    } else {
      // Try a best-effort title+year match as a last resort to avoid duplicates
      const titleKey = (m.title || "").trim().toLowerCase();
      const yearKey = toYear(m.releaseDate) || (m.releaseDate ? String(m.releaseDate).slice(0,4) : undefined);
      let fallbackCanonical = null;
      if (titleKey) {
        for (const [extId, extItem] of externalMap.entries()) {
          const extTitle = (extItem.title || "").trim().toLowerCase();
          const extYear = extItem.year || undefined;
          if (extTitle && extTitle === titleKey && (yearKey == null || extYear == null || String(extYear) === String(yearKey))) {
            fallbackCanonical = extId;
            break;
          }
        }
      }
      if (fallbackCanonical) {
        const base = itemsMap.get(fallbackCanonical) || externalMap.get(fallbackCanonical) || {};
        itemsMap.set(fallbackCanonical, {
          ...base,
          status: ums.status,
          rating: ums.rating ?? base.rating,
          href: `/collection/${(m.type || "").toLowerCase()}/${m.mediaId ?? ums.id}`,
        });
        if (umsExternal) aliasMap.set(umsExternal, fallbackCanonical);
        if (umsInternal) aliasMap.set(umsInternal, fallbackCanonical);
      } else {
      // tracked-only item (not in external list)
      const newKey = String(m.mediaId || m.externalMediaId || ums.id);
      const newItem = {
        id: newKey,
        title: m.title ?? "",
        coverUrl: pickCover(m.posterUrl, m.backdropUrl),
        year: toYear(m.releaseDate),
        type: (m.type || "").toLowerCase(),
        status: ums.status,
        rating: ums.rating,
        href: `/collection/${(m.type || "").toLowerCase()}/${m.mediaId ?? ums.id}`,
      };
      itemsMap.set(newKey, newItem);
      if (umsExternal) aliasMap.set(umsExternal, newKey);
      if (umsInternal) aliasMap.set(umsInternal, newKey);
      }
    }
  }

  // Final items: external-ordering first, then tracked-only items appended
  let items = [];
  for (const it of externalItems) {
    const merged = itemsMap.get(String(it.id));
    if (merged) items.push(merged);
  }
  for (const [k, v] of itemsMap.entries()) {
    if (!externalMap.has(k)) items.push(v);
  }

  return (
    <div className="p-4">
      <MediaGrid items={items} />
    </div>
  );
}
