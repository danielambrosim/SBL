import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';


dotenv.config();

// --- CONEXÃO ---
export const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'sbl_v2',
  port: Number(process.env.DATABASE_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- TIPOS ---
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

export interface SiteLeilao {
  id: number;
  nome: string;
  url: string;
  seletor: string;
}

export interface StatusSiteUsuario {
  id: number;
  usuario_id: number;
  site_id: number;
  status: 'pendente' | 'ativo' | 'recusado';
  atualizado_em: Date;
}

export type Edital = { titulo: string; link: string; data?: string };

// --- USUÁRIOS ---
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
  const [rows]: any = await pool.execute(
    'SELECT * FROM usuarios WHERE email = ?', [email]
  );
  return rows[0] || null;
}

export async function buscarUsuarioPorChatId(chat_id: number): Promise<Usuario | null> {
  const [rows]: any = await pool.execute(
    'SELECT * FROM usuarios WHERE chat_id = ?', [chat_id]
  );
  return rows[0] || null;
}

export async function usuarioExistePorChatId(chat_id: number): Promise<boolean> {
  return !!(await buscarUsuarioPorChatId(chat_id));
}

// --- SITES DE LEILÃO E STATUS ---
export async function listarSites(): Promise<SiteLeilao[]> {
  const [rows]: any = await pool.query('SELECT * FROM sites_leilao');
  return rows;
}

export async function listarStatusUsuarioPorSite(usuario_id: number): Promise<StatusSiteUsuario[]> {
  const [rows]: any = await pool.execute(
    'SELECT * FROM status_site_usuario WHERE usuario_id = ?', [usuario_id]
  );
  return rows;
}

export async function salvarStatusSiteUsuario(usuario_id: number, site_id: number, status: string) {
  await pool.execute(
    `INSERT INTO status_site_usuario (usuario_id, site_id, status) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), atualizado_em = CURRENT_TIMESTAMP`,
    [usuario_id, site_id, status]
  );
}

export async function atualizarStatusUsuariosNovosSites() {
  await pool.execute(`
    INSERT INTO status_site_usuario (usuario_id, site_id, status)
    SELECT u.id, s.id, 'pendente'
    FROM usuarios u
    CROSS JOIN sites_leilao s
    LEFT JOIN status_site_usuario su ON su.usuario_id = u.id AND su.site_id = s.id
    WHERE su.id IS NULL;
  `);
}

// --- EDITAIS ---
export async function buscarEditaisBanco(qtd: number = 5): Promise<Edital[]> {
  const [rows] = await pool.query(
    'SELECT titulo, url_pdf as link, data_publicacao as data FROM editais ORDER BY data_publicacao DESC LIMIT ?', [qtd]
  ) as [any[], any];
  return rows;
}

export async function buscarEditalPorLink(link: string) {
  const [rows]: any = await pool.execute(
    'SELECT * FROM editais WHERE url_pdf = ? LIMIT 1', [link]
  );
  return rows[0] || null;
}

export async function inserirEdital(edital: { titulo: string; link: string; data?: string; }) {
  await pool.execute(
    'INSERT INTO editais (titulo, url_pdf, data_publicacao) VALUES (?, ?, ?)',
    [edital.titulo, edital.link, edital.data ?? null]
  );
}




export async function buscarUsuariosPainelAdmin() {
  const [usuarios] = await pool.query("SELECT * FROM usuarios") as [any[], any];
  const [statusRows] = await pool.query(`
    SELECT su.usuario_id, su.site_id, su.status, s.nome 
    FROM status_site_usuario su 
    JOIN sites_leilao s ON su.site_id = s.id
  `) as [any[], any];

  return usuarios.map(u => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    cpf: u.cpf,
    endereco: u.endereco,
    sites: statusRows
      .filter(s => s.usuario_id === u.id)
      .map(s => ({
        id: s.site_id,
        nome: s.nome,
        status: s.status
      }))
  }));
}


export async function atualizarStatusUsuarioNoBanco(usuarioId: number, status: 'ativo' | 'pendente' | 'recusado') {
  const sql = `UPDATE status_site_usuario SET status = ? WHERE usuario_id = ?`;
  await pool.execute(sql, [status, usuarioId]);
}

export async function buscarUsuariosNoBanco(): Promise<Usuario[]> {
  const [rows] = await pool.query('SELECT * FROM usuarios');
  return rows as Usuario[];
}


// --- OPCIONAL: CONEXÃO DIRETA ---
export const connectionPromise = mysql.createConnection({ /* use apenas se realmente precisar */ });
