import { useMemo, useState } from 'react';
import { useStorage } from '../hooks/useStorage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart as RC, PolarGrid, PolarAngleAxis, Radar as RR } from 'recharts';

/* ══════════════════════════════════════════════════════════════
   ANÁLISE DE DESEMPENHO
   - Análise de Erros por assunto/matéria
   - Meta diária de tempo/questões
   - Countdown da prova
═══════════════════════════════════════════════════════════════ */

const TAB_LIST = [
  { id:'erros',    label:'🎯 Análise de Erros' },
  { id:'metas',    label:'📊 Metas Diárias' },
  { id:'semanal',  label:'🗓 Metas Semanais' },
  { id:'evolucao', label:'📈 Evolução por Matéria' },
  { id:'prova',    label:'📅 Countdown da Prova' },
];

export default function Analise() {
  const [tab, setTab] = useState('erros');
  const [questoes]  = useStorage('questoes',  []);
  const [studyLog]  = useStorage('studylog',  []);
  const [metas, setMetas] = useStorage('metas', {
    questoesDia: 30,
    horasDia: 6,
    dataProva: '',
    nomeProva: 'RFB — Edital Nº 1/2022',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Hero */}
      <div style={s.hero}>
        <div style={{ flex:1 }}>
          <div style={s.heroLabel}>INTELIGÊNCIA DE ESTUDO</div>
          <h1 style={s.heroTitle}>Análise de Desempenho</h1>
          <p style={s.heroSub}>Erros por assunto · Metas diárias & semanais · Evolução por matéria · Countdown da prova</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TAB_LIST.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...s.tab, ...(tab===t.id ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'erros'    && <TabErros    questoes={questoes} />}
      {tab === 'metas'    && <TabMetas    questoes={questoes} studyLog={studyLog} metas={metas} setMetas={setMetas} />}
      {tab === 'semanal'  && <TabSemanal  questoes={questoes} studyLog={studyLog} metas={metas} setMetas={setMetas} />}
      {tab === 'evolucao' && <TabEvolucao questoes={questoes} studyLog={studyLog} />}
      {tab === 'prova'    && <TabProva    metas={metas} setMetas={setMetas} questoes={questoes} studyLog={studyLog} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: ANÁLISE DE ERROS
═══════════════════════════════════════════════════════════════ */
function TabErros({ questoes }) {
  const [verAssuntos, setVerAssuntos] = useState(false);
  const [ordenar, setOrdenar] = useState('erros'); // 'erros' | 'pct' | 'total'

  /* Agrupamento por matéria */
  const porMateria = useMemo(() => {
    const map = {};
    questoes.forEach(q => {
      if (!q.materia) return;
      if (!map[q.materia]) map[q.materia] = { nome:q.materia, total:0, acertos:0, erros:0, sessoes:0, assuntos:{} };
      const m = map[q.materia];
      m.total   += q.total   || 0;
      m.acertos += q.acertos || 0;
      m.erros   += (q.total||0) - (q.acertos||0);
      m.sessoes += 1;
      // por assunto
      const assunto = q.assunto || '— Geral —';
      if (!m.assuntos[assunto]) m.assuntos[assunto] = { total:0, acertos:0 };
      m.assuntos[assunto].total   += q.total   || 0;
      m.assuntos[assunto].acertos += q.acertos || 0;
    });
    return Object.values(map).map(m => ({
      ...m,
      pct: m.total > 0 ? Math.round((m.acertos/m.total)*100) : 0,
      assuntosArr: Object.entries(m.assuntos)
        .map(([nome, d]) => ({ nome, ...d, pct: d.total>0?Math.round((d.acertos/d.total)*100):0, erros: d.total-d.acertos }))
        .sort((a,b) => b.erros - a.erros),
    }));
  }, [questoes]);

  const sorted = useMemo(() => [...porMateria].sort((a,b) => {
    if (ordenar === 'erros') return b.erros - a.erros;
    if (ordenar === 'pct')   return a.pct   - b.pct;
    return b.total - a.total;
  }), [porMateria, ordenar]);

  /* Top assuntos com mais erros (globais) */
  const topAssuntos = useMemo(() => {
    const all = [];
    porMateria.forEach(m => m.assuntosArr.forEach(a => {
      if (a.nome !== '— Geral —' && a.erros > 0) all.push({ ...a, materia: m.nome });
    }));
    return all.sort((a,b) => b.erros - a.erros).slice(0, 10);
  }, [porMateria]);

  const totalErros  = porMateria.reduce((a,b) => a+b.erros,  0);
  const totalQ      = porMateria.reduce((a,b) => a+b.total,  0);
  const mediaGeral  = totalQ > 0 ? Math.round((porMateria.reduce((a,b)=>a+b.acertos,0)/totalQ)*100) : 0;

  if (questoes.length === 0) return <Empty text="Registre questões na página Questões para ver a análise de erros." />;

  /* Dados para o gráfico de barras */
  const chartData = sorted.slice(0,8).map(m => ({
    nome: m.nome.length > 14 ? m.nome.slice(0,13)+'…' : m.nome,
    Erros: m.erros,
    Acertos: m.acertos,
    pct: m.pct,
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { v:totalQ.toLocaleString(),   l:'Questões',        c:'#6366f1' },
          { v:totalErros.toLocaleString(), l:'Total de Erros', c:'#ef4444' },
          { v:`${mediaGeral}%`,          l:'Aproveitamento',  c:mediaGeral>=70?'#10b981':mediaGeral>=50?'#f59e0b':'#ef4444' },
          { v:porMateria.length,         l:'Matérias',        c:'#94a3b8' },
        ].map(({v,l,c}) => (
          <div key={l} style={s.kpi}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.5rem', fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontSize:'0.62rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Gráfico barras */}
      <Card title="📊 Erros vs Acertos por Matéria (top 8)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{top:4,right:8,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="nome" tick={{fill:'#334155',fontSize:9}} interval={0} angle={-20} textAnchor="end" height={40}/>
            <YAxis tick={{fill:'#334155',fontSize:9}}/>
            <Tooltip contentStyle={{background:'#0f0f18',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,fontSize:11}}/>
            <Bar dataKey="Erros"   fill="#ef4444" radius={[3,3,0,0]} opacity={0.85}/>
            <Bar dataKey="Acertos" fill="#10b981" radius={[3,3,0,0]} opacity={0.75}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Controles tabela */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.65rem', color:'#334155' }}>Ordenar por:</span>
        {[['erros','Mais erros'],['pct','Menor %'],['total','Mais questões']].map(([k,l]) => (
          <button key={k} onClick={() => setOrdenar(k)}
            style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${ordenar===k?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)'}`,
              background:ordenar===k?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',
              color:ordenar===k?'#818cf8':'#475569', fontSize:'0.7rem', fontWeight:600, cursor:'pointer' }}>
            {l}
          </button>
        ))}
        <button onClick={() => setVerAssuntos(v=>!v)}
          style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:7,
            border:`1px solid ${verAssuntos?'rgba(34,211,238,0.4)':'rgba(255,255,255,0.08)'}`,
            background:verAssuntos?'rgba(34,211,238,0.08)':'rgba(255,255,255,0.03)',
            color:verAssuntos?'#22d3ee':'#475569', fontSize:'0.7rem', fontWeight:600, cursor:'pointer' }}>
          {verAssuntos ? '🔼 Ocultar assuntos' : '🔽 Ver assuntos'}
        </button>
      </div>

      {/* Tabela por matéria */}
      <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Matéria','Questões','Acertos','Erros','%','Barra'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(m => (
              <>
                <tr key={m.nome} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ ...s.td, fontWeight:600, color:'#e2e8f0', maxWidth:180 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.nome}</div>
                    <div style={{ fontSize:'0.6rem', color:'#334155', marginTop:2 }}>{m.sessoes} sessão{m.sessoes!==1?'s':''}</div>
                  </td>
                  <td style={{ ...s.td, textAlign:'center' }}>{m.total}</td>
                  <td style={{ ...s.td, textAlign:'center', color:'#10b981', fontWeight:600 }}>{m.acertos}</td>
                  <td style={{ ...s.td, textAlign:'center', color:'#ef4444', fontWeight:600 }}>{m.erros}</td>
                  <td style={{ ...s.td, textAlign:'center' }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.78rem', fontWeight:700,
                        color:m.pct>=70?'#10b981':m.pct>=50?'#f59e0b':'#ef4444' }}>{m.pct}%</span>
                  </td>
                  <td style={{ ...s.td, minWidth:100 }}>
                    <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ width:`${m.pct}%`, height:'100%', borderRadius:99,
                          background:m.pct>=70?'#10b981':m.pct>=50?'#f59e0b':'#ef4444',
                          boxShadow:`0 0 5px ${m.pct>=70?'#10b98150':m.pct>=50?'#f59e0b50':'#ef444450'}` }}/>
                    </div>
                  </td>
                </tr>
                {/* Sub-linhas de assuntos */}
                {verAssuntos && m.assuntosArr.map(a => (
                  <tr key={`${m.nome}__${a.nome}`} style={{ borderBottom:'1px solid rgba(255,255,255,0.02)', background:'rgba(255,255,255,0.01)' }}>
                    <td style={{ ...s.td, paddingLeft:24, fontSize:'0.7rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', background:'#334155', flexShrink:0 }}/>
                        <span style={{ color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }} title={a.nome}>{a.nome}</span>
                      </div>
                    </td>
                    <td style={{ ...s.td, textAlign:'center', fontSize:'0.72rem', color:'#475569' }}>{a.total}</td>
                    <td style={{ ...s.td, textAlign:'center', fontSize:'0.72rem', color:'#10b981' }}>{a.acertos}</td>
                    <td style={{ ...s.td, textAlign:'center', fontSize:'0.72rem', color: a.erros>0?'#ef4444':'#334155' }}>{a.erros}</td>
                    <td style={{ ...s.td, textAlign:'center' }}>
                      <span style={{ fontSize:'0.7rem', fontWeight:600, color:a.pct>=70?'#10b981':a.pct>=50?'#f59e0b':'#ef4444' }}>{a.pct}%</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ height:3, background:'rgba(255,255,255,0.04)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${a.pct}%`, height:'100%', borderRadius:99, background:a.pct>=70?'#10b981':a.pct>=50?'#f59e0b':'#ef4444' }}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top 10 assuntos com mais erros */}
      {topAssuntos.length > 0 && (
        <Card title="🔴 Top 10 Assuntos com Mais Erros">
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {topAssuntos.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:22, height:22, borderRadius:6, background:'rgba(239,68,68,0.15)',
                    border:'1px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center',
                    justifyContent:'center', flexShrink:0, fontFamily:"'Space Grotesk',sans-serif",
                    fontSize:'0.68rem', fontWeight:700, color:'#ef4444' }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.75rem', color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nome}</div>
                  <div style={{ fontSize:'0.6rem', color:'#475569', marginTop:1 }}>{a.materia}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'#ef4444' }}>{a.erros} erros</div>
                  <div style={{ fontSize:'0.6rem', color:a.pct>=70?'#10b981':a.pct>=50?'#f59e0b':'#ef4444' }}>{a.pct}% acerto</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: METAS & PROGRESSO
═══════════════════════════════════════════════════════════════ */
function TabMetas({ questoes, studyLog, metas, setMetas }) {
  const hoje = new Date().toISOString().slice(0,10);

  const hojeQ   = questoes.filter(q => q.data === hoje).reduce((a,b) => a+(b.total||0), 0);
  const hojeMin = studyLog.filter(l => l.date===hoje && l.modo==='foco').reduce((a,b) => a+b.minutos, 0);
  const hojeH   = hojeMin / 60;

  const pctQ = metas.questoesDia > 0 ? Math.min(100, Math.round((hojeQ / metas.questoesDia)*100)) : 0;
  const pctH = metas.horasDia    > 0 ? Math.min(100, Math.round((hojeH  / metas.horasDia)  *100)) : 0;

  /* Histórico 14 dias */
  const hist14 = useMemo(() => Array.from({length:14},(_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(13-i));
    const key = d.toISOString().slice(0,10);
    const label = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const q   = questoes.filter(x=>x.data===key).reduce((a,b)=>a+(b.total||0),0);
    const min = studyLog.filter(l=>l.date===key&&l.modo==='foco').reduce((a,b)=>a+b.minutos,0);
    return { label, questoes:q, horas:parseFloat((min/60).toFixed(1)), metaQ:metas.questoesDia, metaH:metas.horasDia };
  }), [questoes, studyLog, metas.questoesDia, metas.horasDia]);

  /* Semana atual */
  const semanaQ   = hist14.slice(-7).reduce((a,b)=>a+b.questoes,0);
  const semanaH   = hist14.slice(-7).reduce((a,b)=>a+b.horas,0).toFixed(1);
  const diasMeta  = hist14.slice(-7).filter(d=>d.questoes>=metas.questoesDia && d.horas>=metas.horasDia).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Configuração */}
      <Card title="⚙ Configurar Metas Diárias">
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:140 }}>
            <div style={s.fieldLabel}>🎯 Meta de Questões/dia</div>
            <input type="number" min="1" max="300" value={metas.questoesDia}
              onChange={e => setMetas(p=>({...p, questoesDia:parseInt(e.target.value)||0}))}
              style={{ ...s.input, width:'100%' }}/>
          </div>
          <div style={{ flex:1, minWidth:140 }}>
            <div style={s.fieldLabel}>⏱ Meta de Horas/dia</div>
            <input type="number" min="0.5" max="16" step="0.5" value={metas.horasDia}
              onChange={e => setMetas(p=>({...p, horasDia:parseFloat(e.target.value)||0}))}
              style={{ ...s.input, width:'100%' }}/>
          </div>
        </div>
      </Card>

      {/* Progresso de hoje */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <MetaCard
          icon="🎯" titulo="Questões Hoje"
          valor={hojeQ} meta={metas.questoesDia}
          pct={pctQ} unidade="questões"
          color={pctQ>=100?'#10b981':pctQ>=60?'#f59e0b':'#6366f1'}
        />
        <MetaCard
          icon="⏱" titulo="Horas Hoje"
          valor={hojeH.toFixed(1)} meta={metas.horasDia}
          pct={pctH} unidade="horas"
          color={pctH>=100?'#10b981':pctH>=60?'#f59e0b':'#22d3ee'}
        />
      </div>

      {/* Resumo semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[
          { v:semanaQ, l:'Questões na semana', c:'#6366f1' },
          { v:`${semanaH}h`,  l:'Horas na semana',     c:'#22d3ee' },
          { v:`${diasMeta}/7`, l:'Dias com meta batida', c: diasMeta>=5?'#10b981':diasMeta>=3?'#f59e0b':'#ef4444' },
        ].map(({v,l,c}) => (
          <div key={l} style={s.kpi}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.4rem', fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontSize:'0.62rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Gráfico 14 dias */}
      <Card title="📈 Questões e Horas — Últimos 14 Dias">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hist14} margin={{top:4,right:8,left:-22,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="label" tick={{fill:'#334155',fontSize:9}}/>
            <YAxis yAxisId="q" tick={{fill:'#334155',fontSize:9}}/>
            <YAxis yAxisId="h" orientation="right" tick={{fill:'#334155',fontSize:9}} unit="h"/>
            <Tooltip contentStyle={{background:'#0f0f18',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,fontSize:11}}/>
            <Bar yAxisId="q" dataKey="questoes" name="Questões" fill="#6366f1" radius={[3,3,0,0]} opacity={0.85}/>
            <Bar yAxisId="h" dataKey="horas"    name="Horas"    fill="#22d3ee" radius={[3,3,0,0]} opacity={0.65}/>
          </BarChart>
        </ResponsiveContainer>
        {/* Linha de meta */}
        <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#6366f1' }}/>
            <span style={{ fontSize:'0.65rem', color:'#64748b' }}>Questões (meta: {metas.questoesDia}/dia)</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#22d3ee', opacity:0.65 }}/>
            <span style={{ fontSize:'0.65rem', color:'#64748b' }}>Horas (meta: {metas.horasDia}h/dia)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetaCard({ icon, titulo, valor, meta, pct, unidade, color }) {
  return (
    <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:'1.2rem' }}>{icon}</span>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.78rem', fontWeight:700, color:'#e2e8f0' }}>{titulo}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:10 }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2rem', fontWeight:700, color, lineHeight:1 }}>{valor}</span>
        <span style={{ fontSize:'0.7rem', color:'#334155' }}>/ {meta} {unidade}</span>
      </div>
      <div style={{ height:8, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
        <div style={{ width:`${pct}%`, height:'100%', borderRadius:99, background:color,
            boxShadow:`0 0 8px ${color}60`, transition:'width 0.5s' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.65rem', color:pct>=100?'#10b981':'#334155', fontWeight:pct>=100?700:400 }}>
          {pct>=100 ? '✓ Meta batida!' : `${pct}% da meta`}
        </span>
        <span style={{ fontSize:'0.65rem', color:'#334155' }}>{Math.max(0,meta-parseFloat(valor))} restam</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: COUNTDOWN DA PROVA
═══════════════════════════════════════════════════════════════ */
function TabProva({ metas, setMetas, questoes, studyLog }) {
  const countdown = useMemo(() => {
    if (!metas.dataProva) return null;
    const prova = new Date(metas.dataProva + 'T00:00:00');
    const hoje  = new Date(); hoje.setHours(0,0,0,0);
    const diff  = Math.ceil((prova - hoje) / 86400000);
    return diff;
  }, [metas.dataProva]);

  const totalQ   = questoes.reduce((a,b)=>a+(b.total||0),0);
  const totalMin = studyLog.filter(l=>l.modo==='foco').reduce((a,b)=>a+b.minutos,0);
  const totalH   = (totalMin/60).toFixed(0);
  const mediaPct = totalQ>0 ? Math.round((questoes.reduce((a,b)=>a+(b.acertos||0),0)/totalQ)*100) : 0;

  const semanas = countdown !== null ? Math.floor(countdown/7) : null;
  const dias    = countdown !== null ? countdown % 7 : null;

  /* Cor do countdown */
  const ctColor = countdown === null ? '#6366f1'
    : countdown > 90  ? '#10b981'
    : countdown > 30  ? '#f59e0b'
    : countdown > 0   ? '#ef4444'
    : '#8b5cf6'; // passou

  /* Ritmo sugerido se tiver data */
  const ritmoQ = countdown > 0 && metas.questoesDia > 0
    ? Math.round(metas.questoesDia * countdown)
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Configurar prova */}
      <Card title="📅 Configurar Data da Prova">
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={s.fieldLabel}>Nome do concurso</div>
            <input value={metas.nomeProva}
              onChange={e => setMetas(p=>({...p, nomeProva:e.target.value}))}
              placeholder="Ex: RFB — Edital Nº 1/2022"
              style={{ ...s.input, width:'100%' }}/>
          </div>
          <div style={{ minWidth:160 }}>
            <div style={s.fieldLabel}>Data da prova</div>
            <input type="date" value={metas.dataProva}
              onChange={e => setMetas(p=>({...p, dataProva:e.target.value}))}
              style={{ ...s.input, width:'100%' }}/>
          </div>
        </div>
      </Card>

      {/* Countdown principal */}
      {countdown !== null ? (
        <div style={{ background:'linear-gradient(135deg,#111128,#0d0d1e)',
            border:`1px solid ${ctColor}30`, borderRadius:14, padding:'32px 24px', textAlign:'center' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:ctColor, marginBottom:8 }}>
            {countdown > 0 ? 'FALTAM' : countdown === 0 ? '🎯 É HOJE!' : '✅ PROVA REALIZADA'}
          </div>
          {countdown > 0 && (
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'4.5rem', fontWeight:700, color:ctColor, lineHeight:1, marginBottom:8,
                textShadow:`0 0 40px ${ctColor}50` }}>
              {countdown}
            </div>
          )}
          {countdown > 0 && (
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', color:'#64748b', marginBottom:6 }}>
              dias
            </div>
          )}
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.1rem', fontWeight:600, color:'#e2e8f0', marginBottom:4 }}>
            {metas.nomeProva || 'Prova'}
          </div>
          {countdown > 0 && (
            <div style={{ fontSize:'0.72rem', color:'#475569' }}>
              {semanas > 0 ? `${semanas} semana${semanas>1?'s':''} e ` : ''}{dias} dia{dias!==1?'s':''}
              {metas.dataProva && ` · ${new Date(metas.dataProva+'T00:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}`}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...s.kpi, padding:'28px', textAlign:'center', borderRadius:14 }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📅</div>
          <div style={{ fontSize:'0.8rem', color:'#334155' }}>Configure a data da prova acima para ver o countdown</div>
        </div>
      )}

      {/* Projeção de estudo */}
      {countdown > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
          {[
            { icon:'📝', v:`~${(metas.questoesDia * countdown).toLocaleString()}`, l:'Questões projetadas', c:'#6366f1' },
            { icon:'⏱', v:`~${(metas.horasDia * countdown).toFixed(0)}h`, l:'Horas projetadas', c:'#22d3ee' },
            { icon:'📅', v:`${Math.ceil(countdown/7)} semanas`, l:'Semanas restantes', c:ctColor },
            { icon:'📊', v:`${mediaPct}%`, l:'Aproveitamento atual', c:mediaPct>=70?'#10b981':mediaPct>=50?'#f59e0b':'#ef4444' },
          ].map(({icon,v,l,c}) => (
            <div key={l} style={s.kpi}>
              <div style={{ fontSize:'1.3rem', marginBottom:4 }}>{icon}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.2rem', fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:'0.6rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Conquistas até agora */}
      <Card title="🏆 Acumulado até Hoje">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { v:totalQ.toLocaleString(), l:'Questões resolvidas', c:'#6366f1' },
            { v:`${totalH}h`,            l:'Horas de foco',       c:'#22d3ee' },
            { v:`${mediaPct}%`,          l:'Aproveitamento geral', c:mediaPct>=70?'#10b981':mediaPct>=50?'#f59e0b':'#ef4444' },
          ].map(({v,l,c}) => (
            <div key={l} style={{ textAlign:'center', padding:'14px 8px' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.6rem', fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:'0.62rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   UTILITÁRIOS
═══════════════════════════════════════════════════════════════ */
function Card({ title, children }) {
  return (
    <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ width:3, height:13, background:'#6366f1', borderRadius:99 }}/>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.78rem', fontWeight:700, color:'#e2e8f0' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📊</div>
      <div style={{ fontSize:'0.8rem', color:'#334155' }}>{text}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: METAS SEMANAIS
═══════════════════════════════════════════════════════════════ */
function TabSemanal({ questoes, studyLog, metas, setMetas }) {
  const hoje = new Date();
  // Início da semana (Segunda)
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));

  // 8 semanas para o histórico
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const ini = new Date(inicioSemana);
    ini.setDate(ini.getDate() - (7 * (7 - i)));
    const dias = Array.from({ length: 7 }, (_, d) => {
      const dia = new Date(ini);
      dia.setDate(ini.getDate() + d);
      return dia.toISOString().slice(0, 10);
    });
    const label = ini.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const q = questoes.filter(x => dias.includes(x.data)).reduce((a, b) => a + (b.total || 0), 0);
    const min = studyLog.filter(l => dias.includes(l.date) && l.modo === 'foco').reduce((a, b) => a + b.minutos, 0);
    const h = parseFloat((min / 60).toFixed(1));
    const diasAtivos = dias.filter(d => studyLog.some(l => l.date === d && l.modo === 'foco')).length;
    const isAtual = i === 7;
    return { label, questoes: q, horas: h, diasAtivos, dias, isAtual };
  });

  const semAtual = semanas[7];
  const pctQ = metas.questoesSemana > 0 ? Math.min(100, Math.round((semAtual.questoes / metas.questoesSemana) * 100)) : 0;
  const pctH = metas.horasSemana    > 0 ? Math.min(100, Math.round((semAtual.horas    / metas.horasSemana)    * 100)) : 0;
  const pctD = Math.round((semAtual.diasAtivos / 7) * 100);

  // Médias
  const mediaQ = semanas.length > 0 ? Math.round(semanas.reduce((a,b)=>a+b.questoes,0) / semanas.length) : 0;
  const mediaH = semanas.length > 0 ? (semanas.reduce((a,b)=>a+b.horas,0) / semanas.length).toFixed(1) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Configurar metas semanais */}
      <Card title="⚙ Configurar Metas Semanais">
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={s.fieldLabel}>🎯 Meta de Questões/semana</div>
            <input type="number" min="1" max="2000"
              value={metas.questoesSemana || metas.questoesDia * 5}
              onChange={e => setMetas(p => ({ ...p, questoesSemana: parseInt(e.target.value) || 0 }))}
              style={{ ...s.input, width: '100%' }} />
          </div>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={s.fieldLabel}>⏱ Meta de Horas/semana</div>
            <input type="number" min="1" max="80" step="0.5"
              value={metas.horasSemana || metas.horasDia * 5}
              onChange={e => setMetas(p => ({ ...p, horasSemana: parseFloat(e.target.value) || 0 }))}
              style={{ ...s.input, width: '100%' }} />
          </div>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={s.fieldLabel}>📅 Meta de Dias/semana</div>
            <input type="number" min="1" max="7"
              value={metas.diasSemana || 5}
              onChange={e => setMetas(p => ({ ...p, diasSemana: parseInt(e.target.value) || 5 }))}
              style={{ ...s.input, width: '100%' }} />
          </div>
        </div>
      </Card>

      {/* Progresso semana atual */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { icon:'🎯', titulo:'Questões esta semana', valor:semAtual.questoes, meta:metas.questoesSemana||metas.questoesDia*5, pct:pctQ, unidade:'questões', color:pctQ>=100?'#10b981':pctQ>=60?'#f59e0b':'#6366f1' },
          { icon:'⏱', titulo:'Horas esta semana',    valor:semAtual.horas+'h', meta:(metas.horasSemana||metas.horasDia*5)+'h', pct:pctH, unidade:'h', color:pctH>=100?'#10b981':pctH>=60?'#f59e0b':'#22d3ee' },
          { icon:'📅', titulo:'Dias ativos',          valor:semAtual.diasAtivos, meta:metas.diasSemana||5, pct:pctD, unidade:'dias', color:pctD>=100?'#10b981':pctD>=60?'#f59e0b':'#8b5cf6' },
        ].map(({ icon, titulo, valor, meta, pct, unidade, color }) => (
          <div key={titulo} style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <span style={{ fontSize:'1rem' }}>{icon}</span>
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.73rem', fontWeight:700, color:'#e2e8f0' }}>{titulo}</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:8 }}>
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.8rem', fontWeight:700, color, lineHeight:1 }}>{valor}</span>
              <span style={{ fontSize:'0.65rem', color:'#334155' }}>/ {meta} {unidade}</span>
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', marginBottom:5 }}>
              <div style={{ width:`${pct}%`, height:'100%', borderRadius:99, background:color, boxShadow:`0 0 8px ${color}60`, transition:'width 0.5s' }}/>
            </div>
            <div style={{ fontSize:'0.6rem', color:pct>=100?'#10b981':'#334155', fontWeight:pct>=100?700:400 }}>
              {pct>=100 ? '✓ Meta batida!' : `${pct}% da meta`}
            </div>
          </div>
        ))}
      </div>

      {/* Histórico 8 semanas — barras */}
      <Card title="📊 Histórico Semanal — 8 Semanas">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {semanas.map((sem, i) => {
            const metaQ = metas.questoesSemana || metas.questoesDia * 5;
            const metaH = metas.horasSemana    || metas.horasDia * 5;
            const pq = metaQ > 0 ? Math.min(100, Math.round((sem.questoes / metaQ) * 100)) : 0;
            const ph = metaH > 0 ? Math.min(100, Math.round((sem.horas    / metaH) * 100)) : 0;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                  background: sem.isAtual ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: sem.isAtual ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  borderRadius:8, padding:'6px 10px' }}>
                <div style={{ width:44, fontSize:'0.65rem', color:sem.isAtual?'#818cf8':'#475569', fontWeight:sem.isAtual?700:400, flexShrink:0 }}>
                  {sem.label}{sem.isAtual && ' ★'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:4, marginBottom:3 }}>
                    <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ width:`${pq}%`, height:'100%', background:pq>=100?'#10b981':'#6366f1', borderRadius:99 }}/>
                    </div>
                    <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ width:`${ph}%`, height:'100%', background:ph>=100?'#10b981':'#22d3ee', borderRadius:99 }}/>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, flexShrink:0 }}>
                  <span style={{ fontSize:'0.65rem', color:pq>=100?'#10b981':'#6366f1', fontWeight:600 }}>{sem.questoes}q</span>
                  <span style={{ fontSize:'0.65rem', color:ph>=100?'#10b981':'#22d3ee', fontWeight:600 }}>{sem.horas}h</span>
                  <span style={{ fontSize:'0.65rem', color:'#475569' }}>{sem.diasAtivos}d</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:16, marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize:'0.62rem', color:'#475569' }}>Média: <b style={{color:'#6366f1'}}>{mediaQ}q/sem</b> · <b style={{color:'#22d3ee'}}>{mediaH}h/sem</b></span>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: EVOLUÇÃO POR MATÉRIA
