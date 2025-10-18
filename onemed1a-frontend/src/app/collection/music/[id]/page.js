import { notFound } from "next/navigation";
import Link from "next/link";
import BackgroundImage from "@/app/media-details-components/BackgroundImage";
import PosterImage from "@/app/media-details-components/PosterImage";
import StarRating from "@/app/media-details-components/StarRating";
import Divider from "@/app/media-details-components/Divider";
import { getMediaById } from "@/api/mediaClient";
import { cookies } from "next/headers";
import CollectionDropdown from "@/app/media-details-components/CollectionDropdown";
import { getStatus } from "@/api/mediaAPI";

// --- Image helpers ---------------------------------------------------------

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/";

/** already a fully-qualified URL? */
function isFullUrl(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

/** turn a TMDB-style path into a full URL with size, else pass full URLs through */
function withSize(path, size) {
  if (!path) return null;
  if (isFullUrl(path)) return path; // e.g., Spotify covers from i.scdn.co
  const p = String(path).startsWith("/") ? String(path) : `/${path}`;
  // treat unknown relative paths as TMDB-like (defensive)
  return `${TMDB_IMG_BASE}${size}${p}`;
}

/** Prefer poster for card; fallback to backdrop; finally local placeholder */
function pickCover(posterPath, backdropPath, posterSize = "w500", backdropSize = "w780") {
  return withSize(posterPath, posterSize) || withSize(backdropPath, backdropSize) || "/next.svg";
}

// --- Data fetchers ---------------------------------------------------------

async function getAlbum(id) {
  try {
    return await getMediaById(id);
  } catch (error) {
    console.error("Error fetching album:", error);
    return null;
  }
}

async function getMediaStatus(userId, mediaId) {
  try {
    return await getStatus(userId, mediaId);
  } catch {
    // Not in collection
    return null;
  }
}

export default async function MusicPage({ params }) {
  const { id } = await params; // await dynamic API
  const userId = (await cookies()).get("userId")?.value; // await cookies()

  const album = await getAlbum(id);
  if (!album) notFound();

  const result = await getMediaStatus(userId, id);

  // Build image URLs (handles full Spotify URLs and TMDB paths defensively)
  const posterSrc = pickCover(album.posterUrl, album.backdropUrl, "w500", "w780");
  const backdropSrc = pickCover(album.backdropUrl, album.posterUrl, "w780", "w1280");

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <BackgroundImage src={backdropSrc} alt={`${album.title} backdrop`} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-20">
        {/* Back button */}
        <div className="pt-8 mb-8">
          <Link href="/music" className="inline-flex items-center gap-2 text-gray-800 hover:text-gray-600">
            <span className="text-2xl">←</span>
            <span className="sr-only">Back to music</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Artwork */}
          <div className="flex-shrink-0 lg:w-80">
            <PosterImage
              src={posterSrc}
              alt={`${album.title} cover`}
              className="w-full lg:w-80 rounded-lg"
            />
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Title and basic info */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">{album.title}</h1>

              <div className="text-gray-600 mb-3">
                {/* Artists */}
                {Array.isArray(album.artists) && album.artists.length > 0 && (
                  <div className="text-lg">{album.artists.join(", ")}</div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {album.releaseDate && <span>{album.releaseDate}</span>}
                  {album.duration && <span>• {album.duration}</span>}
                  {album.label && <span>• Label: {album.label}</span>}
                </div>
              </div>

              {/* Genre pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(album.genres || []).map((genre) => (
                  <span key={genre} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Description - hidden on mobile, shown on desktop */}
            <div className="hidden lg:block">
              <p className="text-gray-700 leading-relaxed">
                {album.description || "No description available."}
              </p>
            </div>
          </div>
        </div>

        {/* Description - mobile */}
        <div className="lg:hidden mt-8">
          <p className="text-gray-700 leading-relaxed">
            {album.description || "No description available."}
          </p>
        </div>

        {/* Track list */}
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Track List
          </h3>
          <ol className="divide-y divide-gray-200 rounded-lg bg-white ring-1 ring-gray-200">
            {(album.tracks || []).map((t) => (
              <li key={t.no} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-gray-900">
                  {t.no}. {t.title}
                </span>
                <span className="text-gray-500">{t.length}</span>
              </li>
            ))}
          </ol>
        </div>

        <Divider />

        <StarRating
          userId={userId}
          mediaId={album.mediaId}
          value={result && result.rating ? result.rating : 0}
          updatedAt={result && result.updatedAt}
          statusId={result && result.id}
        />

        <Divider />

        <div className="mt-4">
          <CollectionDropdown
            currentStatus={result === null ? "UNSPECIFIED" : result.status}
            userId={userId}
            mediaId={album.mediaId}
            mediaType={album.type}
          />
        </div>
      </div>
    </main>
  );
}
