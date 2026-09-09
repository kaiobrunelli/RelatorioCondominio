/**
 * URL e chave pública (anon) do projeto Supabase. A anon key não é secreta — ela só
 * abre acesso ao que as políticas de RLS permitirem (aqui, apenas para sessões autenticadas).
 * Sem uma sessão válida, qualquer chamada às tabelas é bloqueada pelo Postgres.
 */
export const SUPABASE_URL = 'https://gufmoutiybfmatfuigcq.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_EMnDtz9JrtiHJcwdps_NLQ__X8fi2BQ';

/** Domínio fictício usado para transformar o "login" simples em e-mail do Supabase Auth. */
export const AUTH_EMAIL_DOMAIN = 'admin.com';