═══════════════════════════════════════════════════════════════ */
function TabEvolucao({ questoes, studyLog }) {
  const [matSel, setMatSel] = useState('');
  const [periodo, setPeriodo] = useState(30); // dias

  // Matérias com dados
  const materiasComDados = useMemo(() => {
    const map = {};
    questoes.forEach(q => {
      if (!q.materia) return;
      if (!map[q.materia]) map[q.materia] = 0;
      map[q.materia]++;
    });
    return Object.entries(map)
      .sort((a,b) => b[1]-a[1])
      .map(([nome, total]) => ({ nome, total }));
  }, [questoes]);

  // Selecionar primeira automaticamente
  const matAtual = matSel || materiasComDados[0]?.nome || '';

  // Dados da matéria selecionada ao longo do tempo
  const dadosMateria = useMemo(() => {
    if (!matAtual) return [];
    const sessoes = questoes
      .filter(q => q.materia === matAtual)
      .sort((a,b) => (a.data||'').localeCompare(b.data||''));
    if (sessoes.length === 0) return [];

    // Acumulado por data
    let acTotal = 0, acAcertos = 0;
    const porData = {};
    sessoes.forEach(q => {
      const d = q.data || '—';
      if (!porData[d]) porData[d] = { total:0, acertos:0 };
      porData[d].total   += q.total   || 0;
      porData[d].acertos += q.acertos || 0;
    });

    return Object.entries(porData)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .slice(-periodo)
      .map(([data, d]) => {
        acTotal   += d.total;
        acAcertos += d.acertos;
        return {
          data: data.slice(5), // MM-DD
          pctDia: d.total > 0 ? Math.round((d.acertos/d.total)*100) : null,
          pctAcum: acTotal > 0 ? Math.round((acAcertos/acTotal)*100) : null,
          totalDia: d.total,
          totalAcum: acTotal,
        };
      });
  }, [questoes, matAtual, periodo]);

  // Comparativo entre matérias (últimas N sessões)
  const comparativo = useMemo(() => {
    return materiasComDados.map(({ nome }) => {
      const sess = questoes.filter(q => q.materia === nome);
      const t  = sess.reduce((a,b) => a+(b.total||0), 0);
      const ac = sess.reduce((a,b) => a+(b.acertos||0), 0);
      // Tendência: últimas 3 sessões vs 3 anteriores
      const ultimas = sess.slice(-3);
      const ant     = sess.slice(-6, -3);
      const pctUlt  = ultimas.reduce((a,b)=>a+(b.total||0),0) > 0
        ? Math.round((ultimas.reduce((a,b)=>a+(b.acertos||0),0) / ultimas.reduce((a,b)=>a+(b.total||0),0)) * 100) : null;
      const pctAnt  = ant.reduce((a,b)=>a+(b.total||0),0) > 0
        ? Math.round((ant.reduce((a,b)=>a+(b.acertos||0),0) / ant.reduce((a,b)=>a+(b.total||0),0)) * 100) : null;
      const tendencia = pctUlt !== null && pctAnt !== null ? pctUlt - pctAnt : null;
      return {
        nome, total:t, acertos:ac,
        pct: t > 0 ? Math.round((ac/t)*100) : 0,
        tendencia, pctUlt,
      };
    });
  }, [questoes, materiasComDados]);

  if (questoes.length === 0) return <Empty text="Registre questões para ver a evolução por matéria." />;

  // Componente CustomDot para recharts
  const CustomDot = (props) => {
    const { cx, cy, value } = props;
    if (value === null || value === undefined) return null;
    return <circle cx={cx} cy={cy} r={3} fill="#6366f1" />;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Seletor matéria + período */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={s.fieldLabel}>Matéria</div>
          <select value={matAtual} onChange={e => setMatSel(e.target.value)}
            style={{ ...s.input, width:'100%' }}>
            {materiasComDados.map(m => (
              <option key={m.nome} value={m.nome}>{m.nome} ({m.total}q)</option>
            ))}
          </select>
        </div>
        <div>
          <div style={s.fieldLabel}>Período</div>
          <div style={{ display:'flex', gap:4 }}>
            {[14,30,60,90].map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                style={{ padding:'6px 12px', borderRadius:7, fontSize:'0.7rem', fontWeight:600, cursor:'pointer',
                  background: periodo===p ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${periodo===p ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: periodo===p ? '#818cf8' : '#475569' }}>
                {p}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico evolução matéria selecionada */}
      {dadosMateria.length > 0 ? (
        <Card title={`📈 Evolução — ${matAtual}`}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dadosMateria} margin={{top:4,right:8,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="data" tick={{fill:'#334155',fontSize:9}}/>
              <YAxis domain={[0,100]} tick={{fill:'#334155',fontSize:9}} unit="%"/>
              <Tooltip
                contentStyle={{background:'#0f0f18',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,fontSize:11}}
                formatter={(v, n) => [v !== null ? `${v}%` : '—', n]}
              />
              <Line type="monotone" dataKey="pctDia"   name="% no dia"   stroke="#6366f1" strokeWidth={1.5} dot={<CustomDot/>} connectNulls={false} strokeDasharray="4 2"/>
              <Line type="monotone" dataKey="pctAcum"  name="% acumulada" stroke="#10b981" strokeWidth={2}   dot={false} connectNulls/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', gap:16, marginTop:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:20, height:2, background:'#6366f1', borderStyle:'dashed' }}/>
              <span style={{ fontSize:'0.62rem', color:'#64748b' }}>% no dia</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:20, height:2, background:'#10b981' }}/>
              <span style={{ fontSize:'0.62rem', color:'#64748b' }}>% acumulada</span>
            </div>
          </div>
        </Card>
      ) : (
        <Empty text={`Nenhum dado para "${matAtual}" no período selecionado.`}/>
      )}

      {/* Comparativo todas as matérias */}
      <Card title="🔄 Comparativo — Todas as Matérias">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Matéria','Questões','Aproveit.','Tendência','Barra'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparativo.map(m => (
                <tr key={m.nome} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }}
                  onClick={() => setMatSel(m.nome)}>
                  <td style={{ ...s.td, maxWidth:180 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:600, color: matAtual===m.nome?'#818cf8':'#94a3b8' }}>{m.nome}</div>
                  </td>
                  <td style={{ ...s.td, textAlign:'center' }}>{m.total}</td>
                  <td style={{ ...s.td, textAlign:'center' }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.78rem', fontWeight:700,
                        color:m.pct>=70?'#10b981':m.pct>=50?'#f59e0b':'#ef4444' }}>{m.pct}%</span>
                  </td>
                  <td style={{ ...s.td, textAlign:'center' }}>
                    {m.tendencia !== null ? (
                      <span style={{ fontSize:'0.72rem', fontWeight:700,
                          color:m.tendencia>0?'#10b981':m.tendencia<0?'#ef4444':'#475569' }}>
                        {m.tendencia > 0 ? `↑ +${m.tendencia}%` : m.tendencia < 0 ? `↓ ${m.tendencia}%` : '→ estável'}
                      </span>
                    ) : <span style={{ fontSize:'0.65rem', color:'#334155' }}>—</span>}
                  </td>
                  <td style={{ ...s.td, minWidth:100 }}>
                    <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ width:`${m.pct}%`, height:'100%', borderRadius:99,
                          background:m.pct>=70?'#10b981':m.pct>=50?'#f59e0b':'#ef4444' }}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:10, fontSize:'0.62rem', color:'#334155' }}>
          💡 Tendência = comparação entre as 3 últimas sessões e as 3 anteriores · Clique na matéria para ver o gráfico
        </div>
      </Card>
    </div>
  );
}


const s = {
  hero: { background:'linear-gradient(135deg,#111128,#0d0d1e)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:14, padding:'16px 22px' },
  heroLabel: { fontSize:'0.58rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color:'#6366f1', marginBottom:4 },
  heroTitle: { fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.35rem', fontWeight:700, color:'#f1f5f9', lineHeight:1.1, marginBottom:4 },
  heroSub:   { fontSize:'0.68rem', color:'#475569' },
  tabs:      { display:'flex', gap:6, flexWrap:'wrap' },
  tab:       { padding:'7px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'#475569', fontSize:'0.75rem', fontWeight:600, cursor:'pointer', transition:'all 0.15s' },
  tabActive: { background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)', color:'#818cf8' },
  kpi:       { background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'14px 12px', textAlign:'center' },
  th:        { padding:'10px 14px', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#334155', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', whiteSpace:'nowrap' },
  td:        { padding:'10px 14px', fontSize:'0.8rem', color:'#94a3b8', verticalAlign:'middle' },
  fieldLabel:{ fontSize:'0.62rem', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 },
  input:     { padding:'8px 10px', fontSize:'0.83rem', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0' },
};
