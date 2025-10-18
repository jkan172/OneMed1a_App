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

// --- Helpers ---------------------------------------------------------------

const GOOGLE_BOOKS_BASE = "https://books.google.com";

/** Is already a full URL (http/https)? */
function isFullUrl(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

/**
 * Normalize book image URL:
 * - If full URL, return as is (common: books.googleusercontent.com).
 * - If it looks like a Google Books path (starts with "/books"), prefix the domain.
 * - Otherwise null (caller will fallback).
 */
function normalizeBookUrl(path) {
  if (!path) return null;
  if (isFullUrl(path)) return path;
  const p = String(path).startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/books")) return `${GOOGLE_BOOKS_BASE}${p}`;
  return null;
}

/**
 * Prefer poster; fallback to backdrop; else local placeholder.
 * Books often only have a single cover URL; backdrop may be absent.
 */
function pickCover(posterPath, backdropPath) {
  return normalizeBookUrl(posterPath) || normalizeBookUrl(backdropPath) || "/next.svg";
}

// --- Data fetchers ---------------------------------------------------------

async function getBook(id) {
  try {
    const book = await getMediaById(id);
    return book || null;
  } catch (error) {
    console.error("Error fetching book:", error);
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

// --- Page ------------------------------------------------------------------

export default async function BookPage({ params }) {
  const { id } = await params; // await dynamic API
  const userId = (await cookies()).get("userId")?.value; // await cookies()

  const book = await getBook(id);
  if (!book) notFound();

  const result = await getMediaStatus(userId, id);

  // Build usable image URLs (handles full URLs and /books/... paths)
  // Use poster for both poster and backdrop if backdrop is missing.
  const posterSrc = pickCover(book.posterUrl, book.backdropUrl);
  const backdropSrc = pickCover(book.backdropUrl, book.posterUrl);

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      {/* Background hero image */}
      <BackgroundImage src={backdropSrc} alt={`${book.title} backdrop`} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-20">
        {/* Back button */}
        <div className="pt-8 mb-8">
          <Link
            href="/books"
            className="inline-flex items-center gap-2 text-gray-800 hover:text-gray-600"
          >
            <span className="text-2xl">←</span>
            <span className="sr-only">Back to books</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cover */}
          <div className="flex-shrink-0 lg:w-80">
            <PosterImage
              src={posterSrc}
              alt={`${book.title} cover`}
              className="w-full lg:w-80 rounded-lg"
            />
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Title and basic info */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">{book.title}</h1>

              <div className="text-gray-600 mb-3">
                {/* Authors */}
                {Array.isArray(book.authors) && book.authors.length > 0 && (
                  <div className="text-lg">{book.authors.join(", ")}</div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {book.releaseDate && <span>{book.releaseDate}</span>}
                  {book.pageCount != null && <span>• {book.pageCount} pages</span>}
                  {book.publisher && <span>• Publisher: {book.publisher}</span>}
                  {book.isbn && <span>• ISBN: {book.isbn}</span>}
                </div>
              </div>

              {/* Genre pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(book.genres || []).map((genre) => (
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
                {book.description || "No synopsis available."}
              </p>
            </div>
          </div>
        </div>

        {/* Description - shown on mobile only, under everything */}
        <div className="lg:hidden mt-8">
          <p className="text-gray-700 leading-relaxed">
            {book.description || "No synopsis available."}
          </p>
        </div>

        <Divider />

        <StarRating
          userId={userId}
          mediaId={book.mediaId}
          value={result && result.rating ? result.rating : 0}
          updatedAt={result && result.updatedAt}
          statusId={result && result.id}
        />

        <Divider />

        <div className="mt-4">
          <CollectionDropdown
            currentStatus={result === null ? "UNSPECIFIED" : result.status}
            userId={userId}
            mediaId={book.mediaId}
            mediaType={book.type}
          />
        </div>
      </div>
    </main>
  );
}
