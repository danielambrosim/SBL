"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainMenu = exports.bot = exports.loggedInUsers = exports.userSessions = void 0;
exports.listarEditais = listarEditais;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = __importDefault(require("dotenv"));
// 1. Carregando variáveis do arquivo .env (sempre no topo)
dotenv_1.default.config();
// 2. Sessões globais (usadas para acompanhar o progresso de cada usuário nos fluxos)
exports.userSessions = new Map();
exports.loggedInUsers = new Map();
// 3. Importando os handlers dos fluxos
const cadastro_1 = require("./handlers/cadastro");
const login_1 = require("./handlers/login");
const status_1 = require("./handlers/status");
const adicionais_1 = require("./handlers/adicionais");
// Importando serviços para busca de editais e sites do banco
const edital_1 = require("./services/edital");
const db_1 = require("./db");
const db_2 = require("./db");
// Importando serviços para enviar os dados do cadastros para os sites de leilões
const exportarUsuarios_1 = require("./utils/exportarUsuarios");
// 4. Inicializando o bot com o token do .env
const token = process.env.TELEGRAM_TOKEN;
if (!token)
    throw new Error('TELEGRAM_TOKEN não definido no .env');
exports.bot = new node_telegram_bot_api_1.default(token, { polling: true });
// 5. Sincroniza status de usuários/sites ao iniciar (garante que todo usuário está vinculado a todo site)
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, db_1.atualizarStatusUsuariosNovosSites)();
    console.log('Status sincronizado com todos os sites de leilão ao iniciar o bot!');
}))();
// 6. ID do admin para comandos restritos (puxado do .env)
const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);
// 7. Comando secreto /syncsites (só admin pode usar para garantir que todo usuário tem status em todo site)
exports.bot.onText(/\/syncsites/, (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.chat.id !== ADMIN_CHAT_ID) {
        yield exports.bot.sendMessage(msg.chat.id, 'Acesso negado.');
        return;
    }
    yield (0, db_1.atualizarStatusUsuariosNovosSites)();
    yield exports.bot.sendMessage(msg.chat.id, 'Sincronização de status concluída!');
}));
// Comando admin /exportarusuarios
exports.bot.onText(/\/exportarusuarios/, (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.chat.id !== ADMIN_CHAT_ID)
        return exports.bot.sendMessage(msg.chat.id, 'Acesso negado.');
    const path = yield (0, exportarUsuarios_1.exportarUsuariosParaCSV)();
    yield exports.bot.sendDocument(msg.chat.id, path, {}, { filename: 'usuarios_leilao.csv' });
}));
// 8. Menu principal do bot (teclado Telegram)
// Isso é o que aparece para o usuário, nunca muda sem mexer aqui!
exports.mainMenu = {
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
const COMANDOS_MENU = {
    '📝 Cadastro': cadastro_1.HandlersCadastro.iniciar,
    '🔑 Login': login_1.HandlersLogin.iniciar,
    '📋 Editais': adicionais_1.HandlersAdicionais.listarSitesParaBusca, // Mostra os sites como botões inline
    '📊 Meu Status': status_1.HandlersStatus.consultar,
    'ℹ️ Ajuda': adicionais_1.HandlersAdicionais.ajuda,
    '🚪 Logout': (chatId) => __awaiter(void 0, void 0, void 0, function* () {
        if (exports.loggedInUsers.has(chatId)) {
            exports.loggedInUsers.delete(chatId);
            yield exports.bot.sendMessage(chatId, '✅ Você foi deslogado.', exports.mainMenu);
        }
        else {
            yield exports.bot.sendMessage(chatId, 'ℹ️ Você não estava logado.', exports.mainMenu);
        }
    })
};
// 10. Handler de botões INLINE (callback_query) — usado para buscar editais ao clicar em um site
exports.bot.on('callback_query', (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const chatId = (_a = query.message) === null || _a === void 0 ? void 0 : _a.chat.id;
    const data = query.data;
    // Só processa callback de edital (botão gerado pelo listarSitesParaBusca)
    if (data === null || data === void 0 ? void 0 : data.startsWith('edital_')) {
        const siteId = Number(data.replace('edital_', ''));
        const sites = yield (0, db_1.listarSites)();
        const site = sites.find(s => s.id === siteId);
        if (!site) {
            yield exports.bot.sendMessage(chatId, 'Site de leilão não encontrado.');
            return;
        }
        yield exports.bot.sendMessage(chatId, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });
        const editais = yield (0, edital_1.buscarEditais)(site.url, site.seletor);
        if (!editais.length) {
            yield exports.bot.sendMessage(chatId, 'Nenhum edital encontrado neste site.');
            return;
        }
        // Monta mensagem com os links dos editais encontrados
        let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
        for (const edital of editais) {
            mensagem += `• [${edital.titulo}](${edital.link})\n`;
        }
        yield exports.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
    }
    // Sempre responda o callback para não deixar o botão "carregando"
    if (query.id) {
        yield exports.bot.answerCallbackQuery(query.id);
    }
}));
// 11. Handler de mensagens principais
exports.bot.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const chatId = msg.chat.id;
    const text = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.trim();
    // Log para debug (veja sempre o texto exato recebido ao clicar nos botões)
    console.log('Texto recebido:', JSON.stringify(text));
    // Ignora comandos iniciados por barra (tratados por onText)
    if (text && text.startsWith('/'))
        return;
    // Processa envio de foto/documento durante cadastro
    if (!text && msg.photo && exports.userSessions.has(chatId)) {
        const user = exports.userSessions.get(chatId);
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        yield cadastro_1.HandlersCadastro.processarDocumento(chatId, user, fileId);
        return;
    }
    // Processa clique em botão do menu principal
    if (text && COMANDOS_MENU[text]) {
        yield COMANDOS_MENU[text](chatId);
        return;
    }
    // Se está em login, processa etapa de login
    if (login_1.loginSessions.has(chatId)) {
        yield login_1.HandlersLogin.processarEtapa(msg, login_1.loginSessions.get(chatId));
        return;
    }
    // Se está em cadastro, processa etapa de cadastro
    if (exports.userSessions.has(chatId)) {
        yield cadastro_1.HandlersCadastro.processarEtapa(msg, exports.userSessions.get(chatId));
        return;
    }
    // Mensagens de saudação (qualquer "oi", "start" etc)
    if (/^(oi|olá|ola|start|iniciar)$/i.test(text || '')) {
        yield exports.bot.sendMessage(chatId, '🤖 Bem-vindo ao Sistema Bot Leilão!\nEscolha uma opção:', exports.mainMenu);
        return;
    }
    // Se nada for reconhecido, repete o menu principal (evita loop ou bot travar)
    yield exports.bot.sendMessage(chatId, 'Escolha uma opção do MENU:', exports.mainMenu);
}));
// 12. Comandos clássicos do Telegram (ex: /start, /ajuda)
exports.bot.onText(/\/start/, (msg) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.bot.sendMessage(msg.chat.id, '🤖 Bem-vindo ao Sistema Bot Leilão!\nEscolha uma opção:', exports.mainMenu);
}));
exports.bot.onText(/\/ajuda/, (msg) => {
    exports.bot.sendMessage(msg.chat.id, 'ℹ️ Este bot permite cadastro, login, consulta de status e acesso a editais!', exports.mainMenu);
});
exports.bot.on('callback_query', (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const chatId = (_a = query.message) === null || _a === void 0 ? void 0 : _a.chat.id;
    const data = query.data;
    // Responde seleção de site normalmente...
    if (data === null || data === void 0 ? void 0 : data.startsWith('edital_')) { /* ... */ }
    // Responde tópicos de ajuda
    if (data === null || data === void 0 ? void 0 : data.startsWith('ajuda_')) {
        const topic = data.replace('ajuda_', '');
        yield adicionais_1.HandlersAdicionais.processarAjudaCallback(chatId, topic);
    }
    if (query.id)
        yield exports.bot.answerCallbackQuery(query.id);
}));
// 13. Handlers para erros globais (para não travar em caso de erro inesperado)
process.on('unhandledRejection', (error) => {
    console.error('Erro não tratado:', error);
});
process.on('uncaughtException', (error) => {
    console.error('Exceção não capturada:', error);
});
function listarEditais() {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield db_2.pool.query('SELECT * FROM editais ORDER BY data_publicacao DESC');
        return rows;
    });
}
// Essa parte está aqui para compor um teste de editais para o sistema do bot;
exports.bot.onText(/\/editais/, (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const editais = yield listarEditais();
    if (editais.length) {
        let mensagem = '📑 *Editais disponíveis:*\n\n';
        for (const edital of editais) {
            // data_publicacao pode ser Date ou string
            const dataFormatada = (edital.data_publicacao instanceof Date)
                ? edital.data_publicacao.toISOString().split('T')[0]
                : edital.data_publicacao;
            mensagem += `*${edital.titulo}* (${dataFormatada})\n[Ver PDF](${edital.url_pdf})\n\n`;
        }
        yield exports.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    }
    else {
        yield exports.bot.sendMessage(chatId, 'Nenhum edital disponível no momento.');
    }
}));
// 14. Confirma início do bot no console do servidor
console.log('🤖 Bot iniciado!');
