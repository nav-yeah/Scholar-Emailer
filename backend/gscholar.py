import os
import time

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY")


def get_scholar_profile(scholar_url=None, author_name=None, university=None):
    """
    Fetch professor profile from Google Scholar.
    Uses scholarly in development, SerpAPI in production.
    Returns: { name, affiliation, papers: [{title, abstract, year}] }
    """
    if ENVIRONMENT == "production":
        return _fetch_via_serpapi(
            scholar_url=scholar_url,
            author_name=author_name,
            university=university
        )
    else:
        return _fetch_via_scholarly(
            scholar_url=scholar_url,
            author_name=author_name,
            university=university
        )


def _fetch_via_scholarly(scholar_url=None, author_name=None, university=None):
    """
    Use scholarly library — for local development only.
    """
    try:
        from scholarly import scholarly as sc

        # Use free proxies to avoid Google blocking
        pg = ProxyGenerator()
        pg.FreeProxies()
        sc.use_proxy(pg)
        # Extract author ID from URL if provided
        if scholar_url:
            author_id = _extract_scholar_id(scholar_url)
            if author_id:
                print(f"[gscholar] scholarly: fetching by ID {author_id}")
                author = sc.search_author_id(author_id)
            else:
                print(f"[gscholar] scholarly: searching by name {author_name}")
                results = sc.search_author(f"{author_name} {university or ''}")
                author = next(results, None)
        else:
            print(f"[gscholar] scholarly: searching by name {author_name}")
            results = sc.search_author(f"{author_name} {university or ''}")
            author = next(results, None)

        if not author:
            print("[gscholar] scholarly: no author found")
            return None

        # Fill publications
        sc.fill(author, sections=["publications"])

        name = author.get("name", author_name or "Unknown")
        affiliation = author.get("affiliation", university or "")

        papers = []
        for pub in author.get("publications", [])[:15]:
            bib = pub.get("bib", {})
            title = bib.get("title", "")
            abstract = bib.get("abstract", "")
            year = str(bib.get("pub_year", "N/A"))

            if title:
                papers.append({
                    "title": title,
                    "abstract": abstract,
                    "year": year,
                    "text": abstract[:3000] if abstract else "",
                    "source": "google_scholar"
                })

        print(f"[gscholar] scholarly: got {len(papers)} papers for {name}")

        return {
            "name": name,
            "affiliation": affiliation,
            "papers": papers
        }

    except StopIteration:
        print("[gscholar] scholarly: no results found")
        return None
    except Exception as e:
        print(f"[gscholar] scholarly failed: {e}")
        return None


def _fetch_via_serpapi(scholar_url=None, author_name=None, university=None):
    """
    Use SerpAPI — for production.
    """
    if not SERPAPI_KEY:
        print("[gscholar] SerpAPI key not set")
        return None

    try:
        from serpapi import GoogleSearch

        # Build params
        if scholar_url:
            author_id = _extract_scholar_id(scholar_url)
            if not author_id:
                print("[gscholar] SerpAPI: could not extract author ID from URL")
                return None

            params = {
                "engine": "google_scholar_author",
                "author_id": author_id,
                "api_key": SERPAPI_KEY,
                "num": 20,
                "sort": "pubdate"
            }
        else:
            # Search by name
            search_params = {
                "engine": "google_scholar_profiles",
                "mauthors": f"{author_name} {university or ''}",
                "api_key": SERPAPI_KEY
            }
            search = GoogleSearch(search_params)
            profiles = search.get_dict().get("profiles", [])

            if not profiles:
                print("[gscholar] SerpAPI: no profiles found")
                return None

            author_id = profiles[0].get("author_id")
            params = {
                "engine": "google_scholar_author",
                "author_id": author_id,
                "api_key": SERPAPI_KEY,
                "num": 20,
                "sort": "pubdate"
            }

        print(f"[gscholar] SerpAPI: fetching author {author_id}")
        search = GoogleSearch(params)
        result = search.get_dict()

        author_info = result.get("author", {})
        name = author_info.get("name", author_name or "Unknown")
        affiliation = author_info.get("affiliations", university or "")

        papers = []
        for article in result.get("articles", []):
            title = article.get("title", "")
            year = str(article.get("year", "N/A"))

            if title:
                papers.append({
                    "title": title,
                    "abstract": "",  # Scholar doesn't give abstracts in listing
                    "year": year,
                    "text": "",
                    "source": "google_scholar"
                })

        print(f"[gscholar] SerpAPI: got {len(papers)} papers for {name}")

        return {
            "name": name,
            "affiliation": affiliation,
            "papers": papers
        }

    except Exception as e:
        print(f"[gscholar] SerpAPI failed: {e}")
        return None


def _extract_scholar_id(url):
    """Extract author ID from Google Scholar URL."""
    import re
    match = re.search(r"user=([A-Za-z0-9_-]+)", url)
    return match.group(1) if match else None