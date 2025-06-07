import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { atualizarStatusUsuarioNoBanco, buscarUsuariosNoBanco } from './db';
import { HandlersCadastro } from './handlers/cadastro';
import { HandlersLogin } from './handlers/login';
import { HandlersStatus } from './handlers/status';
import { HandlersAdicionais } from './handlers/adicionais';
import { HandlersEditais } from './handlers/editais';
import { HandlersAdmin } from './handlers/admin';
import { atualizarStatusUsuariosNovosSites } from './db';
import { exportarUsuariosParaCSV } from './utils/exportarUsuarios';
import express from "express";
import adminCadastrarRouter from './routes/adminCadastrar';
import adminRouter from "./routes/admin";
import usuariosRouter from "./api/admin/usuarios";
import path from "path";


// 1. Variáveis de ambiente
dotenv.config();

// 2. Sessões globais
export const userSessions = new Map<number, any>();
export const loggedInUsers = new Map<number, number>();

// 3. Express
const app = express();
app.use(express.json());
app.use("/api/admin", adminRouter);
app.use("/admin/usuarios", adminCadastrarRouter);
app.use("/api/admin/usuarios", usuariosRouter);
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.listen(3000, () => console.log("Servidor rodando!"));

// 4. Telegram bot
const token = process.env.TELEGRAM_TOKEN;
if (!token) throw new Error('TELEGRAM_TOKEN não definido no .env');
export const bot = new TelegramBot(token, { polling: true });

// 5. Sincroniza status
(async () => {
  await atualizarStatusUsuariosNovosSites();
  console.log('Status sincronizado com todos os sites de leilão ao iniciar o bot!');
})();

export const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

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

// Função utilitária para mostrar o menu
function enviarMenu(chatId: number) {
  bot.sendMessage(chatId, 'Selecione uma opção no menu abaixo 👇', mainMenu);
}

// Menu de comandos
const COMANDOS_MENU: { [key: string]: (chatId: number) => Promise<any> } = {
  '📝 Cadastro': HandlersCadastro.iniciar,
  '🔑 Login': HandlersLogin.iniciar,
  '📋 Editais': (chatId: number) => HandlersEditais.listarEditais(chatId, bot),
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

// Comandos admin
bot.onText(/\/syncsites/, async (msg) => {
  if (msg.chat.id !== ADMIN_CHAT_ID) return bot.sendMessage(msg.chat.id, 'Acesso negado.');
  await atualizarStatusUsuariosNovosSites();
  await bot.sendMessage(msg.chat.id, 'Sincronização de status concluída!');
});
bot.onText(/\/exportarusuarios/, async (msg) => {
  if (msg.chat.id !== ADMIN_CHAT_ID) return bot.sendMessage(msg.chat.id, 'Acesso negado.');
  const filePath = await exportarUsuariosParaCSV();
  await bot.sendDocument(msg.chat.id, filePath, {}, { filename: 'usuarios_leilao.csv' });
});

// Handler de callback_query
bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message?.chat.id;
    const data = query.data;
    if (!chatId || !data) return await bot.answerCallbackQuery(query.id);

    // Editais por site
    if (data.startsWith('edital_')) {
      const siteId = Number(data.replace('edital_', ''));
      await HandlersEditais.listarEditaisPorSite(chatId, siteId, bot);
      return await bot.answerCallbackQuery(query.id);
    }

    // Admin: mudar status de usuário
      if (data.includes(':')) {
      const [acao, userIdStr, novoStatus] = data.split(':');
      if (acao === 'status' && chatId === ADMIN_CHAT_ID) {
        await HandlersAdmin.atualizarStatusUsuario(chatId, Number(userIdStr), novoStatus as any, bot);
        await bot.answerCallbackQuery(query.id);
        return;
      }
    }

    // Admin: detalhes do usuário
    if (data.startsWith('usuario_') && chatId === ADMIN_CHAT_ID) {
      const userId = Number(data.split('_')[1]);
      await HandlersAdmin.mostrarDetalhesUsuario(chatId, userId, bot);
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Botão de ajuda
    if (data.startsWith('ajuda_')) {
      const topic = data.replace('ajuda_', '');
      await HandlersAdicionais.processarAjudaCallback(chatId, topic);
      return await bot.answerCallbackQuery(query.id);
    }

    await bot.answerCallbackQuery(query.id);
  } catch (e) {
    console.error(e);
    if (query.message?.chat.id)
      await bot.sendMessage(query.message.chat.id, 'Erro interno no processamento do botão.');
    await bot.answerCallbackQuery(query.id);
  }
});

// Handler para todas as mensagens
bot.on('message', async (msg) => {
  try {
    if (msg.text && msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const texto = msg.text?.trim();

    // Se o usuário está em fluxo de cadastro, chama o handler do cadastro!
    const session = userSessions.get(chatId);
    if (session) {
      await HandlersCadastro.processarEtapa(msg, session);
      return;
    }

    if (texto && COMANDOS_MENU[texto]) {
      await COMANDOS_MENU[texto](chatId);
    } else {
      enviarMenu(chatId);
    }
  } catch (e) {
    console.error(e);
    await bot.sendMessage(msg.chat.id, 'Erro ao processar sua mensagem.');
  }
});

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);
  if (!session) return;

  if (session.etapa === 8 || session.etapa === 9) {
    if (msg.photo && msg.photo.length > 0) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      await HandlersCadastro.processarDocumento(chatId, session, fileId);
    } else {
      await bot.sendMessage(chatId, 'Erro ao receber a foto. Tente novamente!');
    }
  }
});

console.log('🤖 Bot iniciado!');
