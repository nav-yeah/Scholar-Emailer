import os
import time
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from scholar import (
    find_professor, get_professor_papers,
    find_paper_by_title, get_author_details,
    safe_get, BASE_URL, S2_API_KEY
)
from arxiv_search import (
    find_professor_on_arxiv, get_arxiv_pdf_text,
    find_paper_on_arxiv_by_title
)
from pdf_reader import extract_paper_text
from email_generator import rank_papers, generate_email, score_relevance
from gscholar import get_scholar_profile

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def enrich_papers_with_full_text(papers):
    enriched = []
    for paper in papers:
        title = paper.get("title", "")

        if paper.get("text") and len(paper.get("text", "")) > 300:
            enriched.append(paper)
            continue

        if paper.get("openAccessPdf"):
            paper["text"] = extract_paper_text(paper)
            enriched.append(paper)
            continue

        s2_paper = find_paper_by_title(title)
        if s2_paper:
            s2_paper["text"] = extract_paper_text(s2_paper)
            s2_paper["year"] = s2_paper.get("year") or paper.get("year")
            enriched.append(s2_paper)
            print(f"[enrich] S2 hit: {title[:50]}")
            time.sleep(0.3)
            continue

        arxiv_text = find_paper_on_arxiv_by_title(title)
        if arxiv_text:
            paper["text"] = arxiv_text
            print(f"[enrich] arXiv hit: {title[:50]}")
            enriched.append(paper)
            continue

        paper["text"] = paper.get("abstract") or ""
        print(f"[enrich] Abstract fallback: {title[:50]}")
        enriched.append(paper)

    return enriched


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "s2_key": bool(S2_API_KEY),
        "serpapi_key": bool(os.environ.get("SERPAPI_KEY")),
        "groq_key": bool(os.environ.get("GROQ_API_KEY")),
        "environment": os.environ.get("ENVIRONMENT", "development")
    })


