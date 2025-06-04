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
// Importando serviços para busca de editais e sites do banco
import { listarEditais as listarEditaisService } from './services/edital';
import { listarEditais } from './services/edital'; // ajuste o caminho
import type { Edital } from './services/edital'; // ou o caminho do seu arquivo de tipos
import type { Edital } from '../types/edital';
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
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (data?.startsWith('edital_')) {
    const siteId = Number(data.replace('edital_', ''));
    const sites = await listarSites();
    const site = sites.find(s => s.id === siteId);

    if (!site) {
      await bot.sendMessage(chatId!, 'Site de leilão não encontrado.');
      return;
    }

    await bot.sendMessage(chatId!, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });

    // Busca do banco (não do scraping) -- ajustar para filtrar por site se desejar!
    const editais = await listarEditaisService(10);

    if (!editais.length) {
      await bot.sendMessage(chatId!, 'Nenhum edital encontrado neste site.');
      return;
    }

    // Monta mensagem com os links dos editais encontrados
    let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
    for (const edital of editais) {
      mensagem += `• [${edital.titulo}](${edital.id})\n`;
    }
    await bot.sendMessage(chatId!, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
  }

  if (query.id) {
    await bot.answerCallbackQuery(query.id);
  }
});
// --- Handler para o comando /editais ---
bot.onText(/\/editais/, async (msg) => {
  const chatId = msg.chat.id;
  const editais: Edital[] = await listarEditais();

  if (!editais.length) {
    await bot.sendMessage(chatId, 'Nenhum edital disponível no momento.');
    return;
  }

  const keyboard = editais.map((edital: Edital) => ([{
    text: edital.titulo,
    callback_data: `pdfedital_${edital.id}`
  }]));

  await bot.sendMessage(chatId, '📑 *Editais disponíveis:*\nClique para receber o PDF:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
});


// --- Handler ÚNICO para todos os botões INLINE ---
bot.on('callback_query', async (query) => {
  if (!query.data) return;
  const chatId = query.message?.chat.id;
  const data = query.data;

  // Envia PDF do edital
  if (data.startsWith('pdfedital_')) {
    const editalId = Number(data.replace('pdfedital_', ''));
    const editais = await listarEditais();
    const edital = editais.find(e => e.id === editalId);

    if (!edital) {
      await bot.sendMessage(chatId!, 'Edital não encontrado.');
      await bot.answerCallbackQuery(query.id);
      return;
    }

    const pdfPath = path.join(__dirname, edital.url_pdf);

    if (fs.existsSync(pdfPath)) {
      await bot.sendDocument(chatId!, pdfPath, { caption: edital.titulo });
    } else {
      await bot.sendMessage(chatId!, 'PDF não encontrado.');
    }
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
        await bot.sendMessage(chatId!, `Status do usuário ${userId} atualizado para: ${novoStatus}`);
        await bot.answerCallbackQuery(query.id);
      } catch {
        await bot.sendMessage(chatId!, 'Erro ao atualizar status do usuário.');
        await bot.answerCallbackQuery(query.id);
      }
      return;
    }
  }

  // Seleção de usuário (admin)
  if (data.startsWith('usuario_')) {
    if (chatId !== Number(process.env.ADMIN_CHAT_ID)) return; // só admin pode acessar

    const userId = Number(data.split('_')[1]);
    const usuarios = await buscarUsuariosNoBanco();
    const usuario = usuarios.find(u => u.id === userId);

    if (!usuario) {
      await bot.sendMessage(chatId!, "Usuário não encontrado.");
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

    await bot.sendMessage(chatId!, detalhes, { parse_mode: 'Markdown' });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Seleção de site para mostrar editais
  if (data.startsWith('edital_')) {
    const siteId = Number(data.replace('edital_', ''));
    const sites = await listarSites();
    const site = sites.find(s => s.id === siteId);

    if (!site) {
      await bot.sendMessage(chatId!, 'Site de leilão não encontrado.');
      await bot.answerCallbackQuery(query.id);
      return;
    }

    await bot.sendMessage(chatId!, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });

    // Busca do banco (não do scraping) -- ajustar para filtrar por site se desejar!
    const editais = await listarEditaisService(10);

    if (!editais.length) {
      await bot.sendMessage(chatId!, 'Nenhum edital encontrado neste site.');
      await bot.answerCallbackQuery(query.id);
      return;
    }

    let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
    for (const edital of editais) {
      mensagem += `• ${edital.titulo}\n`;
    }
    await bot.sendMessage(chatId!, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Botão de ajuda (exemplo)
  if (data.startsWith('ajuda_')) {
    const topic = data.replace('ajuda_', '');
    await HandlersAdicionais.processarAjudaCallback(chatId!, topic);
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Responde qualquer outro callback para não travar
  await bot.answerCallbackQuery(query.id);
});

// 14. Confirma início do bot no console do servidor
console.log('🤖 Bot iniciado!');
