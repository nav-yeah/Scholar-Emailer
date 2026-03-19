import requests
import time
import os
import math

BASE_URL = "https://api.semanticscholar.org/graph/v1"
S2_API_KEY = os.environ.get("S2_API_KEY")


def get_headers():
    if S2_API_KEY:
        return {"x-api-key": S2_API_KEY}
    return {}


def safe_get(url, params=None, retries=3, backoff=2):
    """GET with retry. If no API key, try once only and bail on 429."""
    max_attempts = retries if S2_API_KEY else 1

    for attempt in range(max_attempts):
        try:
            response = requests.get(
                url,
                params=params,
                headers=get_headers(),
                timeout=15
            )
            if response.status_code == 429:
                if not S2_API_KEY:
                    print(f"[s2] Rate limited with no key — skipping S2")
                    return None
                wait = backoff * (attempt + 1)
                print(f"[s2] Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue
            response.raise_for_status()
            return response
        except requests.exceptions.Timeout:
            print(f"[s2] Timeout on attempt {attempt + 1}")
            time.sleep(backoff)
        except Exception as e:
            print(f"[s2] Error: {e}")
            break
    return None


def find_professor(name, university):
    if not S2_API_KEY:
        print(f"[s2] No API key — skipping Semantic Scholar")
        return None

    print(f"[s2] Searching for: {name}, {university}")

    # Search by name only — adding university to query breaks S2 results
    params = {
        "query": name,
        "fields": "name,affiliations,paperCount,hIndex,homepage",
        "limit": 10
    }

    response = safe_get(f"{BASE_URL}/author/search", params=params)
    if not response:
        return None

    authors = response.json().get("data", [])
    if not authors:
        print(f"[s2] No authors found for: {name}")
        return None

    name_parts = [p for p in name.lower().split() if len(p) > 2]

    def score(author):
        author_name = author.get("name", "").lower()
        affiliations = " ".join(author.get("affiliations", [])).lower()
        paper_count = author.get("paperCount", 0)

        name_score = sum(1 for p in name_parts if p in author_name)

        uni_score = 0
        if university and affiliations:
            uni_words = [w for w in university.lower().split() if len(w) > 3]
            uni_score = sum(1 for w in uni_words if w in affiliations) * 2

        count_score = math.log10(paper_count + 1) * 0.1
        return name_score * 10 + uni_score + count_score

    candidates = [
        a for a in authors
        if any(p in a.get("name", "").lower() for p in name_parts)
    ]

    if not candidates:
        print(f"[s2] No name match in results")
        return None

    best = max(candidates, key=score)
    print(f"[s2] Best match: {best.get('name')} ({best.get('paperCount')} papers)")

    return {
        "id": best.get("authorId"),
        "name": best.get("name"),
        "affiliations": best.get("affiliations") or ([university] if university else []),
        "paper_count": best.get("paperCount", 0),
        "h_index": best.get("hIndex", 0),
        "homepage": best.get("homepage", ""),
        "source": "semantic_scholar"
    }

    def score(author):
        author_name = author.get("name", "").lower()
        affiliations = " ".join(author.get("affiliations", [])).lower()
        paper_count = author.get("paperCount", 0)

        # Name match — how many parts of the input name appear
        name_score = sum(1 for p in name_parts if p in author_name)

        # University match — only useful when affiliations are populated
        uni_score = 0
        if university and affiliations:
            uni_words = [w for w in university.lower().split() if len(w) > 3]
            uni_score = sum(1 for w in uni_words if w in affiliations) * 2

        # Paper count as soft tiebreaker only
        count_score = math.log10(paper_count + 1) * 0.1

        return name_score * 10 + uni_score + count_score

    # Only consider authors whose name actually contains part of the input name
    candidates = [
        a for a in authors
        if any(p in a.get("name", "").lower() for p in name_parts)
    ]

    if not candidates:
        print(f"[s2] No name match in results")
        return None

    best = max(candidates, key=score)
    best_score = score(best)

    # Require at least one name part to match strongly
    name_match_count = sum(
        1 for p in name_parts
        if p in best.get("name", "").lower()
    )
    if name_match_count == 0:
        print(f"[s2] Best candidate doesn't match name well enough")
        return None

    print(f"[s2] Best match: {best.get('name')} "
          f"({best.get('paperCount')} papers, score={best_score:.1f})")

    return {
        "id": best.get("authorId"),
        "name": best.get("name"),
        "affiliations": best.get("affiliations") or ([university] if university else []),
        "paper_count": best.get("paperCount", 0),
        "h_index": best.get("hIndex", 0),
        "homepage": best.get("homepage", ""),
        "source": "semantic_scholar"
    }


def get_professor_papers(author_id, limit=15):
    if not author_id:
        return []

    params = {
        "fields": "title,abstract,year,openAccessPdf,citationCount",
        "limit": 50  # fetch more, then sort and slice
    }
    time.sleep(0.3)

    response = safe_get(
        f"{BASE_URL}/author/{author_id}/papers",
        params=params
    )
    if not response:
        return []

    papers = response.json().get("data", [])
    
    # Filter to papers with abstracts
    papers = [p for p in papers if p.get("abstract")]
    
    # Sort by citation count descending — most impactful papers first
    papers.sort(key=lambda p: p.get("citationCount") or 0, reverse=True)
    
    return papers[:limit]


def find_paper_by_title(title):
    """
    Look up a paper on Semantic Scholar by title.
    Returns paper if title overlap >= 60%, else None.
    """
    if not S2_API_KEY:
        print(f"[s2] No API key — skipping title lookup")
        return None

    params = {
        "query": title,
        "fields": "title,abstract,year,openAccessPdf,paperId",
        "limit": 1
    }
    time.sleep(0.3)

    response = safe_get(f"{BASE_URL}/paper/search", params=params)
    if not response:
        return None

    results = response.json().get("data", [])
    if not results:
        return None

    result = results[0]
    query_words = set(title.lower().split())
    result_words = set(result.get("title", "").lower().split())
    overlap = len(query_words & result_words) / max(len(query_words), 1)

    return result if overlap >= 0.6 else None


def get_author_details(author_id):
    """Fetch full details for a single author."""
    if not author_id:
        return {}

    fields = "name,affiliations,paperCount,hIndex,homepage"
    response = safe_get(
        f"{BASE_URL}/author/{author_id}",
        params={"fields": fields}
    )
    if not response:
        return {}
    return response.json()