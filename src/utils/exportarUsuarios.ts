// src/utils/exportarUsuarios.ts
import { pool } from '../db';
import fs from 'fs';
import path from 'path';

export async function exportarUsuariosParaCSV(): Promise<string> {
  const [rows]: any = await pool.query('SELECT * FROM usuarios');
  if (!rows || !rows.length) throw new Error('Nenhum usuário encontrado.');

  const header = Object.keys(rows[0]).join(';');
  const lines = rows.map((row: any) => Object.values(row).join(';'));
  const csvContent = [header, ...lines].join('\n');

  const exportPath = path.join(__dirname, '../../usuarios_leilao.csv');
  fs.writeFileSync(exportPath, csvContent, { encoding: 'utf8' });

  return exportPath;
}