"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PropTypes from "prop-types";
import { suggest } from "@/api/searchAPI";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function SearchBar({ items }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const seqRef = useRef(0);
  const router = useRouter();

  const mapTypeToCategory = (type) =>
    typeof type === "string" ? type.toLowerCase() : "";

  const fetchSuggestions = async (value) => {
    // increment request sequence to identify stale responses
    seqRef.current += 1;
    const requestSeq = seqRef.current;

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const searchResults = await suggest(value, { signal: ac.signal });

      const mapped = searchResults.map((item) => ({
        id: item.id,
        title: item.title,
        year: item.year,
        category: mapTypeToCategory(item.type),
      }));

      // Build a stable string key for each item (prefer id, fallback to normalized title-year)
      const withKey = mapped.map((it) => {
        const key = `${(it.title || '').toLowerCase().trim()}|${(it.category || '').toLowerCase()}`;
        return { ...it, _key: key };
      });

      // Deduplicate by that stable key and preserve first occurrence
      // If a more recent request has been sent, ignore this response
      if (requestSeq !== seqRef.current) {
        return;
      }

      const unique = Array.from(
        withKey.reduce((m, it) => (m.has(it._key) ? m : m.set(it._key, it)), new Map()).values()
      ).slice(0, 5); // limit suggestions

      setResults(unique);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Suggest failed:", e);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim() || value.trim().length < 2) {
      setResults([]);
      return;
    }

    // Debounce 250ms to avoid spamming the backend
    timerRef.current = setTimeout(() => {
      if (items && Array.isArray(items) && items.length) {
        // Optional local fallback dataset
        const filtered = items
          .filter((item) =>
            item.title.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 5);
        setResults(filtered);
      } else {
        // Default: query backend
        fetchSuggestions(value);
      }
    }, 250);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleSelect = (item) => {
    router.push(`/collection/${item.category}/${item.id}`);
    setResults([]);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search..."
        className="w-full px-3 py-2 border rounded-full shadow-sm"
        aria-autocomplete="list"
        aria-expanded={results.length > 0}
        aria-controls="search-suggest"
      />

      {results.length > 0 && (
        <ul
          id="search-suggest"
          className="absolute left-0 right-0 bg-white border rounded mt-1 shadow-lg max-h-60 overflow-y-auto z-10"
        >
          {results.map((item) => (
            <li key={item._key}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {item.title}{" "}
                {item.year ? (
                  <span className="text-xs text-gray-500">({item.year})</span>
                ) : null}
              </button>
            </li>
          ))}
          {loading && (
            <li className="px-3 py-2 text-xs text-gray-500">Searching…</li>
          )}
        </ul>
      )}
    </div>
  );
}

SearchBar.propTypes = {
  // Optional local fallback dataset; otherwise pulls from backend
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string.isRequired,
      year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      category: PropTypes.string,
    })
  ),
};
