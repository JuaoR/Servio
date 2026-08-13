export function mapSupabaseError(error: any): string {
  if (!error) return 'Erro desconhecido';
  const msg = error.message || '';
  const code = error.code || '';
  // Erros personalizados das RPCs
  if (msg.includes('Já existe um caixa aberto')) return 'Já existe um caixa aberto para este restaurante. Feche-o antes de abrir um novo.';
  if (msg.includes('Apenas administradores podem abrir')) return 'Apenas administradores podem abrir o caixa.';
  if (msg.includes('Apenas administradores podem fechar')) return 'Apenas administradores podem fechar o caixa.';
  if (msg.includes('Perfil do usuário não encontrado')) return 'Perfil não encontrado. Tente fazer logout e login novamente.';
  if (msg.includes('O caixa não está aberto')) return 'O caixa não está aberto no momento.';
  if (msg.includes('Sessão de caixa não encontrada')) return 'Sessão de caixa não encontrada no banco.';
  if (msg.includes('Acesso negado')) return 'Acesso negado: operação não permitida.';
  // Erros do PostgreSQL
  if (code === '23505') return 'Registro duplicado — este item já existe.';
  if (code === '23503') return 'Referência inválida — item relacionado não encontrado.';
  if (code === '42501') return 'Permissão negada pelo banco de dados (RLS).';
  if (code === 'PGRST301') return 'Sessão expirada. Faça login novamente.';
  // Genérico
  return msg || 'Erro ao comunicar com o servidor.';
}
