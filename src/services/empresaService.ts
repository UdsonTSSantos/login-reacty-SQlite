import bcrypt from 'bcrypt';
import { getDatabaseInstance } from '../config/database.js';

// Definição da interface de dados necessários para o provisionamento
interface CriarEmpresaDTO {
  empresaId: string;        // Ex: "empresa_abc", "loja_filial_2" (será o nome do arquivo .sqlite)
  nomeAdmin: string;        // Nome completo do administrador master da empresa
  celularAdmin: string;     // Celular de contato
  emailAdmin: string;       // E-mail que servirá de login
  senhaProvisoria: string;  // Senha padrão inicial (deve cumprir os requisitos de 10 dígitos)
}

/**
 * Cria a infraestrutura isolada (Banco de Dados SQLite separado) para uma nova empresa
 * e insere o seu primeiro usuário administrador com privilégios totais de módulos.
 */
export async function provisionarNovaEmpresa({
  empresaId,
  nomeAdmin,
  celularAdmin,
  emailAdmin,
  senhaProvisoria
}: CriarEmpresaDTO) {
  
  // 1. Sanitização estrita do ID para evitar Path Traversal (tentativa de criar arquivos fora da pasta databases/)
  const sanitizedId = empresaId.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!sanitizedId) {
    throw new Error('O identificador da empresa é inválido ou contém caracteres não permitidos.');
  }

  // 2. Validação da regra estrita de força de senha no provisionamento (10+ caracteres, Maiúscula, Número, Especial)
  const regexSenha = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
  if (!regexSenha.test(senhaProvisoria)) {
    throw new Error('A senha provisória padrão informada para o administrador não cumpre os requisitos mínimos de segurança.');
  }

  // 3. Inicializa e abre o banco de dados dinamicamente 
  // (Isso cria o arquivo fisico '.sqlite' e executa as queries de criação de tabelas automáticas do config/database)
  const db = await getDatabaseInstance(sanitizedId);

  // 4. Verifica se o e-mail Admin já existe na base desta empresa (Garante integridade e evita duplicidade)
  const usuarioExistente = await db.get('SELECT id FROM usuarios WHERE email = ?', [emailAdmin]);
  if (usuarioExistente) {
    throw new Error('O endereço de e-mail informado já está em uso nesta empresa.');
  }

  // 5. Criptografa a credencial temporária usando bcrypt com salting de 12 fatores
  const salt = await bcrypt.genSalt(12);
  const senhaHash = await bcrypt.hash(senhaProvisoria, salt);

  // 6. Define que o Administrador mestre da empresa inicia com acesso padrão liberado a todos os módulos do ecossistema
  const modulosIniciais = JSON.stringify(['Financeiro', 'Estoque', 'Vendas', 'RH', 'Suporte']);

  // 7. Insere o Administrador Master na base isolada
  // primeiro_acesso = 1 obriga a rotina de reset obrigatório de senha ao conectar via React pela primeira vez
  await db.run(
    `INSERT INTO usuarios (nome_completo, celular, email, senha_hash, primeiro_acesso, tentativas_falhas, modulos) 
     VALUES (?, ?, ?, ?, 1, 0, ?)`,
    [nomeAdmin, celularAdmin, emailAdmin, senhaHash, modulosIniciais]
  );

  return {
    success: true,
    message: `A infraestrutura e o banco de dados da empresa '${sanitizedId}' foram estruturados e criados com sucesso!`,
    arquivoGerado: `databases/${sanitizedId}.sqlite`
  };
}
