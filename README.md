# Scholar-Emailer
Scholar-Emailer
Cold emails professors actually read.
A full-stack tool that helps students write personalized cold emails to professors for research internships and graduate admissions. Instead of generic templates, it reads actual research papers and references specific findings.
Live: https://scholar-emailer.vercel.app
---
What it does
You enter a professor's name, university, and your research interests
It finds their papers across multiple academic databases
It downloads the paper PDFs and reads the first page
It generates a personalized email referencing real research, not just paper titles
---
Why it is different from ChatGPT
ChatGPT cold email:
> I am deeply inspired by your groundbreaking work in AI...
Scholar-Emailer:
> Your finding in [paper] that [specific method] achieved [specific result] connects directly to what I am working on...
The difference is real paper content extracted from the actual PDF.
---
Architecture
4-Layer Professor Lookup Pipeline
Layer 1 — Paper Title Anchor
Most accurate layer. User provides a paper title they know the professor wrote.
The system searches Semantic Scholar by that title, finds the paper, identifies the author,
and pulls all their work. A paper title uniquely identifies a professor even if their name is common.
Layer 2 — Semantic Scholar by Name
Searches the Semantic Scholar author database by name and university.
Candidates are scored by name match, affiliation overlap, and paper count.
Best source for international and CS/ML professors.
Layer 3 — arXiv by Name
Fallback for professors not on Semantic Scholar.
Only runs when no university is provided — with a university and a common name,
arXiv results are too ambiguous to trust.
Layer 4 — Google Scholar
Catches everyone else including professors at smaller Indian colleges.
Uses the scholarly library in development and SerpAPI in production.
Paper titles from Scholar are then enriched using Semantic Scholar and arXiv for full text.
How paper text is retrieved
For each paper found, the system tries in order:
Semantic Scholar provides a URL to the open-access PDF for papers that are freely available
The PDF is downloaded using the requests library
pdfplumber opens the downloaded file and extracts text from the first page
If the PDF is paywalled or unavailable, the abstract is used instead
Not all papers are open-access. Paywalled papers fall back to the abstract,
which reduces email depth but keeps the tool functional.
Email generation
The LLM (llama-3.1-8b) first ranks the professor's papers by relevance to the student's interests.
The top papers are passed to a larger model (llama-3.3-70b) which generates the email.
The prompt enforces:
120 to 180 words
Reference to a specific finding, not just the paper title
One sentence about the student's own work
A specific ask at the end
No generic flattery phrases
A relevance score from 0 to 10 is shown to the user so they know how well the professor's
work actually matches their interests before sending.
---
Tech stack
Component	Technology
Frontend	React, Vite
Backend	Python, Flask
LLM	Groq — llama-3.3-70b-versatile
Paper data	Semantic Scholar API
PDF parsing	pdfplumber
Google Scholar	scholarly (development), SerpAPI (production)
Frontend deploy	Vercel
Backend deploy	Render
---
Running locally
Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
Create `backend/.env`:
```
GROQ_API_KEY=your_key
S2_API_KEY=your_key
SERPAPI_KEY=your_key
ENVIRONMENT=development
```
```bash
python app.py
```
Frontend setup
```bash
cd frontend-web
npm install
npm run dev
```
---
Environment variables
Backend (Render)
Variable	Description
GROQ_API_KEY	Groq API key for LLM inference
S2_API_KEY	Semantic Scholar API key
SERPAPI_KEY	SerpAPI key for Google Scholar in production
ENVIRONMENT	development or production
Frontend (Vercel)
Variable	Description
VITE_API_URL	Full URL of your Render backend
---
Professor coverage
Institution type	Coverage	Primary source
IIT, IISc, TIFR	Good	Semantic Scholar
MIT, Stanford, CMU	Good	Semantic Scholar
NIT, BITS	Partial	arXiv, Google Scholar
Any professor with a Google Scholar profile	Full	Scholar URL input
---
Known limitations
Render free tier spins down after 15 minutes of inactivity. First request after inactivity takes around 60 seconds while the server wakes up.
Paywalled papers fall back to the abstract, which reduces the specificity of the generated email.
Google Scholar scraping via the scholarly library is occasionally blocked in production. SerpAPI is used as the reliable alternative.
Common names without a university provided may match the wrong professor via arXiv.
---
