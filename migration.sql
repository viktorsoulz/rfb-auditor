-- ═══════════════════════════════════════════════════
-- RFB Auditor — Migration Supabase
-- Cole isso no SQL Editor do Supabase e clique RUN
-- ═══════════════════════════════════════════════════

-- Tabela principal: cada store do app vira uma linha
CREATE TABLE IF NOT EXISTS public.user_data (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key         text NOT NULL,
  value       jsonb,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, key)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_key     ON public.user_data(key);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════
-- RLS (Row Level Security) — cada usuário só vê seus dados
-- ═══════════════════════════════════════════════════
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Usuário só lê seus próprios dados
CREATE POLICY "users_select_own" ON public.user_data
  FOR SELECT USING (auth.uid() = user_id);

-- Usuário só insere para si mesmo
CREATE POLICY "users_insert_own" ON public.user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuário só atualiza seus próprios dados
CREATE POLICY "users_update_own" ON public.user_data
  FOR UPDATE USING (auth.uid() = user_id);

-- Usuário só deleta seus próprios dados
CREATE POLICY "users_delete_own" ON public.user_data
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════
-- Tabela de perfis (nome de exibição)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      text,
  nome       text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_upsert_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Cria perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
