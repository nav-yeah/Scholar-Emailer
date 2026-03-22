# Scholar-Emailer

Cold emails professors actually read.

Scholar-Emailer is a full-stack tool that helps students write highly personalized cold emails for research internships and graduate admissions. Instead of generic templates, it analyzes real research papers and references specific findings from them.

Live Demo: https://scholar-emailer.vercel.app

---

## Why Did I Build This?

While applying for research internships, I had to write cold emails to multiple professors. Going through each professor’s papers to personalize emails was time-consuming and tedious, so I built Scholar-Emailer to automate the process using actual research content.

---

## What It Does

Input:
- Professor name
- University (optional but recommended)
- Your research interests

Output:
- A 120–180 word personalized email that:
  - References actual research findings
  - Connects them to your interests
  - Includes a clear ask

---

## Why Is It Different?

Typical AI-generated email:
"I am deeply inspired by your groundbreaking work in AI..."

Scholar-Emailer:
"Your finding in [paper] that [method] achieved [result] aligns closely with my work on..."

- Uses real paper content (PDFs)
- Avoids generic flattery
- Produces credible, research-backed emails

---

## Architecture

### 4-Layer Professor Lookup Pipeline

#### 1. Paper Title Anchor (Most Accurate)
- User provides a known paper title
- Searches Semantic Scholar
- Identifies the exact author
- Retrieves all associated papers

#### 2. Semantic Scholar by Name
- Matches:
  - Name similarity
  - University affiliation
  - Paper count
- Best for CS/ML and international professors

#### 3. arXiv Fallback
- Used when no university is provided
- Avoids ambiguity when names are common

#### 4. Google Scholar
- Covers Indian colleges and lesser-known institutions
- Uses:
  - scholarly (development)
  - SerpAPI (production)

---

## Paper Text Retrieval

For each paper:

1. Try open-access PDF via Semantic Scholar  
2. Download using requests  
3. Extract text using pdfplumber (first page)  
4. If unavailable, fallback to abstract  

Note: Paywalled papers reduce email depth.

---

## Email Generation

### Step 1: Relevance Ranking
- Model: llama-3.1-8b
- Ranks papers based on user interests

### Step 2: Email Generation
- Model: llama-3.3-70b
- Constraints:
  - 200–220 words
  - Must reference specific findings
  - Include user’s work
  - End with a clear ask
  - No generic praise

Output:
- Email
- Relevance score (0–10)

---

## Tech Stack

| Component        | Technology            |
|-----------------|----------------------|
| Frontend        | React, Vite          |
| Backend         | Python, Flask        |
| LLM             | Groq (LLaMA 3.3 70B) |
| Paper Data      | Semantic Scholar API |
| PDF Parsing     | pdfplumber           |
| Scholar Access  | scholarly, SerpAPI   |
| Frontend Deploy | Vercel               |
| Backend Deploy  | Render               |

---

## Running Locally

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create backend/.env:

```
GROQ_API_KEY=your_key
S2_API_KEY=your_key
SERPAPI_KEY=your_key
ENVIRONMENT=development
```

Run backend:

```bash
python app.py
```

---

### Frontend Setup

```bash
cd frontend-web
npm install
npm run dev
```

---

## Environment Variables

### Backend (Render)

| Variable        | Description                          |
|----------------|--------------------------------------|
| GROQ_API_KEY   | LLM inference key                    |
| S2_API_KEY     | Semantic Scholar API key             |
| SERPAPI_KEY    | Google Scholar scraping (production) |
| ENVIRONMENT    | development or production            |

---

### Frontend (Vercel)

| Variable        | Description                   |
|----------------|-------------------------------|
| VITE_API_URL   | Backend URL (Render endpoint) |

---

## Professor Coverage

| Institution Type                | Coverage | Primary Source   |
|--------------------------------|----------|------------------|
| IIT, IISc, TIFR               | Good     | Semantic Scholar |
| MIT, Stanford, CMU            | Good     | Semantic Scholar |
| NIT, BITS                     | Partial  | arXiv, Scholar   |
| Any Scholar profile available | Full     | Google Scholar   |

---

## Known Limitations

- Render free tier sleeps after 15 minutes of inactivity  
- First request may take around 60 seconds  
- Paywalled papers fall back to abstract  
- Google Scholar scraping may be blocked in development  
- Common names without university may match the wrong professor  

---

## Future Improvements

- Better disambiguation for common names  
- Multi-page PDF parsing  
- UI for editing generated emails  
- Caching frequent queries  
- Improved ranking model  

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

---

## License

MIT License
