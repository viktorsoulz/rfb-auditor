import { useState, useMemo, useCallback } from 'react';
import { useStorage } from '../hooks/useStorage';

/* ══════════════════════════════════════════════════════════════
   DADOS DO CICLO
═══════════════════════════════════════════════════════════════ */

// Categorias com cores
const CATEGORIAS = {
  linguagens:    { label: 'Linguagens',        color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  raciocinio:    { label: 'Raciocínio',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  direito:       { label: 'Direito',            color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
  contabil:      { label: 'Contabilidade',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  tributario:    { label: 'Tributário/Aduaneiro',color:'#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  auditoria:     { label: 'Auditoria',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  dados:         { label: 'Dados/Estatística',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  adm:           { label: 'Administração',      color: '#84cc16', bg: 'rgba(132,204,22,0.12)'  },
  economia:      { label: 'Economia/Finanças',  color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
};

// Matérias com categoria, rodada de inclusão e carga horária sugerida (h/semana)
const MATERIAS = [
  // Ciclo Inicial
  { id:'port',    nome:'Língua Portuguesa',             cat:'linguagens', rodada:0, horas:2, obs:'* Prioritária — AFRFB e ATRFB' },
  { id:'rl',      nome:'Raciocínio Lógico',             cat:'raciocinio', rodada:0, horas:2 },
  { id:'dcon',    nome:'Direito Constitucional',         cat:'direito',    rodada:0, horas:2, obs:'* Prioritária' },
  { id:'dadm',    nome:'Direito Administrativo',         cat:'direito',    rodada:0, horas:2, obs:'* Prioritária' },
  { id:'dtrib',   nome:'Direito Tributário',             cat:'tributario', rodada:0, horas:2 },
  { id:'cont',    nome:'Contabilidade Geral e Pública',  cat:'contabil',   rodada:0, horas:2 },
  // 1ª Rodada
  { id:'aud',     nome:'Auditoria',                      cat:'auditoria',  rodada:1, horas:2 },
  { id:'dados',   nome:'Fluência em Dados',               cat:'dados',      rodada:1, horas:2 },
  { id:'estat',   nome:'Estatística',                    cat:'dados',      rodada:1, horas:2 },
  { id:'comi',    nome:'Comércio Internacional',          cat:'tributario', rodada:1, horas:2 },
  // 2ª Rodada
  { id:'laduan',  nome:'Legislação Aduaneira',            cat:'tributario', rodada:2, horas:2 },
  { id:'ltrib',   nome:'Legislação Tributária Federal',   cat:'tributario', rodada:2, horas:2 },
  { id:'dprev',   nome:'Direito Previdenciário',          cat:'direito',    rodada:2, horas:2 },
  // 3ª Rodada
  { id:'ingl',    nome:'Língua Inglesa',                  cat:'linguagens', rodada:3, horas:1.5 },
  { id:'fin',     nome:'Finanças Públicas',               cat:'economia',   rodada:3, horas:2 },
  { id:'casp',    nome:'CASP – Contabilidade Pública',    cat:'contabil',   rodada:3, horas:2 },
  { id:'admpub',  nome:'Administração Pública',           cat:'adm',        rodada:3, horas:2 },
  { id:'admger',  nome:'Administração Geral',             cat:'adm',        rodada:3, horas:2 },
  { id:'econ',    nome:'Economia',                        cat:'economia',   rodada:3, horas:2 },
];

const RODADAS = [
  { id:0, label:'Ciclo Inicial', cor:'#6366f1' },
  { id:1, label:'1ª Rodada de Inclusões', cor:'#22d3ee' },
  { id:2, label:'2ª Rodada de Inclusões', cor:'#10b981' },
  { id:3, label:'3ª Rodada de Inclusões', cor:'#f59e0b' },
];

// 3 matérias/dia — gera sequência do ciclo ativo
function gerarCiclo(ativas) {
  const dias = [];
  const total = ativas.length;
  if (total === 0) return dias;
  // Cada dia: 3 matérias (ou menos se total < 3)
  const materiasPorDia = 3;
  let idx = 0;
  // Gera 30 dias de ciclo
  for (let d = 0; d < 30; d++) {
    const mat = [];
    for (let m = 0; m < materiasPorDia; m++) {
      mat.push(ativas[idx % total]);
      idx++;
    }
    dias.push({ dia: d + 1, materias: mat });
  }
  return dias;
}

// Dias da semana abreviados
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export default function Ciclo() {
  // Estado persistido
  const [cicloState, setCicloState] = useStorage('ciclo', {
    ativas: MATERIAS.filter(m=>m.rodada===0).map(m=>m.id), // começa com ciclo inicial
    dataInicio: new Date().toISOString().slice(0,10),
    diasConcluidos: {}, // { '2024-01-15': true }
    notas: {},          // { materiaId: { total, acertos } } — resumo de progresso
    rodadaAtual: 0,
  });

  const [tab, setTab] = useState('visao'); // 'visao' | 'calendario' | 'configurar'
  const [mesCalendario, setMesCalendario] = useState(() => {
    const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() };
  });

  // Matérias ativas
  const materiasAtivas = useMemo(() =>
    MATERIAS.filter(m => cicloState.ativas.includes(m.id)),
    [cicloState.ativas]
  );

  // Ciclo de 30 dias
  const ciclo30 = useMemo(() => gerarCiclo(materiasAtivas), [materiasAtivas]);

  // Dia atual do ciclo (contando a partir do dataInicio)
  const diaAtual = useMemo(() => {
    const inicio = new Date(cicloState.dataInicio);
    const hoje   = new Date();
    const diff   = Math.floor((hoje - inicio) / 86400000);
    return Math.max(0, diff);
  }, [cicloState.dataInicio]);

  const diaNoModal = diaAtual % 30; // posição no ciclo de 30

  // Concluir dia de hoje
  const hoje = new Date().toISOString().slice(0,10);
  const hojeConcluido = cicloState.diasConcluidos[hoje];

  const concluirHoje = () => {
    setCicloState(p => ({
      ...p,
      diasConcluidos: { ...p.diasConcluidos, [hoje]: true }
    }));
  };

  const toggleDia = (dateStr) => {
    setCicloState(p => ({
      ...p,
      diasConcluidos: { ...p.diasConcluidos, [dateStr]: !p.diasConcluidos[dateStr] }
    }));
  };

  // Adicionar/remover matéria
  const toggleMateria = useCallback((id) => {
    setCicloState(p => {
      const ativas = p.ativas.includes(id)
        ? p.ativas.filter(x => x !== id)
        : [...p.ativas, id];
      return { ...p, ativas };
    });
  }, [setCicloState]);

  // Reiniciar ciclo
  const reiniciarCiclo = () => {
    setCicloState(p => ({ ...p, dataInicio: new Date().toISOString().slice(0,10), diasConcluidos: {} }));
  };

  // Stats
  const totalDias    = Object.keys(cicloState.diasConcluidos).filter(k=>cicloState.diasConcluidos[k]).length;
  const streak       = calcStreak(cicloState.diasConcluidos);
  const pctCiclo     = ciclo30.length > 0 ? Math.round(((diaNoModal) / 30) * 100) : 0;

  // Matérias de hoje (posição no ciclo)
  const materiasHoje = ciclo30[diaNoModal % 30]?.materias || [];

  // Domingo? → RSQ
  const ehDomingo    = new Date().getDay() === 0;
  // Dia 30 do ciclo? → próximo de RMQ
  const ehDia30      = diaAtual > 0 && diaAtual % 30 === 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── HERO ── */}
      <div style={s.hero}>
        <div style={{ flex:1 }}>
          <div style={s.heroLabel}>CICLO DE ESTUDOS INTELIGENTE</div>
          <h1 style={s.heroTitle}>Plano de Estudos RFB</h1>
          <p style={s.heroSub}>3 matérias/dia · 2h cada · QD + RCA diária · RSQ domenical · RMQ mensal</p>
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <StatPill icon="🔥" label="Streak" value={`${streak}d`} color="#f59e0b"/>
          <StatPill icon="✅" label="Dias estudados" value={totalDias} color="#10b981"/>
          <StatPill icon="📚" label="Matérias ativas" value={materiasAtivas.length} color="#6366f1"/>
          <StatPill icon="🔄" label="Ciclo atual" value={`Dia ${(diaAtual%30)+1}/30`} color="#22d3ee"/>
        </div>
      </div>

      {/* ── ABAS ── */}
      <div style={s.tabs}>
        {[
          { id:'visao',      label:'📋 Visão do Dia' },
          { id:'calendario', label:'📅 Calendário' },
          { id:'ciclo30',    label:'🔄 Ciclo 30 Dias' },
          { id:'configurar', label:'⚙ Configurar' },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ ...s.tab, ...(tab===t.id ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          ABA: VISÃO DO DIA
      ════════════════════════════════════════════════════════ */}
      {tab === 'visao' && (
        <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>

          {/* Coluna esquerda */}
          <div style={{ flex:'1 1 360px', display:'flex', flexDirection:'column', gap:12 }}>

            {/* Card hoje */}
            <Card title="📌 Hoje no Ciclo" accent="#6366f1">
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2.2rem', fontWeight:700, color:'#6366f1', lineHeight:1 }}>{(diaAtual%30)+1}</div>
                <div>
                  <div style={{ fontSize:'0.65rem', color:'#6366f1', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Dia do Ciclo</div>
                  <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
                </div>
                <div style={{ marginLeft:'auto' }}>
                  {hojeConcluido
                    ? <span style={s.badgeOk}>✓ Concluído</span>
                    : <button style={s.btnConcluir} onClick={concluirHoje}>Marcar Concluído</button>
                  }
                </div>
              </div>

              {/* Matérias do dia */}
              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Matérias de Hoje (QD — Questões do Dia)</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {materiasHoje.map((mat,i) => {
                  const cat = CATEGORIAS[mat.cat];
                  return (
                    <div key={mat.id} style={{ display:'flex', alignItems:'center', gap:10,
                        background:cat.bg, border:`1px solid ${cat.color}30`,
                        borderRadius:8, padding:'10px 14px' }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:cat.color,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>{mat.nome}</div>
                        <div style={{ fontSize:'0.6rem', color:cat.color, marginTop:2 }}>{cat.label}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'0.65rem', color:'#475569' }}>{mat.horas}h estudo</div>
                        <div style={{ fontSize:'0.6rem', color:'#334155', marginTop:1 }}>+ 30min revisão</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RCA */}
              <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(245,158,11,0.08)',
                  border:'1px solid rgba(245,158,11,0.2)', borderRadius:8 }}>
                <div style={{ fontSize:'0.65rem', fontWeight:700, color:'#f59e0b', marginBottom:4 }}>
                  🔁 RCA — Revisão do Ciclo Anterior
                </div>
                <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>
                  Após as QDs de hoje, revise as matérias do dia anterior com questões rápidas (10–15 por matéria).
                </div>
              </div>
            </Card>

            {/* Alertas especiais */}
            {ehDomingo && (
              <Card title="🗓 Domingo — RSQ" accent="#8b5cf6">
                <div style={{ fontSize:'0.75rem', color:'#94a3b8', lineHeight:1.6 }}>
                  <b style={{color:'#a78bfa'}}>RSQ — Revisão Semanal por Questões</b><br/>
                  Hoje é domingo! Faça uma bateria de questões de todas as matérias estudadas na semana. Recomendado: 10–15 questões por matéria.
                </div>
              </Card>
            )}
            {ehDia30 && (
              <Card title="📆 Dia 30 — RMQ" accent="#ef4444">
                <div style={{ fontSize:'0.75rem', color:'#94a3b8', lineHeight:1.6 }}>
                  <b style={{color:'#f87171'}}>RMQ — Revisão Mensal por Questões</b><br/>
                  Você completou um ciclo completo de 30 dias! Faça uma bateria robusta de questões de todas as matérias do ciclo.
                </div>
              </Card>
            )}
          </div>

          {/* Coluna direita */}
          <div style={{ flex:'1 1 300px', display:'flex', flexDirection:'column', gap:12 }}>

            {/* Legenda de siglas */}
            <Card title="📖 Legenda das Siglas">
              {[
                { sigla:'QD',  nome:'Questões do Dia',             cor:'#6366f1', desc:'Questões das 3 matérias de cada dia' },
                { sigla:'RCA', nome:'Revisão do Ciclo Anterior',   cor:'#f59e0b', desc:'Revisão do dia anterior após as QDs' },
                { sigla:'RSQ', nome:'Revisão Semanal (Questões)',  cor:'#8b5cf6', desc:'Bateria de questões aos domingos' },
                { sigla:'RMQ', nome:'Revisão Mensal (Questões)',   cor:'#ef4444', desc:'Bateria robusta ao fechar 30 dias' },
              ].map(x => (
                <div key={x.sigla} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                  <div style={{ padding:'3px 9px', borderRadius:6, background:`${x.cor}20`,
                      border:`1px solid ${x.cor}40`, color:x.cor,
                      fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.72rem', fontWeight:700, flexShrink:0 }}>
                    {x.sigla}
                  </div>
                  <div>
                    <div style={{ fontSize:'0.75rem', fontWeight:600, color:'#cbd5e1' }}>{x.nome}</div>
                    <div style={{ fontSize:'0.65rem', color:'#475569', marginTop:2 }}>{x.desc}</div>
                  </div>
                </div>
              ))}
            </Card>

            {/* Cronograma semanal */}
            <Card title="🗓 Rotina Semanal Sugerida">
              {[
                { dia:'Seg–Sex', rotina:'QD (3 mat × 2h) + RCA (30min)' },
                { dia:'Sábado',  rotina:'Revisão geral de flashcards + erros da semana' },
                { dia:'Domingo', rotina:'RSQ — Bateria de questões semanal' },
              ].map(x => (
                <div key={x.dia} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#6366f1', minWidth:60 }}>{x.dia}</div>
                  <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{x.rotina}</div>
                </div>
              ))}
              <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(99,102,241,0.07)',
                  borderRadius:7, fontSize:'0.65rem', color:'#475569' }}>
                📌 A cada ciclo completo de 30 dias → <b style={{color:'#f59e0b'}}>RMQ</b> obrigatória antes de iniciar o próximo ciclo.
              </div>
            </Card>

            {/* Progresso do ciclo */}
            <Card title="📊 Progresso do Ciclo Atual">
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:'0.7rem', color:'#64748b' }}>Dia {(diaAtual%30)+1} de 30</span>
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.75rem', fontWeight:700, color:'#6366f1' }}>{pctCiclo}%</span>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width:`${pctCiclo}%`, height:'100%', background:'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius:99, boxShadow:'0 0 8px rgba(99,102,241,0.5)' }}/>
                </div>
              </div>
              <div style={{ fontSize:'0.65rem', color:'#334155', marginTop:4 }}>
                Iniciado em {new Date(cicloState.dataInicio).toLocaleDateString('pt-BR')} · {totalDias} dias cumpridos
              </div>
              <button onClick={reiniciarCiclo} style={s.btnReiniciar}>🔄 Reiniciar Ciclo</button>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: CALENDÁRIO
      ════════════════════════════════════════════════════════ */}
      {tab === 'calendario' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card title={`📅 ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mesCalendario.mes]} ${mesCalendario.ano}`}
            headerRight={
              <div style={{ display:'flex', gap:6 }}>
                <button style={s.btnNav} onClick={()=>setMesCalendario(p=>{
                  const d=new Date(p.ano,p.mes-1,1); return {ano:d.getFullYear(),mes:d.getMonth()};
                })}>‹</button>
                <button style={s.btnNav} onClick={()=>setMesCalendario(p=>{
                  const d=new Date(p.ano,p.mes+1,1); return {ano:d.getFullYear(),mes:d.getMonth()};
                })}>›</button>
              </div>
            }>
            <Calendario
              ano={mesCalendario.ano}
              mes={mesCalendario.mes}
              dataInicio={cicloState.dataInicio}
              diasConcluidos={cicloState.diasConcluidos}
              ciclo30={ciclo30}
              onToggle={toggleDia}
            />
          </Card>
          {/* Legenda do calendário */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', padding:'0 2px' }}>
            {[
              { cor:'rgba(99,102,241,0.5)',  borda:'#6366f1', label:'Dia de estudo (QD)' },
              { cor:'rgba(16,185,129,0.4)',  borda:'#10b981', label:'Concluído ✓' },
              { cor:'rgba(139,92,246,0.4)',  borda:'#8b5cf6', label:'Domingo (RSQ)' },
              { cor:'rgba(239,68,68,0.35)',  borda:'#ef4444', label:'RMQ (dia 30)' },
              { cor:'rgba(99,102,241,0.15)', borda:'#818cf8', label:'Hoje' },
            ].map(x => (
              <div key={x.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:14, height:14, borderRadius:3, background:x.cor, border:`1px solid ${x.borda}` }}/>
                <span style={{ fontSize:'0.65rem', color:'#64748b' }}>{x.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: CICLO 30 DIAS
      ════════════════════════════════════════════════════════ */}
      {tab === 'ciclo30' && (
        <div>
          <Card title="🔄 Rotação de 30 Dias — Matérias por Dia">
            <div style={{ fontSize:'0.68rem', color:'#475569', marginBottom:14 }}>
              Cada dia tem 3 matérias (2h cada). Ao completar 30 dias, o ciclo recomeça.
              Dias marcados com <b style={{color:'#8b5cf6'}}>RSQ</b> = domingos, <b style={{color:'#ef4444'}}>RMQ</b> = dia 30.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:8 }}>
              {ciclo30.map(({ dia, materias }) => {
                const isDia30 = dia === 30;
                const concluido = isDiaConcluido(cicloState.dataInicio, dia-1, cicloState.diasConcluidos);
                const isAtual   = (diaAtual % 30) + 1 === dia;
                return (
                  <div key={dia} style={{
                    background: isAtual ? 'rgba(99,102,241,0.12)' : '#111120',
                    border: `1px solid ${isAtual ? '#6366f1' : isDia30 ? '#ef444430' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 10, padding: '10px 14px',
                    borderLeft: `3px solid ${isAtual ? '#6366f1' : isDia30 ? '#ef4444' : 'transparent'}`
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.88rem', fontWeight:700,
                          color: isAtual ? '#818cf8' : '#475569' }}>Dia {dia}</div>
                      {isAtual && <span style={s.badgeOk2}>Hoje</span>}
                      {isDia30 && <span style={{ ...s.badgeTag, background:'rgba(239,68,68,0.15)', color:'#f87171', borderColor:'rgba(239,68,68,0.3)' }}>RMQ</span>}
                      {concluido && <span style={{ marginLeft:'auto', fontSize:'0.65rem', color:'#10b981' }}>✓</span>}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {materias.map((mat,i) => {
                        const cat = CATEGORIAS[mat.cat];
                        return (
                          <div key={mat.id} style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:cat.color, flexShrink:0 }}/>
                            <span style={{ fontSize:'0.7rem', color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{mat.nome}</span>
                            <span style={{ fontSize:'0.58rem', color:cat.color, fontWeight:600, flexShrink:0 }}>{mat.horas}h</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: CONFIGURAR
      ════════════════════════════════════════════════════════ */}
      {tab === 'configurar' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card title="⚙ Configurar Matérias do Ciclo">
            <div style={{ fontSize:'0.68rem', color:'#475569', marginBottom:16 }}>
              Ative ou desative matérias. As matérias ativas entrarão na rotação do ciclo de 30 dias.
              Siga a sequência das rodadas de inclusão conforme avançar nos estudos.
            </div>
            {RODADAS.map(rodada => (
              <div key={rodada.id} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:rodada.cor }}/>
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'#e2e8f0' }}>{rodada.label}</span>
                  <span style={{ fontSize:'0.62rem', color:'#334155', marginLeft:4 }}>
                    ({MATERIAS.filter(m=>m.rodada===rodada.id && cicloState.ativas.includes(m.id)).length}/
                    {MATERIAS.filter(m=>m.rodada===rodada.id).length} ativas)
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:7 }}>
                  {MATERIAS.filter(m => m.rodada===rodada.id).map(mat => {
                    const cat     = CATEGORIAS[mat.cat];
                    const ativa   = cicloState.ativas.includes(mat.id);
                    return (
                      <button key={mat.id} onClick={() => toggleMateria(mat.id)}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                          background: ativa ? cat.bg : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${ativa ? cat.color+'50' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius:9, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                        <div style={{ width:20, height:20, borderRadius:4,
                            background: ativa ? cat.color : 'rgba(255,255,255,0.06)',
                            border: ativa ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            flexShrink:0, fontSize:'0.75rem' }}>
                          {ativa ? '✓' : ''}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.78rem', fontWeight:600, color: ativa ? '#e2e8f0' : '#475569',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mat.nome}</div>
                          <div style={{ fontSize:'0.6rem', color: ativa ? cat.color : '#334155', marginTop:2 }}>{cat.label}</div>
                        </div>
                        {mat.obs && <div style={{ fontSize:'0.58rem', color:'#f59e0b', flexShrink:0 }}>★</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>

          {/* Data de início */}
          <Card title="📅 Data de Início do Ciclo">
            <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Data de início</div>
                <input type="date" value={cicloState.dataInicio}
                  onChange={e => setCicloState(p=>({...p,dataInicio:e.target.value}))}
                  style={{ padding:'8px 12px', fontSize:'0.83rem', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0' }}/>
              </div>
              <button onClick={reiniciarCiclo} style={{ ...s.btnReiniciar, alignSelf:'flex-end' }}>
                Reiniciar do Hoje
              </button>
            </div>
          </Card>

          {/* Resumo */}
          <Card title="📋 Resumo do Ciclo Configurado">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
              {Object.entries(CATEGORIAS).map(([catId, cat]) => {
                const count = materiasAtivas.filter(m=>m.cat===catId).length;
                if (!count) return null;
                return (
                  <div key={catId} style={{ display:'flex', alignItems:'center', gap:8,
                      padding:'8px 12px', background:cat.bg, border:`1px solid ${cat.color}30`, borderRadius:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color }}/>
                    <div>
                      <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#e2e8f0' }}>{cat.label}</div>
                      <div style={{ fontSize:'0.6rem', color:cat.color }}>{count} matéria{count>1?'s':''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(99,102,241,0.07)', borderRadius:8, fontSize:'0.72rem', color:'#64748b' }}>
              Ciclo de <b style={{color:'#818cf8'}}>{materiasAtivas.length} matérias</b> · Cada matéria aparece a cada{' '}
              <b style={{color:'#818cf8'}}>{materiasAtivas.length > 0 ? Math.ceil(materiasAtivas.length/3) : '—'} dias</b> · Ciclo completo a cada{' '}
              <b style={{color:'#818cf8'}}>30 dias</b>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE: CALENDÁRIO
═══════════════════════════════════════════════════════════════ */
function Calendario({ ano, mes, dataInicio, diasConcluidos, ciclo30, onToggle }) {
  const hoje   = new Date().toISOString().slice(0,10);
  const inicio = new Date(dataInicio);

  // Primeiro dia do mês e quantos dias
  const primeiroDia   = new Date(ano, mes, 1).getDay(); // 0=Dom
  const diasNoMes     = new Date(ano, mes+1, 0).getDate();
  const celulas       = Array.from({ length: primeiroDia + diasNoMes }, (_, i) => i < primeiroDia ? null : i - primeiroDia + 1);
  // Completar para múltiplo de 7
  while (celulas.length % 7 !== 0) celulas.push(null);

  const fmt = d => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <div>
      {/* Cabeçalho dias */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:4 }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:'0.6rem', fontWeight:700,
              color: d==='Dom'?'#8b5cf6':'#334155', padding:'4px 0', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
        ))}
      </div>
      {/* Células */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {celulas.map((dia, i) => {
          if (!dia) return <div key={i}/>;
          const dateStr    = fmt(dia);
          const dataAtual  = new Date(dateStr);
          const isFutura   = dateStr > hoje;
          const isHoje     = dateStr === hoje;
          const concluido  = diasConcluidos[dateStr];
          const dayOfWeek  = dataAtual.getDay(); // 0=Dom
          const ehDomingo2  = dayOfWeek === 0;

          // Dia do ciclo (offset desde início)
          const diffDias   = Math.floor((dataAtual - inicio) / 86400000);
          const diaNoC     = diffDias >= 0 ? diffDias % 30 : -1;
          const ehRMQ      = diaNoC === 29; // último dia do ciclo = dia 30
          const materiasD  = diaNoC >= 0 ? (ciclo30[diaNoC]?.materias || []) : [];

          let bg     = 'rgba(255,255,255,0.02)';
          let borda  = 'rgba(255,255,255,0.06)';
          let textC  = diaNoC >= 0 ? '#94a3b8' : '#1e293b';

          if (concluido)  { bg = 'rgba(16,185,129,0.25)';  borda = '#10b981'; textC = '#6ee7b7'; }
          else if (ehRMQ) { bg = 'rgba(239,68,68,0.15)';   borda = '#ef444440'; }
          else if (ehDomingo2 && diaNoC>=0) { bg = 'rgba(139,92,246,0.12)'; borda = '#8b5cf650'; }
          else if (diaNoC >= 0 && !isFutura) { bg = 'rgba(99,102,241,0.1)'; borda = '#6366f130'; }
          if (isHoje) { borda = '#818cf8'; bg = 'rgba(99,102,241,0.2)'; }

          return (
            <div key={i}
              onClick={() => !isFutura && diaNoC >= 0 && onToggle(dateStr)}
              title={diaNoC>=0 ? `Dia ${diaNoC+1} do ciclo\n${materiasD.map(m=>m.nome).join(', ')}` : undefined}
              style={{ background:bg, border:`1px solid ${borda}`, borderRadius:7, padding:'5px 3px',
                minHeight:52, cursor: (!isFutura && diaNoC>=0) ? 'pointer' : 'default',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
                gap:2, transition:'all 0.12s',
                opacity: isFutura && !isHoje ? 0.45 : 1 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.72rem', fontWeight:700, color: isHoje ? '#818cf8' : textC, lineHeight:1 }}>{dia}</div>
              {diaNoC >= 0 && (
                <div style={{ fontSize:'0.5rem', color: ehDomingo2 ? '#a78bfa' : ehRMQ ? '#f87171' : '#334155',
                    fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {ehRMQ ? 'RMQ' : ehDomingo2 ? 'RSQ' : `D${diaNoC+1}`}
                </div>
              )}
              {/* Pontinhos das matérias */}
              {materiasD.length > 0 && (
                <div style={{ display:'flex', gap:2, flexWrap:'wrap', justifyContent:'center' }}>
                  {materiasD.slice(0,3).map(m => (
                    <div key={m.id} style={{ width:5, height:5, borderRadius:'50%',
                        background: CATEGORIAS[m.cat].color, opacity:0.8 }}/>
                  ))}
                </div>
              )}
              {concluido && <div style={{ fontSize:'0.6rem', color:'#10b981', marginTop:'auto' }}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function calcStreak(diasConcluidos) {
  let streak = 0;
  const hoje = new Date();
  for (let i = 0; i < 365; i++) {
    const d   = new Date(hoje);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (diasConcluidos[key]) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function isDiaConcluido(dataInicio, offsetDias, diasConcluidos) {
  const d = new Date(dataInicio);
  d.setDate(d.getDate() + offsetDias);
  return !!diasConcluidos[d.toISOString().slice(0,10)];
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES UTILITÁRIOS
═══════════════════════════════════════════════════════════════ */
function Card({ title, accent = '#6366f1', headerRight, children }) {
  return (
    <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:3, height:13, background:accent, borderRadius:99 }}/>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.78rem', fontWeight:700, color:'#e2e8f0' }}>{title}</span>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}30`,
        borderRadius:10, padding:'8px 14px', textAlign:'center', minWidth:80 }}>
      <div style={{ fontSize:'1.1rem', lineHeight:1 }}>{icon}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.05rem', fontWeight:700, color, lineHeight:1, marginTop:4 }}>{value}</div>
      <div style={{ fontSize:'0.55rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{label}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
═══════════════════════════════════════════════════════════════ */
const s = {
  hero: {
    background:'linear-gradient(135deg,#111128,#0d0d1e)',
    border:'1px solid rgba(99,102,241,0.15)', borderRadius:14,
    padding:'16px 22px', display:'flex', alignItems:'flex-start',
    gap:18, flexWrap:'wrap',
  },
  heroLabel: { fontSize:'0.58rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color:'#6366f1', marginBottom:4 },
  heroTitle: { fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.35rem', fontWeight:700, color:'#f1f5f9', lineHeight:1.1, marginBottom:4 },
  heroSub:   { fontSize:'0.68rem', color:'#475569' },
  tabs: { display:'flex', gap:6, flexWrap:'wrap' },
  tab: {
    padding:'7px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)',
    background:'rgba(255,255,255,0.03)', color:'#475569',
    fontSize:'0.75rem', fontWeight:600, cursor:'pointer', transition:'all 0.15s',
  },
  tabActive: {
    background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)',
    color:'#818cf8',
  },
  badgeOk: {
    padding:'4px 12px', borderRadius:20, background:'rgba(16,185,129,0.15)',
    border:'1px solid rgba(16,185,129,0.3)', color:'#10b981',
    fontSize:'0.68rem', fontWeight:700,
  },
  badgeOk2: {
    padding:'2px 8px', borderRadius:20, background:'rgba(99,102,241,0.2)',
    border:'1px solid rgba(99,102,241,0.4)', color:'#818cf8',
    fontSize:'0.6rem', fontWeight:700,
  },
  badgeTag: {
    padding:'2px 8px', borderRadius:20,
    fontSize:'0.6rem', fontWeight:700, border:'1px solid',
  },
  btnConcluir: {
    padding:'6px 14px', borderRadius:8, background:'rgba(99,102,241,0.15)',
    border:'1px solid rgba(99,102,241,0.35)', color:'#818cf8',
    fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
  },
  btnReiniciar: {
    marginTop:10, padding:'7px 14px', background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
    color:'#475569', fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
  },
  btnNav: {
    width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.08)', color:'#6366f1',
    fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
  },
};
