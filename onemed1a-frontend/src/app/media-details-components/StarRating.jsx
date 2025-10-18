"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PropTypes from "prop-types";
import { uppsertMediaStatus, deleteMediaStatus } from "@/api/mediaStatusApi";
import { getStatus } from "@/api/mediaAPI";

export default function StarRating({
    label = "Edit Your Rating",
    userId,
    mediaId,
    value = 0, // initial (1–5)
    updatedAt,
    disabled = false,
    className = "",
    statusId: initialStatusId = null,
}) {
    const router = useRouter();
    const [rating, setRating] = useState(value || 0);
    const [hover, setHover] = useState(0);
    const [loading, setLoading] = useState(false);
    const [statusId, setStatusId] = useState(initialStatusId); // backend record id for deletes
    const [error, setError] = useState(null);
    const saveTimer = useRef(null);
    const prevRatingRef = useRef(rating);

    useEffect(() => setRating(value || 0), [value]);

    useEffect(() => {
        // If caller already passed status or value, skip fetching to avoid duplicate calls.
        if (!userId || !mediaId) return;
        if (initialStatusId || (typeof value === "number" && value > 0)) {
            // already have initial data from server-rendered page
            return;
        }

        let mounted = true;
        async function fetch() {
            setLoading(true);
            try {
                const res = await getStatus(userId, mediaId);
                if (!mounted) return;
                if (res && res.rating) {
                    setRating(res.rating);
                } else {
                    setRating(0);
                }
                if (res && res.id) {
                    setStatusId(res.id);
                }
            } catch (err) {
                // if not found, ignore; otherwise surface
                console.warn("No status found or failed to fetch:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetch();
        return () => {
            mounted = false;
        };
    }, [userId, mediaId, initialStatusId, value]);

    const display = hover || rating;

    const lastUpdated = useMemo(() => {
        const d = updatedAt ? new Date(updatedAt) : new Date();
        return d.toLocaleDateString("en-NZ");
    }, [updatedAt]);

    const pushError = (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 3500);
    };

    const doSave = useCallback(
        async (newRating) => {
            // require auth
            if (!userId) {
                // Redirect to login preserving return path
                router.push(`/login`);
                return;
            }

            // If rating is 0 -> delete
            if (!newRating) {
                if (!statusId) return; // nothing to delete
                try {
                    setLoading(true);
                    await deleteMediaStatus(statusId);
                    setStatusId(null);
                } catch (err) {
                    pushError("Failed to clear rating");
                    throw err;
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Upsert: create or update
            const payload = {
                id: statusId || null,
                userId,
                mediaId,
                status: "COMPLETED", // keep default lifecycle; backend allows null optionals
                rating: newRating,
            };

            try {
                setLoading(true);
                const res = await uppsertMediaStatus(payload);
                // backend returns the saved record; capture id
                if (res && res.id) setStatusId(res.id);
            } catch (err) {
                pushError("Failed to save rating");
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [userId, mediaId, statusId, router]
    );

    // Debounced save with optimistic UI
    const setAndSave = (n) => {
        if (disabled) return;
        // save previous for rollback
        prevRatingRef.current = rating;
        setRating(n);

        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            try {
                await doSave(n || null);
            } catch (err) {
                // rollback
                setRating(prevRatingRef.current);
            }
        }, 300);
    };

    const handleKeyDown = (e) => {
        if (disabled) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.min(5, rating + 1);
            setAndSave(next);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.max(1, rating - 1);
            setAndSave(next);
        }
    };

    const clearRating = () => {
        // set to 0 and delete after debounce
        prevRatingRef.current = rating;
        setRating(0);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            try {
                await doSave(null);
            } catch (err) {
                setRating(prevRatingRef.current);
            }
        }, 300);
    };

    return (
        <section className={`px-4 py-4 ${className}`} aria-label={label}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-neutral-900">{label}</h3>
                    <div className="text-xs text-neutral-500">Last updated {lastUpdated}</div>
                </div>

                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center gap-2"
                        role="radiogroup"
                        aria-label="Star rating"
                        onKeyDown={handleKeyDown}
                    >
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={rating === n}
                                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                                disabled={disabled || loading}
                                className={`h-8 w-8 cursor-pointer rounded outline-none transition ${
                                    disabled || loading ? "opacity-60" : "hover:scale-[1.06]"
                                } focus:ring-2 focus:ring-neutral-400`}
                                onMouseEnter={() => setHover(n)}
                                onMouseLeave={() => setHover(0)}
                                onFocus={() => setHover(n)}
                                onBlur={() => setHover(0)}
                                onClick={() => setAndSave(n)}
                            >
                                <Star filled={n <= display} />
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearRating}
                            disabled={disabled || loading || rating === 0}
                            className="text-xs text-neutral-600 underline disabled:opacity-60"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div role="alert" className="mt-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </section>
    );
}

StarRating.propTypes = {
    label: PropTypes.string,
    userId: PropTypes.string,
    mediaId: PropTypes.string.isRequired,
    value: PropTypes.number,
    updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    disabled: PropTypes.bool,
    className: PropTypes.string,
};

/* SVG star with yellow fill when active */
function Star({ filled }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-full w-full ${filled ? "fill-yellow-400" : "fill-transparent"} stroke-yellow-400`}
            strokeWidth="1.5"
            aria-hidden="true"
        >
            <path d="M12 3.6l2.59 5.25 5.79.84-4.19 4.08.99 5.77L12 17.98 6.82 19.54l.99-5.77L3.62 9.69l5.79-.84L12 3.6z" />
        </svg>
    );
}
