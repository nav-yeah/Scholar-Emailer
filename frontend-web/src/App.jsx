import { useState, useEffect } from 'react'

const DEGREES = ['Undergraduate', 'Masters', 'PhD']
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STEPS = [
  'Searching Semantic Scholar',
  'Checking arXiv',
  'Reading papers',
  'Ranking by relevance',
  'Writing your email',
]

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s < STEPS.length - 1 ? s + 1 : s))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="spinner-page">
      <div className="spinner-ring" />
      <div className="spinner-dots">
        <div className="spinner-dot" />
        <div className="spinner-dot" />
        <div className="spinner-dot" />
      </div>
      <p className="spinner-title">Finding the right papers…</p>
      <div className="spinner-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`spinner-step${i === activeStep ? ' active' : ''}`}>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Input Page ───────────────────────────────────────────────────────────────
function InputPage({ onResult }) {
  const [form, setForm] = useState({
    professor_name: '',
    university: '',
    interests: '',
    degree: 'Masters',
    known_paper: '',
    scholar_url: '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit() {
    if (!form.professor_name.trim() || !form.interests.trim()) {
      setError('Professor name and research interests are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, degree: form.degree.toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || 'Something went wrong. Try again.')
        return
      }
      onResult(data, form)
    } catch {
      setError('Could not reach the server. Is your backend running on port 5000?')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="input-page">
      <nav className="topnav">
        <div className="logo">Scholar<span>-Emailer</span></div>
        <div className="nav-tag">Research Email Generator</div>
      </nav>

      <div className="home-body">
        {/* Left — Hero + How it works */}
        <div className="home-left">
          <div className="hero">
            <div className="hero-eyebrow">AI-powered · reads actual papers</div>
            <h1 className="hero-title">
              Cold emails<br />
              professors <em>actually</em><br />
              read.
            </h1>
            <p className="hero-sub">
              Enter a professor's name. We find their papers, read the PDFs,
              and write an email that references real research — not generic praise.
            </p>
          </div>

          <div className="how-section">
            <div className="how-label">How it works</div>
            <div className="how-grid">
              {[
                { n: '01', title: 'Finds the professor', desc: 'Searches Semantic Scholar, arXiv, and Google Scholar across 4 lookup layers.' },
                { n: '02', title: 'Reads their papers', desc: 'Downloads open-access PDFs and extracts the abstract and introduction.' },
                { n: '03', title: 'Writes the email', desc: 'References a specific finding from their research — not just the paper title.' },
              ].map(s => (
                <div key={s.n} className="how-item">
                  <div className="how-num">{s.n}</div>
                  <div className="how-title">{s.title}</div>
                  <div className="how-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="home-right">
          <div className="form-section">
            <div className="form-card">

              {/* Professor name — full width */}
              <div className="form-row single">
                <div className="field">
                  <div className="field-label">
                    Professor name <span className="req">*</span>
                  </div>
                  <input
                    placeholder="e.g. Yoshua Bengio"
                    value={form.professor_name}
                    onChange={set('professor_name')}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
              </div>

              {/* University — full width */}
              <div className="form-row single">
                <div className="field">
                  <div className="field-label">University</div>
                  <input
                    placeholder="e.g. University of Montreal, IIT Bombay"
                    value={form.university}
                    onChange={set('university')}
                  />
                </div>
              </div>

              {/* Research interests — full width */}
              <div className="form-row single">
                <div className="field">
                  <div className="field-label">
                    Research interests <span className="req">*</span>
                  </div>
                  <textarea
                    placeholder="e.g. I'm working on applying transformer architectures to protein structure prediction..."
                    value={form.interests}
                    onChange={set('interests')}
                    rows={3}
                  />
                </div>
              </div>

              {/* Degree */}
              <div className="degree-row">
                {DEGREES.map(d => (
                  <button
                    key={d}
                    className={`degree-btn${form.degree === d ? ' active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, degree: d }))}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Advanced toggle */}
              <button
                className={`advanced-toggle${showAdvanced ? ' open' : ''}`}
                onClick={() => setShowAdvanced(v => !v)}
              >
                <span className="arrow">▼</span>
                Advanced options
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  — paper title anchor · Google Scholar URL
                </span>
              </button>

              {showAdvanced && (
                <div className="advanced-panel">
                  <div className="form-row single">
                    <div className="field">
                      <div className="field-label">
                        Known paper title <span className="opt">optional</span>
                      </div>
                      <input
                        placeholder="e.g. Attention is All You Need"
                        value={form.known_paper}
                        onChange={set('known_paper')}
                      />
                    </div>
                  </div>
                  <div className="form-row single">
                    <div className="field">
                      <div className="field-label">
                        Google Scholar URL <span className="opt">optional</span>
                      </div>
                      <input
                        placeholder="https://scholar.google.com/citations?user=..."
                        value={form.scholar_url}
                        onChange={set('scholar_url')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="error-msg">{error}</div>}

              <div className="form-footer">
                <p className="submit-hint">
                  Takes 15–30 seconds.<br />We actually read their papers.
                </p>
                <button className="submit-btn" onClick={handleSubmit}>
                  Generate email →
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Results Page ─────────────────────────────────────────────────────────────
function ResultsPage({ result, form, onBack, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const { professor, papers, email, source, verified, relevance_score } = result

  const lines = email.split('\n')
  const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'))
  const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : ''
  const body = lines
    .filter(l => !l.toLowerCase().startsWith('subject:'))
    .join('\n')
    .trim()

  const sourceLabel = {
    semantic_scholar: 'Semantic Scholar',
    arxiv: 'arXiv',
    google_scholar: 'Google Scholar',
  }[source] || source

  const affiliation = professor.affiliations?.join(', ') || form.university || '—'

  function copyEmail() {
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, degree: form.degree.toLowerCase() }),
      })
      const data = await res.json()
      if (res.ok) onRegenerate(data)
    } catch (e) {
      console.error(e)
    } finally {
      setRegenerating(false)
    }
  }

  if (regenerating) return <Spinner />

  return (
    <div className="results-page">

      {/* Top bar */}
      <div className="results-topbar">
        <div className="logo" style={{ fontSize: 20 }}>
          Scholar<span style={{ color: 'var(--amber)' }}>-Emailer</span>
        </div>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="topbar-right">
          <span className={`badge ${verified ? 'verified' : 'unverified'}`}>
            {verified ? '✓ Verified' : '⚠ Unverified'} · {sourceLabel}
          </span>
        </div>
      </div>

      <div className="split-layout">

        {/* ── Left: Professor + Papers ── */}
        <div className="left-panel">
          <div className="prof-header">
            <div className="prof-initial">
              {professor.name?.charAt(0) || '?'}
            </div>
            <h2 className="prof-name">{professor.name}</h2>
            <p className="prof-affil">{affiliation}</p>
            <div className="prof-stats">
              {professor.h_index > 0 && (
                <div>
                  <div className="stat-num">{professor.h_index}</div>
                  <div className="stat-label">h-index</div>
                </div>
              )}
              {professor.paper_count > 0 && (
                <div>
                  <div className="stat-num">{professor.paper_count}</div>
                  <div className="stat-label">papers</div>
                </div>
              )}
            </div>
          </div>

          <div className="papers-section">
            <div className="papers-heading">Papers referenced</div>
            {papers.map((p, i) => (
              <div key={i} className="paper-item">
                <div className="paper-num">0{i + 1}</div>
                <div className="paper-title">{p.title}</div>
                <div className="paper-meta">{p.year} · {p.source}</div>
                {p.abstract && (
                  <div className="paper-abstract">
                    {p.abstract.slice(0, 180)}…
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Email ── */}
        <div className="right-panel">
          <div className="email-toolbar">
            <div className="email-meta">
              <div className="email-tag">Generated Email</div>
              {subject && <div className="email-subject">{subject}</div>}
            </div>
            <div className="email-actions">
              <button
                className="btn-secondary"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                ↺ Regenerate
              </button>
              <button
                className={`btn-primary${copied ? ' copied' : ''}`}
                onClick={copyEmail}
              >
                {copied ? '✓ Copied' : '⎘ Copy email'}
              </button>
            </div>
          </div>

          <div className="email-body-wrap">
            <div className="email-body">
              {body.split('\n').map((line, i) =>
                line.trim() === ''
                  ? <br key={i} />
                  : <p key={i} style={{ marginBottom: '0.4em' }}>{line}</p>
              )}
              <span className="cursor" />
            </div>
          </div>

          {!verified && (
            <div className="notice warn">
              <span className="notice-icon">⚠</span>
              <div className="notice-content">
                <div className="notice-title">Unverified results</div>
                Could not confirm this is the right professor. Paste their Google Scholar URL for guaranteed accuracy.
              </div>
            </div>
          )}

          {relevance_score !== undefined && (
            <div className={`notice ${relevance_score >= 7 ? 'verified-notice' : relevance_score >= 5 ? 'warn' : 'relevance'}`}>
              <span className="notice-icon">
                {relevance_score >= 7 ? '✓' : relevance_score >= 5 ? '~' : '↯'}
              </span>
              <div className="notice-content">
                <div className="notice-title">
                  Relevance — {relevance_score}/10 · {relevance_score >= 7 ? 'Good match' : relevance_score >= 5 ? 'Partial match' : 'Low match'}
                </div>
                {relevance_score < 6 && "This professor's research doesn't closely match your interests. The email may feel like a stretch."}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState(null)
  const [form, setForm] = useState(null)

  if (result) {
    return (
      <ResultsPage
        result={result}
        form={form}
        onBack={() => setResult(null)}
        onRegenerate={newResult => setResult(newResult)}
      />
    )
  }

  return (
    <InputPage
      onResult={(data, f) => {
        setResult(data)
        setForm(f)
      }}
    />
  )
}
