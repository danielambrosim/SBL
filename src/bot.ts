import TelegramBot, { Message, ParseMode  } from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { atualizarStatusUsuarioNoBanco } from './db'; // ajuste o caminho
import { Usuario } from './db'; // Ajuste o caminho para onde a interface está
import { buscarUsuariosNoBanco } from './db'; // Ajuste o caminho conforme sua estrutura
import fs from 'fs';
import path from 'path';

// 1. Carregando variáveis do arquivo .env (sempre no topo)
dotenv.config();

// 2. Sessões globais (usadas para acompanhar o progresso de cada usuário nos fluxos)
export const userSessions = new Map<number, any>();
export const loggedInUsers = new Map<number, number>();


// 3. Importando os handlers dos fluxos
import { HandlersCadastro } from './handlers/cadastro';
import { HandlersLogin, loginSessions } from './handlers/login';
import { HandlersStatus } from './handlers/status';
import { HandlersAdicionais } from './handlers/adicionais';
import { listarSites, atualizarStatusUsuariosNovosSites } from './db';
import { pool as connection } from './db';

// Importando serviços para enviar os dados do cadastros para os sites de leilões
import { exportarUsuariosParaCSV } from './utils/exportarUsuarios';

import express from "express";
import adminRouter from "./routes/admin";

const app = express(); // 1º - Cria a instância

app.use(express.json()); // 2º - Configura middlewares

// 3º - Usa as rotas
app.use("/api/admin", adminRouter);

// Se precisar de outras rotas, adicione aqui

// 4º - Starta o servidor
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});


import usuariosRouter from "./api/admin/usuarios";
app.use(express.json());
app.use("/api/admin/usuarios", usuariosRouter);
app.listen(3000, () => console.log("Servidor rodando!"));

// 4. Inicializando o bot com o token do .env
const token = process.env.TELEGRAM_TOKEN;
if (!token) throw new Error('TELEGRAM_TOKEN não definido no .env');
export const bot = new TelegramBot(token, { polling: true });

// 5. Sincroniza status de usuários/sites ao iniciar (garante que todo usuário está vinculado a todo site)
(async () => {
  await atualizarStatusUsuariosNovosSites();
  console.log('Status sincronizado com todos os sites de leilão ao iniciar o bot!');
})();

// 6. ID do admin para comandos restritos (puxado do .env)
export const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

// 7. Comando secreto /syncsites (só admin pode usar para garantir que todo usuário tem status em todo site)
bot.onText(/\/syncsites/, async (msg) => {
  if (msg.chat.id !== ADMIN_CHAT_ID) {
    await bot.sendMessage(msg.chat.id, 'Acesso negado.');
    return;
  }
  await atualizarStatusUsuariosNovosSites();
  await bot.sendMessage(msg.chat.id, 'Sincronização de status concluída!');
});

// Comando admin /exportarusuarios
bot.onText(/\/exportarusuarios/, async (msg) => {
  if (msg.chat.id !== ADMIN_CHAT_ID) return bot.sendMessage(msg.chat.id, 'Acesso negado.');
  const path = await exportarUsuariosParaCSV();
  await bot.sendDocument(msg.chat.id, path, {}, { filename: 'usuarios_leilao.csv' });
});

