import { useState, useMemo } from 'react';
import { PROGRAMA } from '../data/programa';
import { useTrackerStorage } from '../hooks/useStorage';

const FILTROS = [
  { key: 'todos',  label: 'Todos os Cargos' },
  { key: 'AFRFB', label: 'Auditor-Fiscal (AFRFB)' },
  { key: 'ATRFB', label: 'Analista-Tributário (ATRFB)' },
  { key: 'comuns', label: 'Disciplinas Comuns' },
];

const BLOCO_COLORS = ['#6366f1','#22d3ee','#f59e0b','#10b981','#8b5cf6'];

export default function Tracker() {
  const { checked, toggle, markAll, reset } = useTrackerStorage();
  const [filtro, setFiltro]     = useState('todos');
  const [openBlocos, setOpenBlocos]   = useState({});
  const [openMaterias, setOpenMaterias] = useState({});

  const blocosFiltrados = useMemo(() =>
    PROGRAMA.filter(b => filtro === 'todos' || b.cargo === filtro), [filtro]);

  const { total: gTotal, feitos: gFeitos } = useMemo(() => {
    let total = 0, feitos = 0;
    blocosFiltrados.forEach(b => b.materias.forEach(m => m.assuntos.forEach((_, ai) => {
      total++;
      if (checked[`${b.id}__${m.nome}__${ai}`]) feitos++;
    })));
    return { total, feitos };
  }, [blocosFiltrados, checked]);

  const pct = gTotal > 0 ? Math.round((gFeitos / gTotal) * 100) : 0;

  const calcBloco = (b) => {
    let t = 0, f = 0;
    b.materias.forEach(m => m.assuntos.forEach((_, ai) => {
      t++;
      if (checked[`${b.id}__${m.nome}__${ai}`]) f++;
    }));
    return { t, f, pct: t > 0 ? Math.round((f / t) * 100) : 0 };
  };

  const calcMat = (b, m) => {
    let t = 0, f = 0;
    m.assuntos.forEach((_, ai) => {
      t++;
      if (checked[`${b.id}__${m.nome}__${ai}`]) f++;
    });
    return { t, f, pct: t > 0 ? Math.round((f / t) * 100) : 0 };
  };

  const handleMarkAll = (b, m) => {
    const keys = m.assuntos.map((_, ai) => `${b.id}__${m.nome}__${ai}`);
    markAll(keys, !keys.every(k => checked[k]));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header card */}
      <div style={s.headerCard}>
        <div style={s.headerGlow} />
        <div style={{ flex: 1 }}>
          <div style={s.headerLabel}>CONTEÚDO PROGRAMÁTICO · EDITAL Nº 1/2022</div>
          <h2 style={s.headerTitle}>Tracker de Estudos</h2>
          <p style={s.headerSub}>Marque os assuntos conforme estuda. Filtros por cargo abaixo.</p>

          {/* Barra de progresso */}
          <div style={s.progBarWrap}>
            <div style={{ ...s.progBarFill, width: `${pct}%` }} />
          </div>

          <div style={s.progNums}>
            <Num v={gFeitos} l="Estudados" c="#6366f1" />
            <Num v={gTotal}  l="Total"     c="#94a3b8" />
            <Num v={`${pct}%`} l="Concluído" c={pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#6366f1'} />
          </div>
        </div>
        <button style={s.resetBtn} onClick={() => window.confirm('Resetar todo o progresso?') && reset()}>
          ↺ Resetar
        </button>
      </div>

      {/* Filtros */}
      <div style={s.filtros}>
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            style={{ ...s.ftab, ...(filtro === f.key ? s.ftabActive : {}) }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Blocos */}
      {blocosFiltrados.map((bloco, bi) => {
        const { t, f, pct: bp } = calcBloco(bloco);
        const open  = openBlocos[bloco.id];
        const color = BLOCO_COLORS[bi % BLOCO_COLORS.length];

        return (
          <div key={bloco.id} style={{ ...s.bloco, borderLeft: `3px solid ${color}` }}>

            {/* Bloco header */}
            <div style={s.blocoHeader}
              onClick={() => setOpenBlocos(p => ({ ...p, [bloco.id]: !p[bloco.id] }))}>
              <div style={{ ...s.blocoIcon, color }}>{bloco.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.blocoNome}>{bloco.nome}</div>
                <div style={s.blocoTag}>{bloco.tag}</div>
              </div>
              <div style={s.blocoRight}>
                {/* mini bar */}
                <div style={s.miniBar}>
                  <div style={{ ...s.miniBarFill, width: `${bp}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
                </div>
                <span style={{ ...s.blocoPct, color }}>{bp}%</span>
                <span style={{ ...s.blocoCount }}>{f}/{t}</span>
                <span style={{ color: '#334155', fontSize: '0.75rem', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s', marginLeft: 4 }}>▶</span>
              </div>
            </div>

            {/* Matérias */}
            {open && (
              <div style={s.blocoBody}>
                {bloco.materias.map(mat => {
                  const mk = `${bloco.id}__${mat.nome}`;
                  const mOpen = openMaterias[mk];
                  const { t: mt, f: mf, pct: mp } = calcMat(bloco, mat);
                  const allDone = mf === mt;

                  return (
                    <div key={mat.nome} style={s.matWrap}>
                      <div style={s.matHeader}
                        onClick={() => setOpenMaterias(p => ({ ...p, [mk]: !p[mk] }))}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={s.matNome}>{mat.nome}</span>
                          <span style={s.matBadge}>{mf}/{mt}</span>
                          <button style={{ ...s.markAllBtn, color: allDone ? '#10b981' : '#475569', borderColor: allDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)' }}
                            onClick={e => { e.stopPropagation(); handleMarkAll(bloco, mat); }}>
                            {allDone ? '✓ Feito' : '✓ Tudo'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={s.matBar}>
                            <div style={{ ...s.matBarFill, width: `${mp}%`, background: mp >= 80 ? '#10b981' : mp >= 50 ? '#f59e0b' : color }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", color: mp >= 80 ? '#10b981' : mp >= 50 ? '#f59e0b' : '#94a3b8', minWidth: 34, textAlign: 'right' }}>{mp}%</span>
                          <span style={{ color: '#334155', fontSize: '0.68rem', transform: mOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.18s' }}>▶</span>
                        </div>
                      </div>

                      {/* Assuntos */}
                      {mOpen && (
                        <div style={s.assuntosList}>
                          {mat.assuntos.map((a, ai) => {
                            const key  = `${bloco.id}__${mat.nome}__${ai}`;
                            const done = !!checked[key];
                            return (
                              <div key={ai} style={{ ...s.assunto, ...(done ? s.assuntoDone : {}) }}
                                onClick={() => toggle(key)}>
                                <div style={{ ...s.checkbox, ...(done ? s.checkboxDone : {}) }}>
                                  {done && <CheckIcon />}
                                </div>
                                <span style={{ ...s.assuntoText, ...(done ? s.assuntoTextDone : {}) }}>{a}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Num({ v, l, c }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>{l}</div>
    </div>
  );
}

function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

const s = {
  headerCard: {
    background: 'linear-gradient(135deg,#111128 0%,#0d0d1e 100%)',
    border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16,
    padding: '24px 28px', display: 'flex', alignItems: 'flex-start',
    gap: 24, position: 'relative', overflow: 'hidden',
  },
  headerGlow: { position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.07)', filter: 'blur(40px)', pointerEvents: 'none' },
  headerLabel: { fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 6 },
  headerTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  headerSub: { fontSize: '0.78rem', color: '#475569', marginBottom: 16 },
  progBarWrap: { height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 },
  progBarFill: { height: '100%', background: 'linear-gradient(90deg,#4f46e5,#6366f1,#818cf8)', borderRadius: 99, transition: 'width 0.6s ease', boxShadow: '0 0 10px rgba(99,102,241,0.5)' },
  progNums: { display: 'flex', gap: 28, flexWrap: 'wrap' },
  resetBtn: {
    flexShrink: 0, padding: '8px 16px', background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
    color: '#ef4444', fontSize: '0.75rem', fontWeight: 700,
    letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  filtros: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  ftab: {
    padding: '6px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'transparent', color: '#475569',
    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.18s', letterSpacing: '0.04em',
  },
  ftabActive: { background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' },
  bloco: {
    background: '#111120',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  blocoHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 18px', cursor: 'pointer', userSelect: 'none',
    transition: 'background 0.15s',
  },
  blocoIcon: { fontSize: '1.2rem', flexShrink: 0, lineHeight: 1 },
  blocoNome: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2 },
  blocoTag: { fontSize: '0.62rem', color: '#475569', marginTop: 3, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' },
  blocoRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  miniBar: { width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s' },
  blocoPct: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '0.82rem', fontWeight: 700, minWidth: 34, textAlign: 'right' },
  blocoCount: { fontSize: '0.65rem', color: '#334155', minWidth: 36, textAlign: 'right' },
  blocoBody: { padding: '4px 18px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' },
  matWrap: { marginTop: 8 },
  matHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 12px', background: 'rgba(255,255,255,0.02)',
    borderRadius: 8, cursor: 'pointer', userSelect: 'none',
    border: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s',
  },
  matNome: { fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' },
  matBadge: { fontSize: '0.62rem', color: '#334155', background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '2px 7px', fontWeight: 600 },
  markAllBtn: { fontSize: '0.62rem', fontWeight: 700, padding: '3px 9px', background: 'rgba(255,255,255,0.03)', border: '1px solid', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s' },
  matBar: { width: 56, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' },
  matBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.3s' },
  assuntosList: { paddingTop: 6, paddingLeft: 8 },
  assunto: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
    border: '1px solid transparent', marginBottom: 2,
    transition: 'background 0.12s',
  },
  assuntoDone: { background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.1)' },
  checkbox: {
    width: 16, height: 16, borderRadius: 5,
    border: '1.5px solid rgba(255,255,255,0.12)',
    flexShrink: 0, marginTop: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  checkboxDone: { background: '#10b981', borderColor: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.4)' },
  assuntoText: { fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, flex: 1 },
  assuntoTextDone: { color: '#334155', textDecoration: 'line-through', textDecorationColor: '#1e3a2e' },
};
