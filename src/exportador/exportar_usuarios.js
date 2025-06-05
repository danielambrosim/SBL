require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Use as configs do seu db.ts, ou copie daqui se preferir
const connection = mysql.createPool({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function exportarUsuarios() {
  try {
    const [rows] = await connection.query(`
      SELECT nome, email, senha, endereco, cpf, cnpj, documentos, comprovantes FROM usuarios
    `);

    // Gera CSV
    const csvHeader = Object.keys(rows[0]).join(',') + '\n';
    const csvData = rows.map(obj => Object.values(obj).map(val => val ?? '').join(',')).join('\n');
    fs.writeFileSync(path.join(__dirname, 'usuarios_exportados.csv'), csvHeader + csvData);

    // Gera TXT (tabulado)
    const txtHeader = Object.keys(rows[0]).join('\t') + '\n';
    const txtData = rows.map(obj => Object.values(obj).map(val => val ?? '').join('\t')).join('\n');
    fs.writeFileSync(path.join(__dirname, 'usuarios_exportados.txt'), txtHeader + txtData);

    console.log('Exportação concluída!');
  } catch (err) {
    console.error('Erro ao exportar usuários:', err);
  } finally {
    connection.end();
  }
}

exportarUsuarios();
