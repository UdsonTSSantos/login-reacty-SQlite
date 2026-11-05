import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabaseInstance } from '../config/database.js';
import { verificarToken, somenteSuperAdmin } from '../middleware/auth.js';
import type { CustomRequest } from '../middleware/auth.js';
import { provisionarNovaEmpresa } from '../services/empresaService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_segredo_123';

// 🛑 1. ROTA DE LOGIN (Com limite de 3 tentativas e bloqueio temporário)
router.post('/login', async (req: CustomRequest, res: Response) => {
  const { empresa, email, senha } = req.body;

  if (!empresa || !email || !senha) {
    return res.status(400).json({ message: 'Todos os campos (empresa, e-mail e senha) são obrigatórios.' });
  }

  try {
    const db = await getDatabaseInstance(empresa);
    
    // Prepared Statement impede injeção de scripts SQL nocivos
    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // Processa a regra de bloqueio por tentativas excessivas
    if (usuario.tentativas_falhas >= 3) {
      const agora = new Date();
      const bloqueio = usuario.bloqueado_ate ? new Date(usuario.bloqueado_ate) : null;
      
      if (bloqueio && bloqueio > agora) {
        return res.status(403).json({ message: 'Esta conta está temporariamente bloqueada devido a 3 tentativas incorretas. Tente novamente mais tarde.' });
      } else {
        // Libera o contador se o tempo estipulado de castigo já passou
        await db.run('UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?', [usuario.id]);
      }
    }

    // Valida a senha comparando com o hash do banco
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      const novasTentativas = usuario.tentativas_falhas + 1;
      let dataBloqueio = null;

      if (novasTentativas >= 3) {
        // Bloqueia preventivamente a conta no SQLite por 15 minutos
        const data = new Date();
        data.setMinutes(data.getMinutes() + 15);
        dataBloqueio = data.toISOString();
      }

      await db.run(
        'UPDATE usuarios SET tentativas_falhas = ?, bloqueado_ate = ? WHERE id = ?',
        [novasTentativas, dataBloqueio, usuario.id]
      );

      return res.status(401).json({ 
        message: novasTentativas >= 3 
          ? 'Conta temporariamente bloqueada por atingir 3 erros.' 
          : 'Credenciais inválidas.' 
      });
    }

    // Login correto: Limpa qualquer histórico de falhas residuais
    await db.run('UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?', [usuario.id]);

    // Define a flag de Super Admin global baseado no seu e-mail mestre configurado
    const isSuperAdmin = email === 'admin@empresa.com'; 

    // Módulos decodificados do texto puro do SQLite de volta para array manipulável
    const modulosPermitidos = JSON.parse(usuario.modulos || '[]');

    // Gera o Token JWT contendo os metadados e expiração de 15 minutos sincronizada
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, empresa, isSuperAdmin },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({
      token,
      user: {
        nome: usuario.nome_completo,
        email: usuario.email,
        isSuperAdmin,
        primeiroAcesso: usuario.primeiro_acesso === 1,
        modulos: modulosPermitidos
      }
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erro interno ao processar a autenticação.' });
  }
});

// 🧙‍♂️ 2. CRIAÇÃO DE NOVOS LOGINS (Restrito: Apenas o Super Admin autenticado cria usuários)
router.post('/create-user', verificarToken, somenteSuperAdmin, async (req: CustomRequest, res: Response) => {
  const { nomeCompleto, celular, email, senhaProvisoria, modulos } = req.body;
  const empresaLogada = req.usuarioLogado!.empresa;

  if (!nomeCompleto || !celular || !email || !senhaProvisoria) {
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
  }

  // Regex estrito para validação de senha forte (10+ caracteres, 1 Maiúscula, 1 Número, 1 Especial)
  const regexSenha = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
  if (!regexSenha.test(senhaProvisoria)) {
    return res.status(400).json({ message: 'A senha provisória informada não atende aos requisitos mínimos de segurança.' });
  }

  try {
    const db = await getDatabaseInstance(empresaLogada);
    
    // Gera o hash seguro da credencial provisória
    const salt = await bcrypt.genSalt(12);
    const senhaHash = await bcrypt.hash(senhaProvisoria, salt);
    
    const modulosTexto = JSON.stringify(modulos || []);

    // primeiro_acesso definido como 1 força a rotina de reset de senha na tela do React
    await db.run(
      `INSERT INTO usuarios (nome_completo, celular, email, senha_hash, primeiro_acesso, modulos) 
       VALUES (?, ?, ?, ?, 1, ?)`,
      [nomeCompleto, celular, email, senhaHash, modulosTexto]
    );

    return res.status(201).json({ message: 'Usuário cadastrado com sucesso.' });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Este endereço de e-mail já está em uso nesta empresa.' });
    }
    return res.status(500).json({ message: 'Erro crítico ao tentar salvar o usuário.' });
  }
});

// 🔄 3. MUDANÇA OBRIGATÓRIA DE SENHA (Primeiro Acesso)
router.post('/change-password', verificarToken, async (req: CustomRequest, res: Response) => {
  const { novaSenha } = req.body;
  const { id, empresa } = req.usuarioLogado!;

  const regexSenha = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
  if (!regexSenha.test(novaSenha)) {
    return res.status(400).json({ message: 'A nova senha precisa ter no mínimo 10 caracteres, incluindo letras maiúsculas, números e caracteres especiais.' });
  }

  try {
    const db = await getDatabaseInstance(empresa);
    const salt = await bcrypt.genSalt(12);
    const novaSenhaHash = await bcrypt.hash(novaSenha, salt);

    // Atualiza a senha e desmarca o flag de primeiro acesso (liberando a navegação comum)
    await db.run(
      'UPDATE usuarios SET senha_hash = ?, primeiro_acesso = 0 WHERE id = ?',
      [novaSenhaHash, id]
    );

    return res.json({ message: 'Sua senha foi atualizada com sucesso. Seu acesso aos módulos está liberado!' });
  } catch (err) {
    return res.status(500).json({ message: 'Não foi possível registrar a sua nova senha.' });
  }
});

// 🏢 4. PROVISIONAMENTO DE NOVAS EMPRESAS (Apenas o Super Admin cria bancos de dados independentes)
router.post('/provisionar-empresa', verificarToken, somenteSuperAdmin, async (req: CustomRequest, res: Response) => {
  const { empresaId, nomeAdmin, celularAdmin, emailAdmin, senhaProvisoria } = req.body;

  if (!empresaId || !nomeAdmin || !celularAdmin || !emailAdmin || !senhaProvisoria) {
    return res.status(400).json({ message: 'Todos os parâmetros são necessários para estruturar uma nova empresa.' });
  }

  try {
    const resultado = await provisionarNovaEmpresa({
      empresaId,
      nomeAdmin,
      celularAdmin,
      emailAdmin,
      senhaProvisoria
    });

    return res.status(201).json(resultado);
  } catch (err: any) {
    return res.status(500).json({ 
      message: err.message || 'Houve um erro interno ao criar a infraestrutura isolada da empresa.' 
    });
  }
});

export default router;
