// App_v1.0 — This section is intended to render the placeholder stage (iPhone and Watch slots, presenter bar slot) and the mandatory footer until S6 builds the real stage.
const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
  stage: { flex: 1, display: 'flex', gap: 48, alignItems: 'center', justifyContent: 'center', padding: 32 },
  phone: { width: 390, height: 844, border: '1px solid var(--hairline)', borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  watch: { width: 198, height: 242, border: '1px solid var(--hairline)', borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bar: { textAlign: 'center' as const, padding: 12, color: 'var(--muted)' },
  footer: { textAlign: 'center' as const, padding: 16, fontSize: 13, color: 'var(--muted)', borderTop: '1px solid var(--grid-empty)' },
  brand: { color: 'var(--brand)', margin: 0 },
}

export default function App() {
  return (
    <div style={styles.page}>
      <main style={styles.stage} aria-label="Device stage">
        <section style={styles.phone} aria-label="iPhone">
          <h1 style={styles.brand}>Igusa</h1>
        </section>
        <section style={styles.watch} aria-label="Apple Watch">
          <span>Watch</span>
        </section>
      </main>
      <div style={styles.bar} aria-label="Presenter bar">Presenter bar</div>
      <footer style={styles.footer}>Prototype. Sample data. Not medical advice.</footer>
    </div>
  )
}