// 8. Menu principal do bot (teclado Telegram)
// Isso é o que aparece para o usuário, nunca muda sem mexer aqui!
export const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '📝 Cadastro' }, { text: '🔑 Login' }],
      [{ text: '📋 Editais' }, { text: '📊 Meu Status' }],
      [{ text: 'ℹ️ Ajuda' }, { text: '🚪 Logout' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// 9. Objeto de handlers (cada texto do botão chama um fluxo/handler)
const COMANDOS_MENU: { [key: string]: (chatId: number) => Promise<any> } = {
  '📝 Cadastro': HandlersCadastro.iniciar,
  '🔑 Login': HandlersLogin.iniciar,
  '📋 Editais': HandlersAdicionais.listarSitesParaBusca, // Mostra os sites como botões inline
  '📊 Meu Status': HandlersStatus.consultar,
  'ℹ️ Ajuda': HandlersAdicionais.ajuda,
  '🚪 Logout': async (chatId: number) => {
    if (loggedInUsers.has(chatId)) {
      loggedInUsers.delete(chatId);
      await bot.sendMessage(chatId, '✅ Você foi deslogado.', mainMenu);
    } else {
      await bot.sendMessage(chatId, 'ℹ️ Você não estava logado.', mainMenu);
    }
  }
};

// 10. Handler de botões INLINE (callback_query) — usado para buscar editais ao clicar em um site
function listarEditaisDiretoDaPasta(site?: string): { nome: string; url: string }[] {
  const basePath = site
    ? path.join(__dirname, 'pdfs', site)
    : path.join(__dirname, 'pdfs');
  if (!fs.existsSync(basePath)) return [];
  return fs.readdirSync(basePath)
    .filter(file => file.endsWith('.pdf'))
    .map(file => ({
      nome: file,
      url: site ? `/pdfs/${site}/${file}` : `/pdfs/${file}`,
    }));
}

// Handler único:
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId || !data) {
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // --- Clique em um site ---
  if (data.startsWith('site_')) {
    const site = data.replace('site_', '');
    const editais = listarEditaisDiretoDaPasta(site);

    if (!editais.length) {
      await bot.sendMessage(chatId, 'Nenhum edital disponível para este site.');
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Gera botões para cada edital do site
    const keyboard = editais.map(e => ([{
      text: e.nome,
      callback_data: `pdf_${site}_${encodeURIComponent(e.nome)}`
    }]));

    await bot.sendMessage(
      chatId,
      `*Editais disponíveis para o site ${site}:*`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // --- Clique no PDF ---
  if (data.startsWith('pdf_')) {
    // Exemplo: pdf_nomeSite_nomeDoArquivo.pdf
    const regex = /^pdf_([^_]+)_(.+)$/;
    const match = data.match(regex);
    if (!match) {
      await bot.sendMessage(chatId, 'Parâmetro inválido.');
      await bot.answerCallbackQuery(query.id);
      return;
    }
    const site = match[1];
    const arquivo = decodeURIComponent(match[2]);
    const pdfPath = path.join(__dirname, 'pdfs', site, arquivo);

    if (fs.existsSync(pdfPath)) {
      await bot.sendDocument(chatId, pdfPath, { caption: arquivo });
    } else {
      await bot.sendMessage(chatId, 'PDF não encontrado.');
    }
    await bot.answerCallbackQuery(query.id);
    return;
  }

  await bot.answerCallbackQuery(query.id);
});

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId || !data) {
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Botão de status (admin)
  if (data.includes(':')) {
    const [acao, userIdStr, novoStatus] = data.split(':');
    if (acao === 'status') {
      if (chatId !== Number(process.env.ADMIN_CHAT_ID)) {
        await bot.answerCallbackQuery(query.id, { text: 'Acesso negado', show_alert: true });
        return;
      }
      const userId = Number(userIdStr);
      try {
        await atualizarStatusUsuarioNoBanco(userId, novoStatus as 'ativo' | 'pendente' | 'recusado');
        await bot.sendMessage(chatId, `Status do usuário ${userId} atualizado para: ${novoStatus}`);
      } catch {
        await bot.sendMessage(chatId, 'Erro ao atualizar status do usuário.');
      }
      await bot.answerCallbackQuery(query.id);
      return;
    }
  }

  // Seleção de usuário (admin)
  if (data.startsWith('usuario_')) {
    if (chatId !== Number(process.env.ADMIN_CHAT_ID)) {
      await bot.answerCallbackQuery(query.id, { text: 'Acesso negado', show_alert: true });
      return;
    }
    const userId = Number(data.split('_')[1]);
    const usuarios = await buscarUsuariosNoBanco();
    const usuario = usuarios.find(u => u.id === userId);

    if (!usuario) {
      await bot.sendMessage(chatId, "Usuário não encontrado.");
      await bot.answerCallbackQuery(query.id);
      return;
    }

    const detalhes = `
👤 *Detalhes do usuário:*

Nome: ${usuario.nome}
Email: ${usuario.email}
CPF: ${usuario.cpf}
Endereço: ${usuario.endereco}
Status: (coloque o status que quiser)
    `;

    await bot.sendMessage(chatId, detalhes, { parse_mode: 'Markdown' });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Seleção de site para mostrar editais
  if (data.startsWith('edital_')) {
    const siteId = Number(data.replace('edital_', ''));
    const sites = await listarSites();
    const site = sites.find(s => s.id === siteId);

    if (!site) {
      await bot.sendMessage(chatId, 'Site de leilão não encontrado.');
      await bot.answerCallbackQuery(query.id);
      return;
    }

    await bot.sendMessage(chatId, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });

    // Busca do banco (não do scraping) -- ajustar para filtrar por site se desejar!
    const editais = listarEditaisDiretoDaPasta(site.nome);

    if (!editais.length) {
      await bot.sendMessage(chatId, 'Nenhum edital encontrado neste site.');
      await bot.answerCallbackQuery(query.id);
      return;
    }

    let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
    for (const edital of editais) {
    mensagem += `• ${edital.nome}\n`;
  }
    await bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Botão de ajuda (exemplo)
  if (data.startsWith('ajuda_')) {
    const topic = data.replace('ajuda_', '');
    await HandlersAdicionais.processarAjudaCallback(chatId, topic);
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Responde qualquer outro callback para não travar
  await bot.answerCallbackQuery(query.id);
});


// 14. Confirma início do bot no console do servidor
console.log('🤖 Bot iniciado!');
