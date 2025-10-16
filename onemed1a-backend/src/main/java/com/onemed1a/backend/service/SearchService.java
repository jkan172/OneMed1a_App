package com.onemed1a.backend.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.onemed1a.backend.dto.SearchRequest;
import com.onemed1a.backend.dto.SearchResultItem;
import com.onemed1a.backend.dto.SuggestResultItem;
import com.onemed1a.backend.mapper.SearchMappers;
import com.onemed1a.backend.repository.MediaDataRepository;
import com.onemed1a.backend.repository.spec.MediaSearchSpecification;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final MediaDataRepository mediaRepo;

    public Page<SearchResultItem> search(SearchRequest req, Pageable pageable) {
        var spec = MediaSearchSpecification.from(req);
        return mediaRepo.findAll(spec, pageable)
                .map(SearchMappers::toResultItem);
    }

    public List<SuggestResultItem> suggest(String q, int limit) {
        // cap limit between 1 and 10 without relying on Math.clamp for older JDKs
        int cap = Math.max(1, Math.min(limit, 10));
        Pageable firstN = PageRequest.of(0, cap, Sort.by(Sort.Direction.ASC, "title"));

        // Fetch candidate results
        List<SuggestResultItem> candidates = mediaRepo.findAll(MediaSearchSpecification.suggestByPrefix(q), firstN)
                .map(SearchMappers::toSuggestItem)
                .getContent();

        // Deduplicate by normalized title + type (preserve insertion order)
        Map<String, SuggestResultItem> map = new LinkedHashMap<>();
        for (SuggestResultItem it : candidates) {
            String title = it.getTitle() == null ? "" : it.getTitle().toLowerCase().trim();
            String type = it.getType() == null ? "" : it.getType().toString();
            String key = title + "|" + type;
            map.putIfAbsent(key, it);
        }

        return new ArrayList<>(map.values());
    }
}