@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response, 200

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name        = data.get("professor_name", "").strip()
    university  = data.get("university", "").strip()
    interests   = data.get("interests", "").strip()
    degree      = data.get("degree", "masters")
    known_paper = data.get("known_paper", "").strip()
    scholar_url = data.get("scholar_url", "").strip()

    if not name or not interests:
        return jsonify({
            "error": "Professor name and research interests are required"
        }), 400

    professor = None
    papers    = []
    verified  = False

    # ── Layer 1: Paper title anchor ───────────────────────────────────
    if known_paper and not scholar_url and S2_API_KEY:
        print(f"[app] Layer 1: paper title anchor — {known_paper[:50]}")
        s2_paper = find_paper_by_title(known_paper)
        if s2_paper:
            paper_detail = safe_get(
                f"{BASE_URL}/paper/{s2_paper.get('paperId', '')}",
                params={"fields": "authors"}
            )
            if paper_detail:
                authors = paper_detail.json().get("authors", [])
                name_lower = name.lower()
                for author in authors:
                    author_name = author.get("name", "").lower()
                    if any(p in author_name
                           for p in name_lower.split() if len(p) > 2):
                        details = get_author_details(author["authorId"])
                        professor = {
                            "id": author["authorId"],
                            "name": details.get("name", name),
                            "affiliations": details.get("affiliations") or ([university] if university else []),
                            "paper_count": details.get("paperCount", 0),
                            "h_index": details.get("hIndex", 0),
                            "homepage": details.get("homepage", ""),
                            "source": "semantic_scholar"
                        }
                        papers = get_professor_papers(author["authorId"])
                        for p in papers:
                            p["text"] = extract_paper_text(p)
                        verified = True
                        print(f"[app] Layer 1 success: {professor['name']}")
                        break

    # ── Layer 2: Semantic Scholar by name ─────────────────────────────
    if not papers and not scholar_url and S2_API_KEY:
        print(f"[app] Layer 2: Semantic Scholar name search")
        professor = find_professor(name, university)
        if professor:
            raw_papers = get_professor_papers(professor["id"])
            for p in raw_papers:
                p["text"] = extract_paper_text(p)
            papers = raw_papers
            verified = True
            print(f"[app] Layer 2 success: {len(papers)} papers")

    # ── Layer 3: arXiv by name ────────────────────────────────────────
    if not papers and not scholar_url and not university:
        print(f"[app] Layer 3: arXiv (no university — proceeding unverified)")
        arxiv_prof, arxiv_papers = find_professor_on_arxiv(name, university)
        if arxiv_papers:
            for p in arxiv_papers[:3]:  # Only extract PDFs for top 3
                pdf_url = p.get("openAccessPdf", {}).get("url")
                if pdf_url:
                    full_text = get_arxiv_pdf_text(pdf_url)
                    if full_text:
                        p["text"] = full_text
                time.sleep(0.2)
            # Rest just use abstracts
            for p in arxiv_papers[3:]:
                p["text"] = p.get("abstract") or ""
            professor = arxiv_prof
            papers = arxiv_papers
            verified = False
            print(f"[app] Layer 3 success: {len(papers)} papers (unverified)")

    # ── Layer 4: Google Scholar ───────────────────────────────────────
    needs_scholar = (
        scholar_url or
        not papers or
        (university and not verified)
    )

    if needs_scholar:
        reason = (
            "URL provided" if scholar_url
            else "university given but unverified" if (university and not verified)
            else "no papers found yet"
        )
        print(f"[app] Layer 4: Google Scholar ({reason})")

        profile = get_scholar_profile(
            scholar_url=scholar_url or None,
            author_name=name,
            university=university
        )

        if profile:
            professor = {
                "id": None,
                "name": profile["name"],
                "affiliations": [profile["affiliation"]] if profile["affiliation"] else ([university] if university else []),
                "paper_count": len(profile["papers"]),
                "h_index": 0,
                "homepage": scholar_url or "",
                "source": "google_scholar"
            }
            papers = enrich_papers_with_full_text(profile["papers"])
            verified = True
            print(f"[app] Layer 4 success: {len(papers)} papers (verified)")

        elif not papers:
            if scholar_url:
                return jsonify({
                    "error": "scholar_blocked",
                    "message": "Could not read that Google Scholar page right now. "
                               "Try again in a moment, or try without the URL."
                }), 503

            print(f"[app] Scholar failed — last resort arXiv")
            arxiv_prof, arxiv_papers = find_professor_on_arxiv(name, university)
            if arxiv_papers:
                for p in arxiv_papers:
                    pdf_url = p.get("openAccessPdf", {}).get("url")
                    if pdf_url:
                        full_text = get_arxiv_pdf_text(pdf_url)
                        if full_text:
                            p["text"] = full_text
                    time.sleep(0.2)
                professor = arxiv_prof
                papers = arxiv_papers
                verified = False
                print(f"[app] Last resort arXiv: {len(papers)} papers")

    # ── Nothing found ─────────────────────────────────────────────────
    if not papers:
        return jsonify({
            "error": "not_found",
            "message": (
                f"Could not find {name} on Semantic Scholar, arXiv, "
                "or Google Scholar. Try adding a paper title you know "
                "they wrote, or paste their Google Scholar URL directly."
            )
        }), 404

    if professor:
        if not professor.get("name"):
            professor["name"] = name
        if not professor.get("affiliations"):
            professor["affiliations"] = [university] if university else []

    # ── Rank + Generate ───────────────────────────────────────────────
    relevant_papers = rank_papers(interests, papers)
    email = generate_email(professor, relevant_papers, interests, degree)
    relevance = score_relevance(interests, relevant_papers)

    return jsonify({
        "professor": professor,
        "papers": [
            {
                "title": p.get("title"),
                "year": p.get("year"),
                "abstract": (p.get("abstract") or "")[:300],
                "source": p.get("source", "unknown")
            }
            for p in relevant_papers
        ],
        "email": email,
        "source": professor.get("source", "unknown"),
        "verified": verified,
        "relevance_score": relevance
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)