import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

// Armazena conexões ativas na memória para não reabrir arquivos toda hora
const conexoes: { [key: string]: Database } = {};

export async function getDatabaseInstance(empresaId: string): Promise<Database> {
  const sanitizedId = empresaId.replace(/[^a-zA-Z0-9_]/g, ''); // Proteção de caminho de arquivo
  
  if (conexoes[sanitizedId]) {
    return conexoes[sanitizedId];
  }

  const dbPath = path.resolve(__dirname, `../../databases/${sanitizedId}.sqlite`);
  
  // Cria a pasta de bancos se não existir
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Estrutura inicial do banco caso seja uma nova empresa
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_completo TEXT NOT NULL,
      celular TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      primeiro_acesso INTEGER DEFAULT 1,
      tentativas_falhas INTEGER DEFAULT 0,
      bloqueado_ate TEXT,
      modulos TEXT
    )
  `);

  conexoes[sanitizedId] = db;
  return db;
}
