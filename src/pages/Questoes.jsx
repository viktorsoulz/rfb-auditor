import { useState, useMemo } from 'react';
import { useStorage } from '../hooks/useStorage';
import { PROGRAMA } from '../data/programa';

/* Mapa matéria → assuntos extraídos do programa */
const MAT_ASSUNTOS = {};
PROGRAMA.forEach(bloco => {
  bloco.materias.forEach(mat => {
    if (!MAT_ASSUNTOS[mat.nome]) MAT_ASSUNTOS[mat.nome] = [];
    mat.assuntos.forEach(a => {
      if (!MAT_ASSUNTOS[mat.nome].includes(a)) MAT_ASSUNTOS[mat.nome].push(a);
    });
  });
});

const MATERIAS = Object.keys(MAT_ASSUNTOS).sort();
const BANCAS   = ['FGV','CESPE/CEBRASPE','FCC','VUNESP','IADES','Outra'];
const empty = { materia:'', assunto:'', total:'', acertos:'', banca:'', data: new Date().toISOString().slice(0,10), obs:'' };

export default function Questoes() {
  const [questoes, setQuestoes] = useStorage('questoes', []);
  const [form, setForm]         = useState(empty);
  const [filterMat, setFilterMat]     = useState('');
  const [filterBanca, setFilterBanca] = useState('');
  const [error, setError]       = useState('');
  const [tooltip, setTooltip]   = useState(null); // { id, x, y }

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  /* Assuntos disponíveis para a matéria selecionada */
  const assuntosDisponiveis = form.materia ? (MAT_ASSUNTOS[form.materia] || []) : [];

  const submit = () => {
    if (!form.materia || !form.total || !form.acertos) { setError('Preencha matéria, total e acertos.'); return; }
    const t = parseInt(form.total), a = parseInt(form.acertos);
    if (isNaN(t)||isNaN(a)||a>t||t<=0) { setError('Valores inválidos.'); return; }
    setQuestoes(p => [{ id:Date.now(), ...form, total:t, acertos:a, nota:parseFloat(((a/t)*100).toFixed(1)) }, ...p]);
    setForm(empty); setError('');
  };

  const filtered = useMemo(() => questoes.filter(q =>
    (!filterMat   || q.materia===filterMat) &&
    (!filterBanca || q.banca===filterBanca)
  ), [questoes, filterMat, filterBanca]);

  const stats = useMemo(() => {
    const t  = questoes.reduce((a,b)=>a+b.total,0);
    const ac = questoes.reduce((a,b)=>a+b.acertos,0);
    return { total:t, acertos:ac, erros:t-ac, media:t>0?((ac/t)*100).toFixed(1):'—', sessoes:questoes.length };
  }, [questoes]);

  const nota       = form.total&&form.acertos ? ((parseInt(form.acertos||0)/parseInt(form.total||1))*100).toFixed(1) : null;
  const notaColor  = nota>=70?'#10b981':nota>=50?'#f59e0b':'#ef4444';

  return (
    <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>

      {/* ── FORM ── */}
      <div style={s.formCard}>
        <div style={s.formTitle}>Registrar Sessão</div>

        <Field label="Matéria *">
          <select style={s.select} value={form.materia}
            onChange={e => { f('materia')(e.target.value); f('assunto')(''); }}>
            <option value="">Selecione…</option>
            {MATERIAS.map(m=><option key={m}>{m}</option>)}
          </select>
        </Field>

        {/* Assunto — só mostra se houver matéria selecionada */}
        {form.materia && (
          <Field label="Assunto (opcional)">
            <select style={s.select} value={form.assunto} onChange={e=>f('assunto')(e.target.value)}>
              <option value="">— Geral —</option>
              {assuntosDisponiveis.map(a=>(
                <option key={a} value={a}>{a.length>60 ? a.slice(0,58)+'…' : a}</option>
              ))}
            </select>
          </Field>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="Total *">
            <input style={s.input} type="number" min="1" value={form.total}
              onChange={e=>f('total')(e.target.value)} placeholder="30"/>
          </Field>
          <Field label="Acertos *">
            <input style={s.input} type="number" min="0" value={form.acertos}
              onChange={e=>f('acertos')(e.target.value)} placeholder="21"/>
          </Field>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="Banca">
            <select style={s.select} value={form.banca} onChange={e=>f('banca')(e.target.value)}>
              <option value="">—</option>
              {BANCAS.map(b=><option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Data">
            <input style={s.input} type="date" value={form.data} onChange={e=>f('data')(e.target.value)}/>
          </Field>
        </div>

        <Field label="Observações">
          <input style={s.input} value={form.obs} onChange={e=>f('obs')(e.target.value)} placeholder="Opcional…"/>
        </Field>

        {error && <div style={s.errorMsg}>{error}</div>}

        {nota && (
          <div style={{ textAlign:'center', padding:'10px 0 6px' }}>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2rem', fontWeight:700, color:notaColor }}>{nota}%</span>
            <div style={{ fontSize:'0.65rem', color:'#475569', marginTop:2 }}>Preview do resultado</div>
          </div>
        )}

        <button style={s.submitBtn} onClick={submit}>+ Registrar Sessão</button>
      </div>

      {/* ── DIREITA ── */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Stats */}
        <div style={s.statsGrid}>
          {[
            { v:stats.total.toLocaleString(), l:'Questões',  c:'#6366f1' },
            { v:stats.acertos.toLocaleString(), l:'Acertos', c:'#10b981' },
            { v:stats.erros.toLocaleString(), l:'Erros',     c:'#ef4444' },
            { v:`${stats.media}%`, l:'Média',
              c: parseFloat(stats.media)>=70?'#10b981':parseFloat(stats.media)>=50?'#f59e0b':'#ef4444' },
            { v:stats.sessoes, l:'Sessões', c:'#94a3b8' },
          ].map(({v,l,c}) => (
            <div key={l} style={s.statBox}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.4rem', fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:'0.62rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end',
            background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px' }}>
          <Field label="Matéria" style={{ flex:1, minWidth:160, marginBottom:0 }}>
            <select style={s.select} value={filterMat} onChange={e=>setFilterMat(e.target.value)}>
              <option value="">Todas</option>
              {MATERIAS.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Banca" style={{ marginBottom:0 }}>
            <select style={s.select} value={filterBanca} onChange={e=>setFilterBanca(e.target.value)}>
              <option value="">Todas</option>
              {BANCAS.map(b=><option key={b}>{b}</option>)}
            </select>
          </Field>
          {(filterMat||filterBanca) && (
            <button style={{ padding:'8px 12px', background:'rgba(239,68,68,0.08)',
                border:'1px solid rgba(239,68,68,0.2)', borderRadius:7, color:'#ef4444',
                fontSize:'0.72rem', cursor:'pointer', alignSelf:'flex-end', marginBottom:0 }}
              onClick={()=>{setFilterMat('');setFilterBanca('');}}>✕ Limpar</button>
          )}
        </div>

        {/* Tabela */}
        <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Data','Matéria / Assunto','Banca','Total','Acertos','Erros','Nota','Obs',''].map(h=>(
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding:32, textAlign:'center', color:'#334155', fontSize:'0.78rem' }}>
                      Nenhuma sessão registrada ainda
                    </td>
                  </tr>
                ) : filtered.map(q => (
                  <tr key={q.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={s.td}>{q.data}</td>
                    <td style={{ ...s.td, maxWidth:180 }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.materia}</div>
                      {q.assunto && (
                        <div style={{ fontSize:'0.62rem', color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170, marginTop:2 }}>
                          ↳ {q.assunto}
                        </div>
                      )}
                    </td>
                    <td style={s.td}>{q.banca||'—'}</td>
                    <td style={{ ...s.td, textAlign:'center' }}>{q.total}</td>
                    <td style={{ ...s.td, textAlign:'center', color:'#10b981', fontWeight:600 }}>{q.acertos}</td>
                    <td style={{ ...s.td, textAlign:'center', color:'#ef4444', fontWeight:600 }}>{q.total-q.acertos}</td>
                    <td style={{ ...s.td, textAlign:'center' }}>
                      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.75rem', fontWeight:700,
                          padding:'3px 10px', borderRadius:20,
                          background:q.nota>=70?'rgba(16,185,129,0.1)':q.nota>=50?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)',
                          color:q.nota>=70?'#10b981':q.nota>=50?'#f59e0b':'#ef4444',
                          border:`1px solid ${q.nota>=70?'rgba(16,185,129,0.25)':q.nota>=50?'rgba(245,158,11,0.25)':'rgba(239,68,68,0.25)'}`
                        }}>{q.nota}%</span>
                    </td>
                    {/* Coluna Obs com tooltip */}
                    <td style={{ ...s.td, textAlign:'center', position:'relative' }}>
                      {q.obs ? (
                        <div style={{ position:'relative', display:'inline-block' }}>
                          <span
                            title={q.obs}
                            onMouseEnter={e => setTooltip({ id:q.id, text:q.obs, x:e.clientX, y:e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ cursor:'help', fontSize:'0.8rem', color:'#6366f1',
                              background:'rgba(99,102,241,0.12)', borderRadius:'50%',
                              width:20, height:20, display:'inline-flex',
                              alignItems:'center', justifyContent:'center',
                              border:'1px solid rgba(99,102,241,0.25)', userSelect:'none' }}>
                            💬
                          </span>
                        </div>
                      ) : <span style={{ color:'#1e293b' }}>—</span>}
                    </td>
                    <td style={s.td}>
                      <button style={{ background:'none', border:'none', color:'#334155', cursor:'pointer',
                          fontSize:'0.8rem', padding:'2px 6px' }}
                        onClick={()=>setQuestoes(p=>p.filter(x=>x.id!==q.id))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tooltip global */}
      {tooltip && (
        <div style={{
          position:'fixed', top: Math.min(tooltip.y - 10, window.innerHeight - 100),
          left: Math.min(tooltip.x + 12, window.innerWidth - 300),
          background:'#1e293b', border:'1px solid rgba(99,102,241,0.3)',
          borderRadius:8, padding:'8px 12px', maxWidth:280,
          fontSize:'0.75rem', color:'#cbd5e1', lineHeight:1.5,
          zIndex:9999, pointerEvents:'none',
          boxShadow:'0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontSize:'0.6rem', color:'#6366f1', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Observação</div>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, style={} }) {
  return (
    <div style={{ marginBottom:10, ...style }}>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#334155',
          textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{label}</div>
      {children}
    </div>
  );
}

const s = {
  formCard:  { flex:'0 0 300px', background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'20px 22px' },
  formTitle: { fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', fontWeight:700, color:'#e2e8f0', marginBottom:16 },
  input:     { width:'100%', padding:'8px 10px', fontSize:'0.83rem', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', boxSizing:'border-box' },
  select:    { width:'100%', padding:'8px 10px', fontSize:'0.83rem', borderRadius:8, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', cursor:'pointer', boxSizing:'border-box' },
  submitBtn: { width:'100%', padding:'10px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:9, color:'#818cf8', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.82rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.04em' },
  errorMsg:  { color:'#ef4444', fontSize:'0.72rem', padding:'6px 10px', background:'rgba(239,68,68,0.08)', borderRadius:7, marginBottom:8 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 },
  statBox:   { background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'14px 12px', textAlign:'center' },
  th:        { padding:'10px 14px', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#334155', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', whiteSpace:'nowrap' },
  td:        { padding:'10px 14px', fontSize:'0.82rem', color:'#94a3b8' },
};
