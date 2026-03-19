import requests
import pdfplumber
import io

import logging
logging.getLogger("pdfplumber").setLevel(logging.ERROR)
logging.getLogger("pdfminer").setLevel(logging.ERROR)
def extract_paper_text(paper):
    """
    Try to get full text from open-access PDF.
    Falls back to abstract if anything fails.
    """
    pdf_info = paper.get("openAccessPdf")
    pdf_url = pdf_info.get("url") if isinstance(pdf_info, dict) else None

    if pdf_url:
        try:
            response = requests.get(pdf_url, timeout=12)
            response.raise_for_status()

            with pdfplumber.open(io.BytesIO(response.content)) as pdf:
                text = ""
                for page in pdf.pages[:3]:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"

            if text.strip():
                print(f"[pdf] Extracted: {paper.get('title', '')[:50]}")
                return text[:3000]

        except Exception as e:
            print(f"[pdf] Failed: {e}")

    abstract = paper.get("abstract", "")
    if abstract:
        print(f"[pdf] Using abstract: {paper.get('title', '')[:50]}")
        return abstract[:3000]

    return "No content available."