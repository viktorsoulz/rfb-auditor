import { useState, useMemo } from 'react';
import { useStorage } from '../hooks/useStorage';

const PLATAFORMAS = ['QConcursos','Direção Concursos','Gran Cursos','Estratégia Concursos','TEC Concursos','Alfacon','Cers','Próprio','Outra'];
const CARGOS = ['AFRFB','ATRFB','Ambos'];
const empty = { plataforma:'', cargo:'AFRFB', total:'140', acertos:'', data: new Date().toISOString().slice(0,10), obs:'' };

export default function Simulados() {
  const [simulados, setSimulados] = useStorage('simulados', []);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.total||!form.acertos) { setError('Preencha total e acertos.'); return; }
    const t=parseInt(form.total), a=parseInt(form.acertos);
    if (isNaN(t)||isNaN(a)||a>t||t<=0) { setError('Valores inválidos.'); return; }
    setSimulados(p => [{ id:Date.now(), ...form, total:t, acertos:a, nota:parseFloat(((a/t)*100).toFixed(1)) }, ...p]);
    setForm(empty); setError('');
  };

  const stats = useMemo(() => {
    if (!simulados.length) return null;
    const notas = simulados.map(s=>s.nota);
    return { media:(notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(1), melhor:Math.max(...notas).toFixed(1), pior:Math.min(...notas).toFixed(1) };
  }, [simulados]);

  const nota = form.total&&form.acertos ? ((parseInt(form.acertos||0)/parseInt(form.total||1))*100).toFixed(1) : null;

  return (
    <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>

      {/* Form */}
      <div style={s.formCard}>
        <div style={s.formTitle}>Registrar Simulado</div>
        <Field label="Plataforma">
          <select style={s.select} value={form.plataforma} onChange={e=>f('plataforma')(e.target.value)}>
            <option value="">—</option>{PLATAFORMAS.map(p=><option key={p}>{p}</option>)}
          </select>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="Cargo">
            <select style={s.select} value={form.cargo} onChange={e=>f('cargo')(e.target.value)}>
              {CARGOS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Data"><input style={s.input} type="date" value={form.data} onChange={e=>f('data')(e.target.value)}/></Field>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="Total"><input style={s.input} type="number" value={form.total} onChange={e=>f('total')(e.target.value)}/></Field>
          <Field label="Acertos"><input style={s.input} type="number" value={form.acertos} onChange={e=>f('acertos')(e.target.value)}/></Field>
        </div>
        <Field label="Observações"><input style={s.input} value={form.obs} onChange={e=>f('obs')(e.target.value)} placeholder="Opcional…"/></Field>
        {error && <div style={s.errorMsg}>{error}</div>}
        {nota && (
          <div style={{ textAlign:'center', padding:'12px 0 6px' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2.4rem', fontWeight:700, color:nota>=70?'#10b981':nota>=50?'#f59e0b':'#ef4444', lineHeight:1 }}>{nota}%</div>
            <div style={{ fontSize:'0.65rem', color:'#475569', marginTop:4 }}>Resultado Preview</div>
          </div>
        )}
        <button style={s.submitBtn} onClick={submit}>+ Registrar Simulado</button>
      </div>

      {/* Direita */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { v:simulados.length, l:'Simulados', c:'#6366f1' },
            { v:stats?`${stats.media}%`:'—', l:'Média', c:stats&&parseFloat(stats.media)>=70?'#10b981':stats&&parseFloat(stats.media)>=50?'#f59e0b':'#ef4444' },
            { v:stats?`${stats.melhor}%`:'—', l:'Melhor', c:'#10b981' },
            { v:stats?`${stats.pior}%`:'—', l:'Pior', c:'#ef4444' },
          ].map(({v,l,c}) => (
            <div key={l} style={s.statBox}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.5rem', fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:'0.62rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>

        {simulados.length===0 ? (
          <div style={{ ...s.formCard, textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🎯</div>
            <div style={{ color:'#334155', fontSize:'0.82rem' }}>Nenhum simulado registrado ainda.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
            {simulados.map(sim => <SimCard key={sim.id} sim={sim} onDelete={id=>setSimulados(p=>p.filter(x=>x.id!==id))}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function SimCard({ sim, onDelete }) {
  const color = sim.nota>=70?'#10b981':sim.nota>=50?'#f59e0b':'#ef4444';
  return (
    <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'18px', borderTop:`3px solid ${color}`, position:'relative' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.88rem', fontWeight:700, color:'#e2e8f0' }}>{sim.plataforma||'Simulado'}</div>
          <div style={{ fontSize:'0.62rem', color:'#6366f1', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{sim.cargo}</div>
        </div>
        <button style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:'0.8rem' }} onClick={()=>onDelete(sim.id)}>✕</button>
      </div>
      <div style={{ textAlign:'center', marginBottom:12 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2.6rem', fontWeight:700, color, lineHeight:1 }}>{sim.nota}%</div>
        <div style={{ fontSize:'0.68rem', color:'#475569', marginTop:4 }}>{sim.acertos}/{sim.total} acertos</div>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', marginBottom:12 }}>
        <div style={{ width:`${sim.nota}%`, height:'100%', background:color, borderRadius:99, boxShadow:`0 0 6px ${color}60` }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'0.68rem', color:'#334155' }}>{sim.data}</span>
        <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'3px 10px', borderRadius:20, background:`${color}12`, border:`1px solid ${color}30`, color }}>{sim.nota>=50?'✓ Aprovado':'✗ Abaixo'}</span>
      </div>
      {sim.obs && <div style={{ fontSize:'0.7rem', color:'#334155', marginTop:8, fontStyle:'italic' }}>{sim.obs}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{label}</div>
      {children}
    </div>
  );
}

const s = {
  formCard: { flex:'0 0 290px', background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'20px 22px' },
  formTitle: { fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', fontWeight:700, color:'#e2e8f0', marginBottom:16 },
  input: { width:'100%', padding:'8px 10px', fontSize:'0.83rem', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0' },
  select: { width:'100%', padding:'8px 10px', fontSize:'0.83rem', borderRadius:8, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', cursor:'pointer' },
  submitBtn: { width:'100%', padding:'10px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:9, color:'#818cf8', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.82rem', fontWeight:700, cursor:'pointer' },
  errorMsg: { color:'#ef4444', fontSize:'0.72rem', padding:'6px 10px', background:'rgba(239,68,68,0.08)', borderRadius:7, marginBottom:8 },
  statBox: { background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'14px 12px', textAlign:'center' },
};
