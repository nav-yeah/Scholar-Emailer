import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def rank_papers(interests, papers):
    """Pick top 2-3 most relevant papers using LLM."""
    if not papers:
        return []
    if len(papers) <= 2:
        return papers

    paper_list = "\n".join([
        f"{i+1}. {p.get('title', 'Untitled')}\n   {(p.get('abstract') or '')[:200]}"
        for i, p in enumerate(papers)
    ])

    prompt = f"""Student's research interests:
{interests}

Professor's papers:
{paper_list}

Which 2-3 papers are most relevant to the student?
Reply with ONLY the numbers, comma separated. Example: 1, 3
Nothing else."""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=20
        )
        result = response.choices[0].message.content.strip()

        indices = []
        for part in result.replace(",", " ").split():
            try:
                idx = int(part) - 1
                if 0 <= idx < len(papers):
                    indices.append(idx)
            except ValueError:
                continue

        selected = [papers[i] for i in indices[:3]]
        return selected if selected else papers[:2]

    except Exception as e:
        print(f"[email] Ranking failed: {e}")
        return papers[:2]


def generate_email(professor, papers, interests, degree):
    """Generate a personalized cold email."""
    papers_text = ""
    for i, paper in enumerate(papers[:3]):
        content = paper.get("text") or paper.get("abstract") or ""
        papers_text += f"""
Paper {i+1}: {paper.get('title', 'Untitled')} ({paper.get('year', 'N/A')})
{content[:500]}
"""

    affiliation = ", ".join(professor.get("affiliations", [])) or "your institution"

    prompt = f"""You are helping a {degree} student write a cold email to a professor.

Professor: {professor.get('name')}, {affiliation}
Student's research interests: {interests}

Professor's most relevant papers:
{papers_text}

Write a cold email that:
- Is under 150 words
- References a specific finding or method from one of their papers — not just the title
- Explains what the student is working on and why it connects to the professor's work
- Ends with a specific ask: a 15-minute call OR asking if they are taking students
- Does NOT use phrases like "I am deeply inspired", "groundbreaking", "I came across your work"
- Sounds like a real person wrote it

Format:
Subject: [subject line]

[email body]

Return only the email. No commentary."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[email] Generation failed: {e}")
        return "Email generation failed. Please try again."
def score_relevance(interests, papers):
    """Score 0-10 how well professor's papers match student's interests."""
    if not papers:
        return 0

    paper_list = "\n".join([
        f"- {p.get('title', '')}"
        for p in papers[:5]
    ])

    prompt = f"""Student's research interests: {interests}

Professor's papers:
{paper_list}

Rate how relevant this professor's research is to the student's interests.
Reply with ONLY a single integer from 0 to 10.
0 = completely unrelated, 10 = perfect match."""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5
        )
        score = int(response.choices[0].message.content.strip())
        return max(0, min(10, score))
    except Exception:
        return 5  # neutral fallback