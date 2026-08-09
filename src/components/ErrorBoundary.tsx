import { Component, type ErrorInfo, type ReactNode, type CSSProperties } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; armed: boolean }

// Top-level safety net: if any render throws (e.g. corrupted saved data or a
// bad content edit), show a friendly bilingual screen instead of a blank page,
// with recovery actions. Kept self-contained (no context/i18n) so it works even
// when the provider tree is the thing that failed.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, armed: false }
  static getDerivedStateFromError(error: Error): State { return { error, armed: false } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App error:', error, info.componentStack) }

  private disarm?: ReturnType<typeof setTimeout>
  componentWillUnmount() { clearTimeout(this.disarm) }

  reload = () => location.reload()
  // Two taps instead of window.confirm(): a browser that has suppressed dialogs, or a WebView that
  // never shows them, would otherwise make this button do nothing on the one screen that must work.
  //
  // The armed state expires. It used to hold until the page was reloaded, and this screen offers no
  // cancel — so a student who tapped once, thought better of it and later brushed the same button
  // wiped every lesson they had finished, with no second warning. A bounded window IS the cancel:
  // walk away and the label goes back to saying what it does.
  reset = () => {
    if (!this.state.armed) {
      this.setState({ armed: true })
      this.disarm = setTimeout(() => this.setState({ armed: false }), 5000)
      return
    }
    clearTimeout(this.disarm)
    try { Object.keys(localStorage).filter(k => k.startsWith('meem_')).forEach(k => localStorage.removeItem(k)) } catch { /* storage unavailable — reloading is still worth a try */ }
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    const wrap: CSSProperties = { minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0A0E12', color: '#E8F0F4', fontFamily: 'ui-sans-serif, system-ui, sans-serif', padding: 24 }
    const card: CSSProperties = { maxWidth: 420, width: '100%', textAlign: 'center', background: '#18212B', border: '1px solid #1E2A36', borderRadius: 16, padding: '28px 24px' }
    const primary: CSSProperties = { display: 'block', width: '100%', marginTop: 14, padding: 12, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', background: '#2BF5A0', color: '#08130d' }
    const ghost: CSSProperties = { display: 'block', width: '100%', marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid rgba(255,110,124,.4)', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#FF6E7C' }
    return (
      <div style={wrap} role="alert">
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 6 }} aria-hidden>⚡</div>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 20, margin: '0 0 10px', color: '#2BF5A0' }}>Ceva n-a mers</h1>
          <p style={{ color: '#9DB0BC', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }}>A apărut o eroare neașteptată. Reîncarcă aplicația; dacă problema persistă, resetează datele salvate.</p>
          <p style={{ color: '#5E7482', fontSize: 12, lineHeight: 1.5, margin: 0 }}>Something went wrong. Reload the app; if it keeps happening, reset the saved data.</p>
          <button onClick={this.reload} style={primary}>Reîncarcă · Reload</button>
          <button onClick={this.reset} style={ghost}>{this.state.armed ? 'Sigur? Apasă din nou · Sure? Tap again' : 'Resetează datele · Reset data'}</button>
        </div>
      </div>
    )
  }
}
