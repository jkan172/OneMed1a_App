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

function isFullUrl(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}
function withSize(path, size) {
  if (!path) return null;
  if (isFullUrl(path)) return path;
  const p = String(path).startsWith("/") ? String(path) : `/${path}`;
  return `${TMDB_IMG_BASE}${size}${p}`;
}
function pickCover(posterPath, backdropPath, posterSize = "w500", backdropSize = "w780") {
  return withSize(posterPath, posterSize) || withSize(backdropPath, backdropSize) || "/next.svg";
}

// --- Data fetchers ---------------------------------------------------------

async function getTvShow(id) {
  try {
    return await getMediaById(id);
  } catch (error) {
    console.error("Error fetching TV Show:", error);
    return null;
  }
}

async function getMediaStatus(userId, mediaId) {
  try {
    return await getStatus(userId, mediaId);
  } catch {
    return null; // Not in collection
  }
}

export default async function TvShowPage({ params }) {
  const { id } = await params;
  const userId = (await cookies()).get("userId")?.value;

  const show = await getTvShow(id);
  if (!show) notFound();

  const result = await getMediaStatus(userId, id);

  // Build image URLs with sizes
  const backdropSrc = pickCover(undefined, show.backdropUrl, "w780", "w1280");
  const posterSrc = pickCover(show.posterUrl, show.backdropUrl, "w500", "w780");

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <BackgroundImage src={backdropSrc} alt={`${show.title} backdrop`} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-20">
        {/* Back button */}
        <div className="pt-8 mb-8">
          <Link href="/tv" className="inline-flex items-center gap-2 text-gray-800 hover:text-gray-600">
            <span className="text-2xl">←</span>
            <span className="sr-only">Back to TV</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 lg:w-80">
            <PosterImage
              src={posterSrc}
              alt={`${show.title} poster`}
              className="w-full lg:w-80 rounded-lg"
            />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">{show.title}</h1>
              <div className="text-gray-600 mb-3">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {show.firstAirYear && <span>{show.firstAirYear}</span>}
                  {show.seasons != null && (
                    <span>• {show.seasons} season{show.seasons === 1 ? "" : "s"}</span>
                  )}
                  {show.episodes != null && <span>• {show.episodes} episodes</span>}
                  {show.network && <span>• Network: {show.network}</span>}
                </div>
              </div>

              {/* Cast */}
              {Array.isArray(show.cast) && show.cast.length > 0 && (
                <div className="mb-4">
                  <div className="text-gray-500 text-sm mb-1">Cast:</div>
                  <div className="text-sm text-gray-600">
                    {show.cast.join(", ")}
                  </div>
                </div>
              )}

              {/* Genre pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(show.genres || []).map((genre) => (
                  <span key={genre} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="hidden lg:block">
              <p className="text-gray-700 leading-relaxed">
                {show.description || "No synopsis available."}
              </p>
            </div>
          </div>
        </div>

        {/* Description on mobile */}
        <div className="lg:hidden mt-8">
          <p className="text-gray-700 leading-relaxed">
            {show.description || "No synopsis available."}
          </p>
        </div>

        <Divider />

        <StarRating
          userId={userId}
          mediaId={show.mediaId}
          value={result && result.rating ? result.rating : 0}
          updatedAt={result && result.updatedAt}
          statusId={result && result.id}
        />

        <Divider />

        <div className="mt-4">
          <CollectionDropdown
            currentStatus={result === null ? "UNSPECIFIED" : result.status}
            userId={userId}
            mediaId={show.mediaId}
            mediaType={show.type}
          />
        </div>
      </div>
    </main>
  );
}
