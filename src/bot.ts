import TelegramBot, { Message } from 'node-telegram-bot-api';
import dotenv from 'dotenv';

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
import { buscarEditais } from './services/edital';
import { listarSites, atualizarStatusUsuariosNovosSites } from './db';
// Importando serviços para enviar os dados do cadastros para os sites de leilões
import { exportarUsuariosParaCSV } from './utils/exportarUsuarios';


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
const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

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

  // Só processa callback de edital (botão gerado pelo listarSitesParaBusca)
  if (data?.startsWith('edital_')) {
    const siteId = Number(data.replace('edital_', ''));
    const sites = await listarSites();
    const site = sites.find(s => s.id === siteId);

    if (!site) {
      await bot.sendMessage(chatId!, 'Site de leilão não encontrado.');
      return;
    }

    await bot.sendMessage(chatId!, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });

    const editais = await buscarEditais(site.url, site.seletor);

    if (!editais.length) {
      await bot.sendMessage(chatId!, 'Nenhum edital encontrado neste site.');
      return;
    }

    // Monta mensagem com os links dos editais encontrados
    let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
    for (const edital of editais) {
      mensagem += `• [${edital.titulo}](${edital.link})\n`;
    }
    await bot.sendMessage(chatId!, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
  }

  // Sempre responda o callback para não deixar o botão "carregando"
  if (query.id) {
    await bot.answerCallbackQuery(query.id);
  }
});

// 11. Handler de mensagens principais
bot.on('message', async (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Log para debug (veja sempre o texto exato recebido ao clicar nos botões)
  console.log('Texto recebido:', JSON.stringify(text));

  // Ignora comandos iniciados por barra (tratados por onText)
  if (text && text.startsWith('/')) return;

  // Processa envio de foto/documento durante cadastro
  if (!text && msg.photo && userSessions.has(chatId)) {
    const user = userSessions.get(chatId)!;
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    await HandlersCadastro.processarDocumento(chatId, user, fileId);
    return;
  }

  // Processa clique em botão do menu principal
  if (text && COMANDOS_MENU[text]) {
    await COMANDOS_MENU[text](chatId);
    return;
  }

  // Se está em login, processa etapa de login
  if (loginSessions.has(chatId)) {
    await HandlersLogin.processarEtapa(msg, loginSessions.get(chatId)!);
    return;
  }

  // Se está em cadastro, processa etapa de cadastro
  if (userSessions.has(chatId)) {
    await HandlersCadastro.processarEtapa(msg, userSessions.get(chatId)!);
    return;
  }

  // Mensagens de saudação (qualquer "oi", "start" etc)
  if (/^(oi|olá|ola|start|iniciar)$/i.test(text || '')) {
    await bot.sendMessage(chatId, '🤖 Bem-vindo ao Sistema Bot Leilão!\nEscolha uma opção:', mainMenu);
    return;
  }

  // Se nada for reconhecido, repete o menu principal (evita loop ou bot travar)
  await bot.sendMessage(chatId, 'Escolha uma opção do MENU:', mainMenu);
});

// 12. Comandos clássicos do Telegram (ex: /start, /ajuda)
bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(msg.chat.id, '🤖 Bem-vindo ao Sistema Bot Leilão!\nEscolha uma opção:', mainMenu);
});

bot.onText(/\/ajuda/, (msg) => {
  bot.sendMessage(msg.chat.id, 'ℹ️ Este bot permite cadastro, login, consulta de status e acesso a editais!', mainMenu);
});


bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const data = query.data;

  // Responde seleção de site normalmente...
  if (data?.startsWith('edital_')) { /* ... */ }

  // Responde tópicos de ajuda
  if (data?.startsWith('ajuda_')) {
    const topic = data.replace('ajuda_', '');
    await HandlersAdicionais.processarAjudaCallback(chatId!, topic);
  }

  if (query.id) await bot.answerCallbackQuery(query.id);
});

// 13. Handlers para erros globais (para não travar em caso de erro inesperado)
process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado:', error);
});
process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
});

// 14. Confirma início do bot no console do servidor
console.log('🤖 Bot iniciado!');
