import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useStorage, useTrackerStorage } from '../hooks/useStorage';
import { PROGRAMA } from '../data/programa';
import Pomodoro from '../components/Pomodoro';

const MC = ['#6366f1','#22d3ee','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899','#14b8a6','#a78bfa'];
const mc = i => MC[i % MC.length];

/* ── Radar SVG ── */
function Radar({ data, size = 220 }) {
  if (!data || data.length < 3) return (
    <div style={{ width: size, height: size, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontSize:'0.72rem', textAlign:'center', padding:'0 16px' }}>
      Registre questões em 3+ matérias para ver o radar
    </div>
  );
  const cx = size/2, cy = size/2, R = size * 0.33;
  const n = data.length;
  const ang = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt  = (i, r) => ({ x: cx + r * Math.cos(ang(i)), y: cy + r * Math.sin(ang(i)) });
  const web = [.25,.5,.75,1].map(l =>
    data.map((_,i) => pt(i, R*l)).map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  );
  const poly = data.map((d,i) => pt(i, R*(d.pct/100))).map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
  return (
    <svg width={size} height={size} style={{ overflow:'visible' }}>
      {web.map((d,i) => <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
      {data.map((_,i) => { const p=pt(i,R); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>; })}
      <path d={poly} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.5" style={{ filter:'drop-shadow(0 0 5px rgba(99,102,241,0.4))' }}/>
      {data.map((d,i) => { const p=pt(i,R*(d.pct/100)); return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1"/>; })}
      {data.map((d,i) => {
        const p = pt(i, R+22);
        const anchor = p.x < cx-4 ? 'end' : p.x > cx+4 ? 'start' : 'middle';
        const short = d.nome.length > 12 ? d.nome.slice(0,11)+'…' : d.nome;
        return (
          <g key={i}>
            <text x={p.x} y={p.y-3}  textAnchor={anchor} fill="#64748b" fontSize="9" fontFamily="Inter">{short}</text>
            <text x={p.x} y={p.y+8} textAnchor={anchor} fill={d.pct>=70?'#10b981':d.pct>=50?'#f59e0b':'#ef4444'} fontSize="9" fontFamily="Space Grotesk" fontWeight="700">{d.pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Heatmap ── */
function Heatmap({ studyLog }) {
  const { cells, streak, totalDias, totalMin } = useMemo(() => {
    const map = {};
    studyLog.filter(l=>l.modo==='foco').forEach(l => { map[l.date]=(map[l.date]||0)+l.minutos; });
    const cells = [];
    for (let i=55;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      const key=d.toISOString().slice(0,10);
      cells.push({ key, min:map[key]||0 });
    }
    let streak=0;
    for (let i=0;i<56;i++) {
      const d=new Date(); d.setDate(d.getDate()-i);
      if (map[d.toISOString().slice(0,10)]>0) streak++; else break;
    }
    return { cells, streak, totalDias: cells.filter(c=>c.min>0).length, totalMin: cells.reduce((a,b)=>a+b.min,0) };
  }, [studyLog]);

  const maxMin = Math.max(...cells.map(c=>c.min),1);
  const col = m => { if(!m) return 'rgba(255,255,255,0.04)'; const t=m/maxMin; return t<.3?'rgba(99,102,241,0.3)':t<.6?'rgba(99,102,241,0.55)':t<.85?'rgba(99,102,241,0.75)':'#6366f1'; };
  const today = new Date().toISOString().slice(0,10);
  const weeks = [];
  for (let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));
  const fmt = m => m<60?`${m}min`:`${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`;

  return (
    <div>
      <div style={{ display:'flex', gap:3 }}>
        {weeks.map((wk,wi) => (
          <div key={wi} style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {wk.map((c,di) => (
              <div key={di} title={`${c.key}: ${c.min>0?fmt(c.min):'sem estudo'}`}
                style={{ width:10, height:10, borderRadius:2, background:col(c.min), border:c.key===today?'1px solid #818cf8':'none' }}/>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
        {[['🔥','Streak',`${streak}d`],['📅','Dias ativos',totalDias],['⏱','Total',fmt(totalMin)],['📊','Média/dia',totalDias>0?fmt(Math.round(totalMin/totalDias)):'—']].map(([ic,l,v])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:'0.8rem' }}>{ic}</span>
            <div>
              <div style={{ fontSize:'0.58rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.07em' }}>{l}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.78rem', fontWeight:700, color:'#94a3b8', lineHeight:1.2 }}>{v}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Barra de aproveitamento ── */
function ABar({ nome, pct, total, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }}/>
          <span style={{ fontSize:'0.72rem', fontWeight:500, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>{nome}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:'0.6rem', color:'#334155' }}>{total}q</span>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.75rem', fontWeight:700, color:pct>=70?'#10b981':pct>=50?'#f59e0b':'#ef4444', minWidth:30, textAlign:'right' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:pct>=70?'#10b981':pct>=50?'#f59e0b':'#ef4444', borderRadius:99, boxShadow:`0 0 6px ${pct>=70?'#10b98150':pct>=50?'#f59e0b50':'#ef444450'}` }}/>
      </div>
    </div>
  );
}

function ST({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
      <div style={{ width:3, height:11, background:'#6366f1', borderRadius:99 }}/>
      <span style={{ fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'#475569' }}>{children}</span>
    </div>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', ...style }}>{children}</div>;
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [questoes]  = useStorage('questoes', []);
  const [simulados] = useStorage('simulados', []);
  const [studyLog]  = useStorage('studylog', []);
  const [metas]       = useStorage('metas', { questoesDia:30, horasDia:6, dataProva:'', nomeProva:'' });
  const [cicloState]  = useStorage('ciclo', { ativas: [], dataInicio: '', diasConcluidos: {} });
  const { checked } = useTrackerStorage();

  const totalQ    = questoes.reduce((a,b)=>a+(b.total||0),0);
  const today     = new Date().toISOString().slice(0,10);
  const totalQ_hoje = questoes.filter(q=>q.data===today).reduce((a,b)=>a+(b.total||0),0);
  const totalAc   = questoes.reduce((a,b)=>a+(b.acertos||0),0);
  const media     = totalQ>0 ? ((totalAc/totalQ)*100).toFixed(1) : null;
  const hojeMin   = studyLog.filter(l=>l.date===today&&l.modo==='foco').reduce((a,b)=>a+b.minutos,0);
  const pctMetaQ  = metas.questoesDia > 0 ? Math.min(100, Math.round((totalQ_hoje / metas.questoesDia)*100)) : 0;
  const pctMetaH  = metas.horasDia    > 0 ? Math.min(100, Math.round((hojeMin / 60 / metas.horasDia)*100)) : 0;
  const countdown = metas.dataProva ? Math.ceil((new Date(metas.dataProva+'T00:00:00') - new Date(new Date().toDateString())) / 86400000) : null;

  // Alertas de inatividade: matérias sem questões há 2+ dias
  const alertasInativos = useMemo(() => {
    const alertas = [];
    const ativas = cicloState.ativas || [];
    if (ativas.length === 0) return alertas;
    // Para cada matéria ativa, última sessão de questões
    const MATERIAS_MAP = {
      'port':'Língua Portuguesa','rl':'Raciocínio Lógico','dcon':'Direito Constitucional',
      'dadm':'Direito Administrativo','dtrib':'Direito Tributário','cont':'Contabilidade Geral e Pública',
      'aud':'Auditoria','dados':'Fluência em Dados','estat':'Estatística','comi':'Comércio Internacional',
      'laduan':'Legislação Aduaneira','ltrib':'Legislação Tributária Federal','dprev':'Direito Previdenciário',
      'ingl':'Língua Inglesa','fin':'Finanças Públicas','casp':'CASP – Contabilidade Pública',
      'admpub':'Administração Pública','admger':'Administração Geral','econ':'Economia',
    };
    ativas.forEach(id => {
      const nome = MATERIAS_MAP[id];
      if (!nome) return;
      const sessoes = questoes.filter(q => q.materia === nome);
      if (sessoes.length === 0) return; // nunca estudou — não alerta
      const ultima = sessoes.map(q => q.data || '').filter(Boolean).sort().pop();
      if (!ultima) return;
      const diasSem = Math.floor((new Date(today) - new Date(ultima)) / 86400000);
      if (diasSem >= 3) alertas.push({ nome, diasSem, ultima });
    });
    return alertas.sort((a,b) => b.diasSem - a.diasSem).slice(0, 4);
  }, [questoes, cicloState.ativas, today]);
  const totalFMin = studyLog.filter(l=>l.modo==='foco').reduce((a,b)=>a+b.minutos,0);
  const totAssun  = PROGRAMA.reduce((a,b)=>a+b.materias.reduce((c,d)=>c+d.assuntos.length,0),0);
  const totCheck  = Object.values(checked).filter(Boolean).length;
  const pctTrack  = totAssun>0 ? Math.round((totCheck/totAssun)*100) : 0;
  const mediaSim  = simulados.length>0 ? (simulados.reduce((a,b)=>a+(b.nota||0),0)/simulados.length).toFixed(1) : null;
  const fmt = m => m<60?`${m}m`:`${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}m`;
  const mc2 = !media?'#6366f1':parseFloat(media)>=70?'#10b981':parseFloat(media)>=50?'#f59e0b':'#ef4444';

  const desemp = useMemo(() => {
    const map={};
    questoes.forEach(q=>{ if(!q.materia) return; if(!map[q.materia]) map[q.materia]={total:0,acertos:0}; map[q.materia].total+=q.total||0; map[q.materia].acertos+=q.acertos||0; });
    return Object.entries(map).map(([nome,d],i)=>({ nome, pct:d.total>0?Math.round((d.acertos/d.total)*100):0, total:d.total, color:mc(i) })).sort((a,b)=>b.total-a.total);
  }, [questoes]);

  const trackerMat = useMemo(() => {
    const rows=[];
    PROGRAMA.forEach(bloco=>{ bloco.materias.forEach(mat=>{ const t=mat.assuntos.length, f=mat.assuntos.filter((_,ai)=>checked[`${bloco.id}__${mat.nome}__${ai}`]).length; if(f>0) rows.push({ nome:mat.nome, total:t, feitos:f, pct:Math.round((f/t)*100) }); }); });
    return rows.sort((a,b)=>b.pct-a.pct).slice(0,8);
  }, [checked]);

  const donutData = desemp.slice(0,7).map(m=>({ name:m.nome.length>18?m.nome.slice(0,16)+'…':m.nome, value:m.total, color:m.color }));

  const evolucao = useMemo(() => Array.from({length:14},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(13-i));
    const key=d.toISOString().slice(0,10), label=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const sess=questoes.filter(q=>q.data===key), t=sess.reduce((a,b)=>a+(b.total||0),0), ac=sess.reduce((a,b)=>a+(b.acertos||0),0);
    const h=studyLog.filter(l=>l.date===key&&l.modo==='foco').reduce((s,b)=>s+b.minutos,0)/60;
    return { label, pct:t>0?Math.round((ac/t)*100):null, horas:parseFloat(h.toFixed(1)), questoes:t };
  }), [questoes, studyLog]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#111128,#0d0d1e)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:12, padding:'14px 20px', display:'flex', alignItems:'center', gap:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(99,102,241,0.06)', filter:'blur(30px)', pointerEvents:'none' }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'0.58rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color:'#6366f1', marginBottom:4 }}>AUDITOR-FISCAL DA RECEITA FEDERAL</div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.35rem', fontWeight:700, color:'#f1f5f9', lineHeight:1.1, marginBottom:4 }}>Painel de Estudos</h1>
          <p style={{ fontSize:'0.7rem', color:'#475569' }}>Edital Nº 1/2022 · FGV · 699 vagas · AFRFB & ATRFB</p>
          {/* Metas diárias inline */}
          <div style={{ display:'flex', gap:14, marginTop:10, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:120 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:'0.58rem', color:'#334155' }}>🎯 Questões hoje</span>
                <span style={{ fontSize:'0.58rem', color:pctMetaQ>=100?'#10b981':'#6366f1', fontWeight:700 }}>{totalQ_hoje}/{metas.questoesDia}</span>
              </div>
              <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:`${pctMetaQ}%`, height:'100%', background:pctMetaQ>=100?'#10b981':'#6366f1', borderRadius:99, transition:'width 0.4s' }}/>
              </div>
            </div>
            <div style={{ flex:1, minWidth:120 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:'0.58rem', color:'#334155' }}>⏱ Horas hoje</span>
                <span style={{ fontSize:'0.58rem', color:pctMetaH>=100?'#10b981':'#22d3ee', fontWeight:700 }}>{(hojeMin/60).toFixed(1)}/{metas.horasDia}h</span>
              </div>
              <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:`${pctMetaH}%`, height:'100%', background:pctMetaH>=100?'#10b981':'#22d3ee', borderRadius:99, transition:'width 0.4s' }}/>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <div style={{ textAlign:'center', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 18px' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.6rem', fontWeight:700, color:'#818cf8', lineHeight:1 }}>{pctTrack}%</div>
            <div style={{ fontSize:'0.58rem', color:'#6366f1', fontWeight:600, marginTop:3 }}>Edital concluído</div>
          </div>
          {countdown !== null && countdown > 0 && (
            <div style={{ textAlign:'center', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'8px 16px' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.4rem', fontWeight:700, color:'#f59e0b', lineHeight:1 }}>{countdown}d</div>
              <div style={{ fontSize:'0.55rem', color:'#f59e0b', fontWeight:600, marginTop:3, opacity:0.8 }}>para a prova</div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
        {[
          { icon:'📝', value:totalQ.toLocaleString(), label:'Questões',  sub:`${totalAc} acertos`,          color:'#6366f1' },
          { icon:'🎯', value:media?`${media}%`:'—',   label:'Média Geral', sub:`${questoes.length} sessões`, color:mc2 },
          { icon:'⏱',  value:fmt(hojeMin),             label:'Hoje',      sub:`Total: ${fmt(totalFMin)}`,    color:'#22d3ee' },
          { icon:'🏆', value:mediaSim?`${mediaSim}%`:'—', label:'Simulados', sub:`${simulados.length} feitos`, color:'#f59e0b' },
          { icon:'📚', value:`${pctTrack}%`,           label:'Conteúdo',  sub:`${totCheck}/${totAssun}`,     color:'#8b5cf6' },
        ].map(({icon,value,label,sub,color})=>(
          <div key={label} style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'11px 13px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, width:38, height:38, background:`${color}10`, borderRadius:'0 0 38px 0', pointerEvents:'none' }}/>
            <div style={{ width:26, height:26, borderRadius:7, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.82rem', marginBottom:7 }}>{icon}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.2rem', fontWeight:700, color, lineHeight:1, marginBottom:2 }}>{value}</div>
            <div style={{ fontSize:'0.6rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</div>
            {sub && <div style={{ fontSize:'0.6rem', color:'#334155', marginTop:2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── ALERTAS DE INATIVIDADE ── */}
      {alertasInativos.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:'1rem' }}>⚠️</span>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.75rem', fontWeight:700, color:'#f59e0b' }}>
              Matérias sem questões há 3+ dias
            </span>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {alertasInativos.map(a => (
              <div key={a.nome} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px',
                  background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)',
                  borderRadius:20 }}>
                <span style={{ fontSize:'0.7rem', fontWeight:600, color:'#fbbf24' }}>{a.nome}</span>
                <span style={{ fontSize:'0.6rem', color:'#92400e', background:'rgba(245,158,11,0.2)',
                    padding:'1px 7px', borderRadius:20, fontWeight:700 }}>{a.diasSem}d sem questões</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LINHA 1: Aproveitamento Q + Progresso Tracker ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Card>
          <ST>Aproveitamento em Questões</ST>
          {desemp.length>0
            ? desemp.slice(0,8).map((m,i)=><ABar key={m.nome} nome={m.nome} pct={m.pct} total={m.total} color={m.color}/>)
            : <Vazio text="Registre questões para ver o aproveitamento"/>}
        </Card>
        <Card>
          <ST>Progresso no Edital por Matéria</ST>
          {trackerMat.length>0
            ? trackerMat.map((m,i)=><ABar key={m.nome} nome={m.nome} pct={m.pct} total={m.feitos} color={mc(i)}/>)
            : <Vazio text="Marque assuntos no Tracker para ver o progresso"/>}
        </Card>
      </div>

      {/* ── LINHA 2: Mapa de atividade + Pomodoro + Evolução ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 240px 1fr', gap:10, alignItems:'start' }}>
        <Card>
          <ST>Mapa de Atividade</ST>
          <Heatmap studyLog={studyLog}/>
        </Card>
        <Card style={{ minWidth:0 }}>
          <ST>Pomodoro</ST>
          <Pomodoro/>
        </Card>
        <Card>
          <ST>Evolução — 14 Dias</ST>
          {evolucao.some(d=>d.questoes>0||d.horas>0) ? (
            <ResponsiveContainer width="100%" height={148}>
              <AreaChart data={evolucao} margin={{top:4,right:8,left:-28,bottom:0}}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={.2}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="label" tick={{fill:'#334155',fontSize:9}}/>
                <YAxis yAxisId="p" domain={[0,100]} tick={{fill:'#334155',fontSize:9}} unit="%"/>
                <YAxis yAxisId="h" orientation="right" tick={{fill:'#334155',fontSize:9}} unit="h"/>
                <Tooltip contentStyle={{background:'#0f0f18',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,fontSize:11}}/>
                <Area yAxisId="p" type="monotone" dataKey="pct"   name="Acertos %" stroke="#6366f1" fill="url(#gP)" strokeWidth={1.5} dot={false} connectNulls/>
                <Area yAxisId="h" type="monotone" dataKey="horas" name="Horas"     stroke="#22d3ee" fill="url(#gH)" strokeWidth={1.5} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <Vazio text="Registre sessões e questões para ver a evolução"/>}
        </Card>
      </div>

      {/* ── LINHA 3: Distribuição + Radar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Card>
          <ST>Distribuição de Esforço</ST>
          {donutData.length>0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flexShrink:0 }}>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" outerRadius={62} innerRadius={36} dataKey="value" paddingAngle={2} strokeWidth={0}>
                      {donutData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:'#0f0f18',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,fontSize:11}} formatter={(v,n)=>[v+'q',n]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                {donutData.map((d,i)=>{
                  const p=Math.round((d.value/totalQ)*100);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                      <span style={{ fontSize:'0.68rem', color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                      <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#94a3b8', fontFamily:"'Space Grotesk',sans-serif" }}>{p}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <Vazio text="Registre questões para ver a distribuição"/>}
        </Card>

        <Card style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <ST>Radar de Desempenho</ST>
          <div style={{ fontSize:'0.58rem', color:'#334155', marginBottom:6, alignSelf:'flex-start' }}>% de acerto por matéria</div>
          <Radar data={desemp.slice(0,8)} size={210}/>
        </Card>
      </div>

    </div>
  );
}

function Vazio({ text }) {
  return <div style={{ padding:'22px 0', textAlign:'center', color:'#1e293b', fontSize:'0.72rem' }}>{text}</div>;
}
