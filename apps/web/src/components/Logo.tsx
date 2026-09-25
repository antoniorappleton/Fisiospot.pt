/** Símbolo Fisiospot (DocsAux/Design/logo.png): círculo e quadrado com a figura vitruviana. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="140 25 400 400" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="340" cy="225" r="192" />
      <rect x="178" y="93" width="324" height="322" />
      <path d="M178 160H502M340 93V415M202 93 340 160 478 93M246 390 340 275 434 390" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'wordmark is-compact' : 'wordmark'} aria-label="Fisiospot Fisioterapia">
      <LogoMark className="wordmark-mark" size={compact ? 34 : 56} />
      <span className="wordmark-text">
        <span className="wordmark-name">fisiospot</span>
        <span className="wordmark-sub">fisioterapia</span>
      </span>
    </span>
  );
}
