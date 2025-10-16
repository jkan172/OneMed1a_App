package com.onemed1a.backend.repository.spec;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.onemed1a.backend.dto.SearchRequest;
import com.onemed1a.backend.model.MediaData;
import com.onemed1a.backend.model.UserMediaStatus;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

public final class MediaSearchSpecification {
    private MediaSearchSpecification() {}

    public static Specification<MediaData> from(SearchRequest req) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();

            // q -> title contains (case-insensitive)
            if (req.getQ() != null && !req.getQ().isBlank()) {
                String like = "%" + req.getQ().toLowerCase() + "%";
                ps.add(cb.like(cb.lower(root.get("title")), like));
            }

            if (req.getType() != null) {
                ps.add(cb.equal(root.get("type"), req.getType()));
            }

            if (req.getGenre() != null && !req.getGenre().isBlank()) {
                // assume @ElementCollection List<String> genres
                Join<MediaData, String> g = root.join("genres", JoinType.LEFT);
                ps.add(cb.equal(cb.lower(g), req.getGenre().toLowerCase()));
                query.distinct(true);
            }

            if (req.getYearFrom() != null) {
                // releaseDate is a String like "2023"; string compare works for YYYY format
                ps.add(cb.greaterThanOrEqualTo(root.get("releaseDate"),
                        String.valueOf(req.getYearFrom())));
            }
            if (req.getYearTo() != null) {
                ps.add(cb.lessThanOrEqualTo(root.get("releaseDate"),
                        String.valueOf(req.getYearTo())));
            }

            if (req.getUserId() != null && req.getStatus() != null) {
                // exists (select 1 from user_media_status where media=root and userId=status)
                var sub = query.subquery(UserMediaStatus.class);
                var ums = sub.from(UserMediaStatus.class);
                sub.select(ums);
                sub.where(
                        cb.equal(ums.get("media"), root),
                        cb.equal(ums.get("user").get("id"), req.getUserId()),
                        cb.equal(ums.get("status"), req.getStatus())
                );
                ps.add(cb.exists(sub));
            }

            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    public static Specification<MediaData> suggestByPrefix(String q) {
        final String prefix = (q == null ? "" : q.trim()).toLowerCase();
    return (root, query, cb) -> {
        // make results distinct to avoid duplicates when joining collections
        query.distinct(true);
        return cb.like(cb.lower(root.get("title")), prefix + "%");
    };
    }
}