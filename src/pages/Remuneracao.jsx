export default function Remuneracao() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#111128,#0d0d1e)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:14, padding:'28px 24px', textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:10 }}>💰</div>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.6rem', fontWeight:700, color:'#f1f5f9', letterSpacing:'0.04em', marginBottom:8 }}>REMUNERAÇÃO</h1>
        <p style={{ color:'#64748b', fontSize:'0.8rem', maxWidth:500, margin:'0 auto' }}>
          Estrutura salarial, progressão e benefícios da Carreira Tributária e Aduaneira da RFB — Edital Nº 1/2022.
        </p>
      </div>

      {/* Cards dos cargos */}
      <SecTitle>Remuneração Inicial — Edital Nº 1/2022</SecTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:16 }}>
        <CargoCard
          cargo="Auditor-Fiscal da Receita Federal do Brasil"
          sigla="AFRFB" salario="R$ 21.029,09" color="#6366f1"
          rows={[
            ['Vagas Totais','230'],['Ampla Concorrência','172'],
            ['Cotas PcD (5%)','12'],['Cotas Negros (20%)','46'],
            ['Escolaridade','Nível Superior'],['Jornada','40h/semana'],
          ]}
        />
        <CargoCard
          cargo="Analista-Tributário da Receita Federal do Brasil"
          sigla="ATRFB" salario="R$ 11.684,39" color="#22d3ee"
          rows={[
            ['Vagas Totais','469'],['Ampla Concorrência','351'],
            ['Cotas PcD (5%)','24'],['Cotas Negros (20%)','94'],
            ['Escolaridade','Nível Superior'],['Jornada','40h/semana'],
          ]}
        />
      </div>

      {/* Benefícios */}
      <SecTitle>Benefícios & Vantagens</SecTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {[
          ['🏥','Plano de Saúde','GEAP — Fundação de Seguridade Social'],
          ['🏠','Auxílio Moradia','Quando não há imóvel funcional disponível'],
          ['🍽️','Auxílio Alimentação','Via cartão de benefícios'],
          ['🚗','Auxílio Transporte','Conforme legislação vigente'],
          ['🎓','Progressão por Capacitação','Incentivo à educação continuada'],
          ['📈','Adicional por Tempo','Adicional por tempo de serviço'],
          ['🔒','Estabilidade','Estabilidade no serviço público federal'],
          ['📅','30 dias de férias','+ 1/3 constitucional sobre as férias'],
        ].map(([icon, titulo, desc]) => (
          <div key={titulo} style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'16px' }}>
            <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{icon}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'#e2e8f0', marginBottom:4 }}>{titulo}</div>
            <div style={{ fontSize:'0.68rem', color:'#475569', lineHeight:1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Estrutura da prova */}
      <SecTitle>Estrutura da Prova Objetiva</SecTitle>
      <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14, marginBottom:16 }}>
          <ProvaItem cargo="AFRFB" questoes={140} aprovMin="50% em Básicos + 50% em Específicos"/>
          <ProvaItem cargo="ATRFB" questoes={120} aprovMin="50% em Básicos + 50% em Específicos"/>
        </div>
        <div style={{ padding:'14px 16px', background:'rgba(245,158,11,0.07)', borderRadius:8, border:'1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#f59e0b', marginBottom:6 }}>⚠️ Critério de Corte</div>
          <div style={{ fontSize:'0.8rem', color:'#94a3b8', lineHeight:1.6 }}>
            Eliminação por nota inferior a 50% em qualquer módulo (Básicos ou Específicos) <strong style={{ color:'#f1f5f9' }}>ou</strong> nota zero em qualquer disciplina.
          </div>
        </div>
      </div>
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:3, height:13, background:'#6366f1', borderRadius:99 }}/>
      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'#e2e8f0', textTransform:'uppercase', letterSpacing:'0.08em' }}>{children}</span>
    </div>
  );
}

function CargoCard({ cargo, sigla, salario, color, rows }) {
  return (
    <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'22px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#334155', marginBottom:4 }}>Cargo</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.9rem', fontWeight:700, color:'#e2e8f0', marginBottom:16, lineHeight:1.3 }}>{cargo}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2rem', fontWeight:700, color, letterSpacing:'0.02em', marginBottom:2 }}>{salario}</div>
      <div style={{ fontSize:'0.65rem', color:'#334155', marginBottom:16 }}>Remuneração inicial (Lei nº 13.464/2017)</div>
      {rows.map(([l, v]) => (
        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderTop:'1px solid rgba(255,255,255,0.05)', fontSize:'0.78rem' }}>
          <span style={{ color:'#64748b' }}>{l}</span>
          <span style={{ color:'#e2e8f0', fontWeight:600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ProvaItem({ cargo, questoes, aprovMin }) {
  return (
    <div style={{ padding:'14px 16px', background:'rgba(255,255,255,0.02)', borderRadius:8, border:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6366f1', marginBottom:4 }}>{cargo}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.5rem', fontWeight:700, color:'#f1f5f9', marginBottom:4 }}>{questoes} questões</div>
      <div style={{ fontSize:'0.72rem', color:'#64748b', lineHeight:1.5 }}>Aprovação: {aprovMin}</div>
    </div>
  );
}
