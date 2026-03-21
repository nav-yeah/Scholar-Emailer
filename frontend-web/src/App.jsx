import { useState } from 'react'

const DEGREES = ['Undergraduate', 'Masters', 'PhD']
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ─── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
      <p style={styles.spinnerText}>Finding papers & crafting your email…</p>
      <p style={styles.spinnerSub}>This takes 15–30 seconds. We're reading actual research papers.</p>
    </div>
  )
}

// ─── Input Page ──────────────────────────────────────────────────────────────
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

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
        body: JSON.stringify({
          ...form,
          degree: form.degree.toLowerCase(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || 'Something went wrong.')
        return
      }
      onResult(data, form)
    } catch (e) {
      setError('Could not reach the server. Is your backend running?')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div style={styles.page}>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.badge}>✦ AI-Powered</div>
        <h1 style={styles.heroTitle}>
          Cold emails that<br />
          <span style={styles.heroGrad}>professors actually read</span>
        </h1>
        <p style={styles.heroSub}>
          Enter a professor's name. We read their papers and write a personalized email — referencing real research, not generic praise.
        </p>
      </div>

      {/* ── Form card ── */}
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div style={styles.field}>
            <label style={styles.label}>Professor name <span style={styles.req}>*</span></label>
            <input
              style={styles.input}
              placeholder="e.g. Yoshua Bengio"
              value={form.professor_name}
              onChange={set('professor_name')}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>University</label>
            <input
              style={styles.input}
              placeholder="e.g. University of Montreal"
              value={form.university}
              onChange={set('university')}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Your research interests <span style={styles.req}>*</span>
          </label>
          <textarea
            style={styles.textarea}
            placeholder="e.g. I'm working on applying transformer architectures to protein structure prediction. I'm interested in self-supervised learning and multi-modal models..."
            value={form.interests}
            onChange={set('interests')}
            rows={4}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Degree level</label>
          <div style={styles.degreeRow}>
            {DEGREES.map((d) => (
              <button
                key={d}
                style={{
                  ...styles.degreeBtn,
                  ...(form.degree === d ? styles.degreeBtnActive : {}),
                }}
                onClick={() => setForm((f) => ({ ...f, degree: d }))}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          style={styles.advancedToggle}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? '▲' : '▼'} Advanced options
          <span style={styles.advancedHint}> (paper title anchor · Scholar URL)</span>
        </button>

        {showAdvanced && (
          <div style={styles.advancedPanel}>
            <div style={styles.field}>
              <label style={styles.label}>
                A paper title you know they wrote
                <span style={styles.hint}> — helps us find the right person for common names</span>
              </label>
              <input
                style={styles.input}
                placeholder="e.g. Attention is All You Need"
                value={form.known_paper}
                onChange={set('known_paper')}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>
                Google Scholar URL
                <span style={styles.hint}> — paste directly for guaranteed accuracy</span>
              </label>
              <input
                style={styles.input}
                placeholder="https://scholar.google.com/citations?user=..."
                value={form.scholar_url}
                onChange={set('scholar_url')}
              />
            </div>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.btn} onClick={handleSubmit}>
          Generate Email →
        </button>
      </div>

      {/* ── How it works ── */}
      <div style={styles.howRow}>
        {[
          { icon: '🔍', title: 'Finds the professor', desc: 'Searches Semantic Scholar, arXiv, and Google Scholar' },
          { icon: '📄', title: 'Reads their papers', desc: 'Downloads and extracts text from actual PDFs' },
          { icon: '✉️', title: 'Writes the email', desc: 'References specific findings — not just paper titles' },
        ].map((s) => (
          <div key={s.title} style={styles.howCard}>
            <div style={styles.howIcon}>{s.icon}</div>
            <div style={styles.howTitle}>{s.title}</div>
            <div style={styles.howDesc}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Results Page ────────────────────────────────────────────────────────────
function ResultsPage({ result, form, onBack, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const { professor, papers, email, source, verified, relevance_score } = result
  // Split subject + body
  const lines = email.split('\n')
  const subjectLine = lines.find((l) => l.toLowerCase().startsWith('subject:'))
  const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : ''
  const body = lines
    .filter((l) => !l.toLowerCase().startsWith('subject:'))
    .join('\n')
    .trim()

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
        body: JSON.stringify({
          ...form,
          degree: form.degree.toLowerCase(),
        }),
      })
      const data = await res.json()
      if (res.ok) onRegenerate(data)
    } catch (e) {
      console.error(e)
    } finally {
      setRegenerating(false)
    }
  }

  const sourceLabel = {
    semantic_scholar: 'Semantic Scholar',
    arxiv: 'arXiv',
    google_scholar: 'Google Scholar',
  }[source] || source

  const affiliation = professor.affiliations?.join(', ') || form.university || '—'

  return (
    <div style={styles.resultsPage}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.topBarRight}>
          <span style={{ ...styles.sourceBadge, ...(verified ? styles.sourceBadgeVerified : styles.sourceBadgeUnverified) }}>
            {verified ? '✓ Verified' : '⚠ Unverified'} · {sourceLabel}
          </span>
        </div>
      </div>

      <div style={styles.splitLayout}>
        {/* ── Left: Professor info ── */}
        <div style={styles.leftPanel}>
          <div style={styles.profCard}>
            <div style={styles.profAvatar}>
              {professor.name?.charAt(0) || '?'}
            </div>
            <h2 style={styles.profName}>{professor.name}</h2>
            <p style={styles.profAffil}>{affiliation}</p>

            <div style={styles.profStats}>
              {professor.h_index > 0 && (
                <div style={styles.stat}>
                  <div style={styles.statNum}>{professor.h_index}</div>
                  <div style={styles.statLabel}>h-index</div>
                </div>
              )}
              {professor.paper_count > 0 && (
                <div style={styles.stat}>
                  <div style={styles.statNum}>{professor.paper_count}</div>
                  <div style={styles.statLabel}>papers</div>
                </div>
              )}
            </div>
          </div>

          {/* Papers used */}
          <div style={styles.papersSection}>
            <h3 style={styles.papersTitle}>Papers referenced</h3>
            {papers.map((p, i) => (
              <div key={i} style={styles.paperCard}>
                <div style={styles.paperNum}>{i + 1}</div>
                <div>
                  <div style={styles.paperTitle}>{p.title}</div>
                  <div style={styles.paperMeta}>
                    {p.year} · {p.source}
                  </div>
                  {p.abstract && (
                    <div style={styles.paperAbstract}>
                      {p.abstract.slice(0, 180)}…
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Email ── */}
        <div style={styles.rightPanel}>
          <div style={styles.emailCard}>
            <div style={styles.emailHeader}>
              <div>
                <div style={styles.emailLabel}>Generated Email</div>
                {subject && <div style={styles.emailSubject}>{subject}</div>}
              </div>
              <div style={styles.emailActions}>
                <button
                  style={styles.regenBtn}
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? '…' : '↺ Regenerate'}
                </button>
                <button style={styles.copyBtn} onClick={copyEmail}>
                  {copied ? '✓ Copied!' : '⎘ Copy'}
                </button>
              </div>
            </div>

            <div style={styles.emailDivider} />

            <div style={styles.emailBody}>
              {body.split('\n').map((line, i) =>
                line.trim() === '' ? (
                  <br key={i} />
                ) : (
                  <p key={i} style={styles.emailLine}>{line}</p>
                )
              )}
            </div>
          </div>

          {relevance_score !== undefined && relevance_score < 6 && (
  			<div style={styles.relevanceWarning}>
    			<strong>⚠ Low relevance match ({relevance_score}/10)</strong>
    			<p>This professor's research doesn't closely align with your stated interests. The email may feel forced — consider emailing a professor whose work better 		  matches yours.</p>
  			</div>
	)}
        </div>
      </div>
    </div>
  )
}

// ─── App shell ───────────────────────────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState(null)
  const [form, setForm] = useState(null)

  if (result) {
    return (
      <ResultsPage
        result={result}
        form={form}
        onBack={() => setResult(null)}
        onRegenerate={(newResult) => setResult(newResult)}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  // Page
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },

  // Hero
  hero: {
    textAlign: 'center',
    marginBottom: 48,
  },
  badge: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #ede9ff, #ffe9f4)',
    color: '#5b4fff',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '6px 16px',
    borderRadius: 99,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 'clamp(36px, 6vw, 56px)',
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 20,
    color: '#0a0a0f',
    letterSpacing: '-0.02em',
  },
  heroGrad: {
    background: 'linear-gradient(135deg, #5b4fff 0%, #ff4f9b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: 18,
    color: '#7a7a9a',
    maxWidth: 480,
    margin: '0 auto',
    lineHeight: 1.6,
    fontWeight: 300,
  },

  // Card
  card: {
    background: '#ffffff',
    borderRadius: 24,
    padding: 40,
    boxShadow: '0 4px 24px rgba(91,79,255,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    marginBottom: 48,
  },

  // Fields
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#0a0a0f',
    letterSpacing: '0.02em',
  },
  req: {
    color: '#ff4f9b',
  },
  hint: {
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 300,
    color: '#7a7a9a',
    fontSize: 12,
  },
  input: {
    border: '1.5px solid #e5e5f0',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 15,
    fontFamily: 'DM Sans, sans-serif',
    color: '#0a0a0f',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#f7f7fc',
  },
  textarea: {
    border: '1.5px solid #e5e5f0',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 15,
    fontFamily: 'DM Sans, sans-serif',
    color: '#0a0a0f',
    outline: 'none',
    resize: 'vertical',
    background: '#f7f7fc',
    lineHeight: 1.6,
  },

  // Degree
  degreeRow: {
    display: 'flex',
    gap: 10,
  },
  degreeBtn: {
    flex: 1,
    padding: '10px 0',
    border: '1.5px solid #e5e5f0',
    borderRadius: 10,
    background: '#f7f7fc',
    fontSize: 14,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 600,
    color: '#7a7a9a',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  degreeBtnActive: {
    background: 'linear-gradient(135deg, #5b4fff, #ff4f9b)',
    border: 'none',
    color: '#fff',
  },

  // Advanced
  advancedToggle: {
    background: 'none',
    border: 'none',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: '#5b4fff',
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
  },
  advancedHint: {
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 300,
    color: '#7a7a9a',
    fontSize: 12,
  },
  advancedPanel: {
    background: '#f7f7fc',
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    border: '1.5px dashed #d0d0e8',
  },

  // Button
  btn: {
    background: 'linear-gradient(135deg, #5b4fff 0%, #ff4f9b 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '16px 32px',
    fontSize: 16,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'opacity 0.2s, transform 0.1s',
    width: '100%',
  },

  // Error
  error: {
    background: '#fff1f3',
    border: '1px solid #ffb3c1',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#c0392b',
    fontSize: 14,
    fontFamily: 'DM Sans, sans-serif',
  },

  // How it works
  howRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
  },
  howCard: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(91,79,255,0.06)',
  },
  howIcon: {
    fontSize: 28,
    marginBottom: 12,
  },
  howTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 6,
    color: '#0a0a0f',
  },
  howDesc: {
    fontSize: 13,
    color: '#7a7a9a',
    lineHeight: 1.5,
    fontWeight: 300,
  },

  // Spinner
  spinnerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 16,
    padding: 24,
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '3px solid #ede9ff',
    borderTop: '3px solid #5b4fff',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerText: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#0a0a0f',
  },
  spinnerSub: {
    fontSize: 14,
    color: '#7a7a9a',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 1.6,
  },

  // Results page
  resultsPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f7f7fc',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    background: '#fff',
    borderBottom: '1px solid #eeeef8',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#5b4fff',
    cursor: 'pointer',
  },
  sourceBadge: {
    fontSize: 12,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: 99,
    letterSpacing: '0.03em',
  },
  sourceBadgeVerified: {
    background: '#e8fff3',
    color: '#1a7a4a',
  },
  sourceBadgeUnverified: {
    background: '#fff8e8',
    color: '#a05a00',
  },

  // Split layout
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: 24,
    padding: 32,
    flex: 1,
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },

  // Left panel
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  profCard: {
    background: '#fff',
    borderRadius: 20,
    padding: 28,
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(91,79,255,0.06)',
  },
  profAvatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #5b4fff, #ff4f9b)',
    color: '#fff',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  profName: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0a0a0f',
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  profAffil: {
    fontSize: 14,
    color: '#7a7a9a',
    marginBottom: 20,
    fontWeight: 300,
  },
  profStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
  },
  stat: {
    textAlign: 'center',
  },
  statNum: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: 24,
    color: '#5b4fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#7a7a9a',
    fontWeight: 300,
  },

  // Papers
  papersSection: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 2px 12px rgba(91,79,255,0.06)',
  },
  papersTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#0a0a0f',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  paperCard: {
    display: 'flex',
    gap: 14,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottom: '1px solid #eeeef8',
  },
  paperNum: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #5b4fff, #ff4f9b)',
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  paperTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#0a0a0f',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  paperMeta: {
    fontSize: 11,
    color: '#7a7a9a',
    fontWeight: 300,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  paperAbstract: {
    fontSize: 12,
    color: '#7a7a9a',
    lineHeight: 1.5,
    fontWeight: 300,
  },

  // Right panel
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  emailCard: {
    background: '#fff',
    borderRadius: 20,
    padding: 32,
    boxShadow: '0 2px 12px rgba(91,79,255,0.06)',
    flex: 1,
  },
  emailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  emailLabel: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#7a7a9a',
    marginBottom: 6,
  },
  emailSubject: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#0a0a0f',
    letterSpacing: '-0.01em',
  },
  emailActions: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
  },
  copyBtn: {
    background: 'linear-gradient(135deg, #5b4fff, #ff4f9b)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  regenBtn: {
    background: '#f0eeff',
    color: '#5b4fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    cursor: 'pointer',
  },
  emailDivider: {
    height: 1,
    background: '#eeeef8',
    marginBottom: 24,
  },
  emailBody: {
    fontSize: 15,
    lineHeight: 1.8,
    color: '#3a3a4a',
    fontWeight: 300,
  },
  emailLine: {
    marginBottom: 2,
  },

  // Warning
  relevanceWarning: {
  	 background: '#fff3e0',
     border: '1px solid #ffcc80',
 	 borderRadius: 12,
 	 padding: '16px 18px',
  	fontSize: 13,
  	color: '#e65100',
  	lineHeight: 1.6,
  	display: 'flex',
  	flexDirection: 'column',
 	 gap: 6,
},
}

// Add spinner keyframes
const styleTag = document.createElement('style')
styleTag.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  input:focus, textarea:focus { border-color: #5b4fff !important; background: #fff !important; }
  button:hover { opacity: 0.9; }
`
document.head.appendChild(styleTag)
