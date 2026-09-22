function App() {
  return (
    <main className="app-shell">
      <header className="brand-lockup" aria-label="Fisiospot Fisioterapia">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="brand-name">fisiospot</span>
        <span className="brand-subtitle">fisioterapia</span>
      </header>

      <section className="welcome-panel">
        <p className="eyebrow">Área clínica</p>
        <h1>Gestão que acompanha o movimento.</h1>
        <p className="intro">
          Pacientes, agenda, evolução clínica e faturação reunidos num só lugar.
        </p>
        <button className="primary-action" type="button">
          Entrar na plataforma
          <span aria-hidden="true">-&gt;</span>
        </button>
      </section>

      <footer className="status-line">
        <span className="status-dot" aria-hidden="true" />
        <span>Plataforma em preparação</span>
      </footer>
    </main>
  );
}

export default App;
