import { notFound } from "next/navigation";
import Link from "next/link";
import BackgroundImage from "@/app/media-details-components/BackgroundImage";
import PosterImage from "@/app/media-details-components/PosterImage";
import StarRating from "@/app/media-details-components/StarRating";
import CollectionDropdown from "@/app/media-details-components/CollectionDropdown";
import Divider from "@/app/media-details-components/Divider";
import { getMediaById } from "@/api/mediaClient";
import { cookies } from "next/headers";
import { getStatus } from "@/api/mediaAPI";

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/";

// Helpers to build robust TMDB URLs (or pass through full URLs)
function isFullUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}
function withSize(path, size) {
  if (!path) return null;
  if (isFullUrl(path)) return path;
  const p = String(path).startsWith("/") ? String(path) : `/${path}`;
  return `${TMDB_IMG_BASE}${size}${p}`;
}
/**
 * Poster preferred; if missing, try backdrop; else fallback to a local asset.
 * posterSize/backdropSize can be customized per placement.
 */
function pickCover(posterPath, backdropPath, posterSize = "w500", backdropSize = "w780") {
  return withSize(posterPath, posterSize) || withSize(backdropPath, backdropSize) || "/next.svg";
}

async function getMovie(id) {
  try {
    const movie = await getMediaById(id);
    return movie || null;
  } catch (error) {
    console.error("Error fetching movie:", error);
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

export default async function MoviePage({ params }) {
  // ✅ Await dynamic APIs in server components
  const { id } = await params;
  const userId = (await cookies()).get("userId")?.value;

  const movie = await getMovie(id);
  if (!movie) notFound();

  const result = await getMediaStatus(userId, id);

  // Build correct, sized image URLs (handles both TMDB paths and full URLs)
  const backdropSrc = pickCover(undefined, movie.backdropUrl, "w780", "w1280"); // prefer backdrop here
  const posterSrc = pickCover(movie.posterUrl, movie.backdropUrl, "w500", "w780"); // prefer poster for the poster slot

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      {/* Background hero image */}
      <BackgroundImage
        src={backdropSrc}
        alt={`${movie.title} backdrop`}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-20">
        {/* Back button */}
        <div className="pt-8 mb-8">
          <Link
            href="/movie"
            className="inline-flex items-center gap-2 text-gray-800 hover:text-gray-600"
          >
            <span className="text-2xl">←</span>
            <span className="sr-only">Back to movies</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 lg:w-80">
            <PosterImage
              src={posterSrc}
              alt={`${movie.title} poster`}
              className="w-full lg:w-80 rounded-lg"
            />
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Title and basic info */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">{movie.title}</h1>
              <div className="text-gray-600 mb-3">
                {movie.director && <div className="text-lg">{movie.director}</div>}
                <div className="flex items-center gap-4 text-sm">
                  {movie.runtime && <span>{movie.runtime}</span>}
                  {movie.releaseDate && <span>• {movie.releaseDate}</span>}
                  {movie.studio && <span>• Produced By: {movie.studio}</span>}
                </div>
              </div>

              {/* Cast */}
              {Array.isArray(movie.cast) && movie.cast.length > 0 && (
                <div className="mb-4">
                  <div className="text-gray-500 text-sm mb-1">Cast:</div>
                  <div className="text-sm text-gray-600">
                    {movie.cast.join(", ")}
                  </div>
                </div>
              )}

              {/* Genre pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(movie.genres || []).map((genre) => (
                  <span
                    key={genre}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Description - hidden on mobile, shown on desktop */}
            <div className="hidden lg:block">
              <p className="text-gray-700 leading-relaxed">
                {movie.description || "No synopsis available."}
              </p>
            </div>
          </div>
        </div>

        {/* Description - shown on mobile only, under everything */}
        <div className="lg:hidden mt-8">
          <p className="text-gray-700 leading-relaxed">
            {movie.description || "No synopsis available."}
          </p>
        </div>

        <Divider />

        <StarRating
          userId={userId}
          mediaId={movie.mediaId}
          value={result && result.rating ? result.rating : 0}
          updatedAt={result && result.updatedAt}
          statusId={result && result.id}
        />

        <Divider />

        <div className="mt-4">
          <CollectionDropdown
            currentStatus={result === null ? "UNSPECIFIED" : result.status}
            verb="Watch"
            verb2="Watching"
            userId={userId}
            mediaId={movie.mediaId}
            mediaType={movie.type}
          />
        </div>
      </div>
    </main>
  );
}
