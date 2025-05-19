import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';


dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'sistema_bot_leilao',
  port: Number(process.env.DATABASE_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Interface para usuário (ou use do types/usuario.ts se preferir)
export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  cpf: string;
  cnpj?: string;
  senha: string;
  endereco: string;
  chat_id: number;
  imagem_doc_id?: string;
  comprovante_residencia_id?: string;
  criado_em?: Date;
}

// Interface site (ou use do types/site.ts)
export interface SiteLeilao {
  id: number;
  nome: string;
  url: string;
  seletor: string;
}

// Interface status do usuário por site (ou use types/status.ts)
export interface StatusSiteUsuario {
  id: number;
  usuario_id: number;
  site_id: number;
  status: 'pendente' | 'ativo' | 'recusado';
  atualizado_em: Date;
}

// Funções básicas para uso nos handlers
export async function salvarUsuario(usuario: Usuario): Promise<number> {
  const sql = `INSERT INTO usuarios
    (nome, email, cpf, cnpj, senha, endereco, chat_id, imagem_doc_id, comprovante_residencia_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const [result]: any = await pool.execute(sql, [
    usuario.nome,
    usuario.email,
    usuario.cpf,
    usuario.cnpj ?? null,
    await bcrypt.hash(usuario.senha, 10),
    usuario.endereco,
    usuario.chat_id,
    usuario.imagem_doc_id ?? null,
    usuario.comprovante_residencia_id ?? null
  ]);
  return result.insertId;
}

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const sql = `SELECT * FROM usuarios WHERE email = ?`;
  const [rows]: any = await pool.execute(sql, [email]);
  return rows[0] || null;
}

export async function buscarUsuarioPorChatId(chat_id: number): Promise<Usuario | null> {
  const sql = `SELECT * FROM usuarios WHERE chat_id = ?`;
  const [rows]: any = await pool.execute(sql, [chat_id]);
  return rows[0] || null;
}

export async function listarSites(): Promise<SiteLeilao[]> {
  const sql = 'SELECT * FROM sites_leilao';
  const [rows]: any = await pool.query(sql);
  return rows;
}

export async function listarStatusUsuarioPorSite(usuario_id: number): Promise<StatusSiteUsuario[]> {
  const sql = `SELECT * FROM status_site_usuario WHERE usuario_id = ?`;
  const [rows]: any = await pool.execute(sql, [usuario_id]);
  return rows;
}

export async function salvarStatusSiteUsuario(usuario_id: number, site_id: number, status: string) {
  const sql = `INSERT INTO status_site_usuario (usuario_id, site_id, status) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), atualizado_em = CURRENT_TIMESTAMP`;
  await pool.execute(sql, [usuario_id, site_id, status]);
}

export async function atualizarStatusUsuariosNovosSites() {
  const sql = `
    INSERT INTO status_site_usuario (usuario_id, site_id, status)
    SELECT u.id, s.id, 'pendente'
    FROM usuarios u
    CROSS JOIN sites_leilao s
    LEFT JOIN status_site_usuario su ON su.usuario_id = u.id AND su.site_id = s.id
    WHERE su.id IS NULL;
  `;
  await pool.execute(sql);
}

export const connectionPromise = mysql.createConnection({ /* ... */ });


// Função para buscar o edital mais recente do banco:
type Edital = { titulo: string; link: string; };

export async function buscarEditaisBanco(qtd: number = 5): Promise<{ titulo: string, link: string }[]> {
  const [rows] = await pool.query(
    'SELECT titulo, url_pdf as link FROM editais ORDER BY data_publicacao DESC LIMIT ?', [qtd]
  ) as [any[], any];
  return rows;
}