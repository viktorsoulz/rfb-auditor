import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout      from './components/Layout';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Tracker     from './pages/Tracker';
import Questoes    from './pages/Questoes';
import Simulados   from './pages/Simulados';
import Flashcards  from './pages/Flashcards';
import Ciclo       from './pages/Ciclo';
import Analise     from './pages/Analise';
import Anotacoes   from './pages/Anotacoes';
import Ferramentas from './pages/Ferramentas';
import Remuneracao from './pages/Remuneracao';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = carregando

  useEffect(() => {
    // Pegar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // Ouvir mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Carregando sessão
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d0d1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: '#475569', fontSize: '0.88rem',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 18, height: 18, border: '2px solid rgba(99,102,241,0.4)',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}/>
          Carregando...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Não logado → tela de login
  if (!session) {
    return <Login />;
  }

  // Logado → app completo
  return (
    <BrowserRouter>
      <Layout session={session}>
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/tracker"       element={<Tracker />} />
          <Route path="/ciclo"         element={<Ciclo />} />
          <Route path="/questoes"      element={<Questoes />} />
          <Route path="/simulados"     element={<Simulados />} />
          <Route path="/flashcards"    element={<Flashcards />} />
          <Route path="/analise"       element={<Analise />} />
          <Route path="/anotacoes"     element={<Anotacoes />} />
          <Route path="/ferramentas"   element={<Ferramentas />} />
          <Route path="/remuneracao"   element={<Remuneracao />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
