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


import random

OPENERS = [
    "Start with what specifically caught the student's attention in the paper — a method, a result, a dataset choice. Not the title.",
    "Start with what the student is building and why they hit a wall that this professor's work addresses.",
    "Start with a specific question the student has about the professor's methodology.",
    "Start by connecting one specific finding from the paper to something the student observed in their own work.",
]

TONES = [
    "Direct and confident. No hedging. The student knows what they want.",
    "Curious and specific. The student genuinely wants to understand the research better.",
    "Collaborative. The student has something to offer too, not just asking for help.",
]

def generate_email(professor, papers, interests, degree):
    papers_text = ""
    for i, paper in enumerate(papers[:3]):
        content = paper.get("text") or paper.get("abstract") or ""
        papers_text += f"""
Paper {i+1}: {paper.get('title', 'Untitled')} ({paper.get('year', 'N/A')})
{content[:600]}
"""

    affiliation = ", ".join(professor.get("affiliations", [])) or "your institution"
    opener_style = random.choice(OPENERS)
    tone = random.choice(TONES)

    prompt = f"""You are helping a {degree} student write a cold email to a professor.

Professor: {professor.get('name')}, {affiliation}
Student's research interests: {interests}

Professor's most relevant papers:
{papers_text}

Writing style for this email:
- Opener approach: {opener_style}
- Tone: {tone}

Rules:
- 250 to 300 words. Not shorter, not longer.
- Reference a SPECIFIC finding, number, method, or dataset from one paper — not just the title
- One sentence max about the student's own work
- End with ONE specific ask — either a 15-minute call OR whether they are taking students for {degree}
- No "I came across your work", "deeply inspired", "groundbreaking", "I hope this email finds you well"
- No hollow flattery of any kind
- Write the student's name placeholder as [Your Name]
- Sound like a {degree} student wrote it at 11pm, not a PR person

Format:
Subject: [subject line]

Dear Professor [Last Name],

[2-3 paragraphs with blank lines between them]

Best,
[Your Name]

Important: Each paragraph must be separated by a blank line. The sign-off "Best," and "[Your Name]" must be on separate lines.
Return only the email. Nothing else."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.85,  # higher = more varied
            max_tokens=500
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
Reply with ONLY a single integer from 0 to 10. Nothing else. No explanation.
0 = completely unrelated fields, 10 = perfect match."""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5
        )
        raw = response.choices[0].message.content.strip()
        import re
        numbers = re.findall(r'\d+', raw)
        if numbers:
            return max(0, min(10, int(numbers[0])))
        return 5
    except Exception:
        return 5