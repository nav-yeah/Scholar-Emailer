import requests
import urllib.parse
import xml.etree.ElementTree as ET
import time


NS = "http://www.w3.org/2005/Atom"


def find_professor_on_arxiv(name, university):
    """
    Search arXiv for papers by this author.
    Returns professor dict + list of papers, or None.
    """
    print(f"[arxiv] Searching for: {name}")

    # arXiv author search
    query = urllib.parse.quote(f"au:{name}")
    url = f"http://export.arxiv.org/api/query?search_query={query}&max_results=5&sortBy=submittedDate"

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()

        root = ET.fromstring(response.text)
        entries = root.findall(f"{{{NS}}}entry")

        if not entries:
            print(f"[arxiv] No results for: {name}")
            return None, []

        papers = []
        for entry in entries:
            title_el = entry.find(f"{{{NS}}}title")
            abstract_el = entry.find(f"{{{NS}}}summary")
            year_el = entry.find(f"{{{NS}}}published")
            id_el = entry.find(f"{{{NS}}}id")

            title = title_el.text.strip().replace("\n", " ") if title_el is not None else ""
            abstract = abstract_el.text.strip().replace("\n", " ") if abstract_el is not None else ""
            year = year_el.text[:4] if year_el is not None else "N/A"
            arxiv_url = id_el.text.strip() if id_el is not None else ""

            # Convert to PDF link
            pdf_url = arxiv_url.replace("abs", "pdf") if arxiv_url else ""

            if title and abstract:
                papers.append({
                    "title": title,
                    "abstract": abstract,
                    "year": year,
                    "text": abstract[:3000],
                    "openAccessPdf": {"url": pdf_url},
                    "source": "arxiv"
                })

        if not papers:
            return None, []

        print(f"[arxiv] Found {len(papers)} papers for {name}")

        # Build professor dict from arXiv data
        professor = {
            "id": None,
            "name": name,  # Use the name as provided
            "affiliations": [university] if university else [],
            "paper_count": len(papers),
            "h_index": 0,
            "homepage": "",
            "source": "arxiv"
        }

        return professor, papers

    except Exception as e:
        print(f"[arxiv] Search failed: {e}")
        return None, []


def get_arxiv_pdf_text(pdf_url):
    """
    Download and extract text from an arXiv PDF.
    Falls back to abstract if download fails.
    """
    try:
        import pdfplumber
        import io

        response = requests.get(pdf_url, timeout=15)
        response.raise_for_status()

        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            text = ""
            for page in pdf.pages[:3]:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

        if text.strip():
            print(f"[arxiv] Extracted PDF: {pdf_url[:60]}")
            return text[:3000]

    except Exception as e:
        print(f"[arxiv] PDF extraction failed: {e}")

    return None
def find_paper_on_arxiv_by_title(title):
    """Search arXiv for a specific paper by title. Returns text or None."""
    import urllib.parse
    query = urllib.parse.quote(f'ti:"{title}"')
    url = f"http://export.arxiv.org/api/query?search_query={query}&max_results=1"

    try:
        response = requests.get(url, timeout=10)
        root = ET.fromstring(response.text)
        entries = root.findall(f"{{{NS}}}entry")

        if not entries:
            return None

        entry = entries[0]
        abstract_el = entry.find(f"{{{NS}}}summary")
        id_el = entry.find(f"{{{NS}}}id")

        if not abstract_el:
            return None

        # Try getting full PDF text
        if id_el is not None:
            pdf_url = id_el.text.strip().replace("abs", "pdf")
            full_text = get_arxiv_pdf_text(pdf_url)
            if full_text:
                return full_text

        return abstract_el.text.strip()[:3000]

    except Exception as e:
        print(f"[arxiv] Title search failed: {e}")
        return None