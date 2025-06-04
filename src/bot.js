"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainMenu = exports.ADMIN_CHAT_ID = exports.bot = exports.loggedInUsers = exports.userSessions = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db"); // ajuste o caminho
const db_2 = require("./db"); // Ajuste o caminho conforme sua estrutura
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
const edital_2 = require("./services/edital"); // ajuste o caminho
const db_3 = require("./db");
// Importando serviços para enviar os dados do cadastros para os sites de leilões
const exportarUsuarios_1 = require("./utils/exportarUsuarios");
const express_1 = __importDefault(require("express"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)(); // 1º - Cria a instância
app.use(express_1.default.json()); // 2º - Configura middlewares
// 3º - Usa as rotas
app.use("/api/admin", admin_1.default);
// Se precisar de outras rotas, adicione aqui
// 4º - Starta o servidor
app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
const usuarios_1 = __importDefault(require("./api/admin/usuarios"));
app.use(express_1.default.json());
app.use("/api/admin/usuarios", usuarios_1.default);
app.listen(3000, () => console.log("Servidor rodando!"));
// 4. Inicializando o bot com o token do .env
const token = process.env.TELEGRAM_TOKEN;
if (!token)
    throw new Error('TELEGRAM_TOKEN não definido no .env');
exports.bot = new node_telegram_bot_api_1.default(token, { polling: true });
// 5. Sincroniza status de usuários/sites ao iniciar (garante que todo usuário está vinculado a todo site)
(async () => {
    await (0, db_3.atualizarStatusUsuariosNovosSites)();
    console.log('Status sincronizado com todos os sites de leilão ao iniciar o bot!');
})();
// 6. ID do admin para comandos restritos (puxado do .env)
exports.ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);
// 7. Comando secreto /syncsites (só admin pode usar para garantir que todo usuário tem status em todo site)
exports.bot.onText(/\/syncsites/, async (msg) => {
    if (msg.chat.id !== exports.ADMIN_CHAT_ID) {
        await exports.bot.sendMessage(msg.chat.id, 'Acesso negado.');
        return;
    }
    await (0, db_3.atualizarStatusUsuariosNovosSites)();
    await exports.bot.sendMessage(msg.chat.id, 'Sincronização de status concluída!');
});
// Comando admin /exportarusuarios
exports.bot.onText(/\/exportarusuarios/, async (msg) => {
    if (msg.chat.id !== exports.ADMIN_CHAT_ID)
        return exports.bot.sendMessage(msg.chat.id, 'Acesso negado.');
    const path = await (0, exportarUsuarios_1.exportarUsuariosParaCSV)();
    await exports.bot.sendDocument(msg.chat.id, path, {}, { filename: 'usuarios_leilao.csv' });
});
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
    '🚪 Logout': async (chatId) => {
        if (exports.loggedInUsers.has(chatId)) {
            exports.loggedInUsers.delete(chatId);
            await exports.bot.sendMessage(chatId, '✅ Você foi deslogado.', exports.mainMenu);
        }
        else {
            await exports.bot.sendMessage(chatId, 'ℹ️ Você não estava logado.', exports.mainMenu);
        }
    }
};
// 10. Handler de botões INLINE (callback_query) — usado para buscar editais ao clicar em um site
exports.bot.on('callback_query', async (query) => {
    var _a;
    const chatId = (_a = query.message) === null || _a === void 0 ? void 0 : _a.chat.id;
    const data = query.data;
    if (data === null || data === void 0 ? void 0 : data.startsWith('edital_')) {
        const siteId = Number(data.replace('edital_', ''));
        const sites = await (0, db_3.listarSites)();
        const site = sites.find(s => s.id === siteId);
        if (!site) {
            await exports.bot.sendMessage(chatId, 'Site de leilão não encontrado.');
            return;
        }
        await exports.bot.sendMessage(chatId, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });
        // Busca do banco (não do scraping) -- ajustar para filtrar por site se desejar!
        const editais = await (0, edital_1.listarEditais)(10);
        if (!editais.length) {
            await exports.bot.sendMessage(chatId, 'Nenhum edital encontrado neste site.');
            return;
        }
        // Monta mensagem com os links dos editais encontrados
        let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
        for (const edital of editais) {
            mensagem += `• [${edital.titulo}](${edital.id})\n`;
        }
        await exports.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
    }
    if (query.id) {
        await exports.bot.answerCallbackQuery(query.id);
    }
});
// --- Handler para o comando /editais ---
exports.bot.onText(/\/editais/, async (msg) => {
    const chatId = msg.chat.id;
    const editais = await (0, edital_2.listarEditais)();
    if (!editais.length) {
        await exports.bot.sendMessage(chatId, 'Nenhum edital disponível no momento.');
        return;
    }
    const keyboard = editais.map((edital) => ([{
            text: edital.titulo,
            callback_data: `pdfedital_${edital.id}`
        }]));
    await exports.bot.sendMessage(chatId, '📑 *Editais disponíveis:*\nClique para receber o PDF:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });
});
// --- Handler ÚNICO para todos os botões INLINE ---
exports.bot.on('callback_query', async (query) => {
    var _a;
    if (!query.data)
        return;
    const chatId = (_a = query.message) === null || _a === void 0 ? void 0 : _a.chat.id;
    const data = query.data;
    // Envia PDF do edital
    if (data.startsWith('pdfedital_')) {
        const editalId = Number(data.replace('pdfedital_', ''));
        const editais = await (0, edital_2.listarEditais)();
        const edital = editais.find(e => e.id === editalId);
        if (!edital) {
            await exports.bot.sendMessage(chatId, 'Edital não encontrado.');
            await exports.bot.answerCallbackQuery(query.id);
            return;
        }
        const pdfPath = path_1.default.join(__dirname, edital.url_pdf);
        if (fs_1.default.existsSync(pdfPath)) {
            await exports.bot.sendDocument(chatId, pdfPath, { caption: edital.titulo });
        }
        else {
            await exports.bot.sendMessage(chatId, 'PDF não encontrado.');
        }
        await exports.bot.answerCallbackQuery(query.id);
        return;
    }
    // Botão de status (admin)
    if (data.includes(':')) {
        const [acao, userIdStr, novoStatus] = data.split(':');
        if (acao === 'status') {
            if (chatId !== Number(process.env.ADMIN_CHAT_ID)) {
                await exports.bot.answerCallbackQuery(query.id, { text: 'Acesso negado', show_alert: true });
                return;
            }
            const userId = Number(userIdStr);
            try {
                await (0, db_1.atualizarStatusUsuarioNoBanco)(userId, novoStatus);
                await exports.bot.sendMessage(chatId, `Status do usuário ${userId} atualizado para: ${novoStatus}`);
                await exports.bot.answerCallbackQuery(query.id);
            }
            catch {
                await exports.bot.sendMessage(chatId, 'Erro ao atualizar status do usuário.');
                await exports.bot.answerCallbackQuery(query.id);
            }
            return;
        }
    }
    // Seleção de usuário (admin)
    if (data.startsWith('usuario_')) {
        if (chatId !== Number(process.env.ADMIN_CHAT_ID))
            return; // só admin pode acessar
        const userId = Number(data.split('_')[1]);
        const usuarios = await (0, db_2.buscarUsuariosNoBanco)();
        const usuario = usuarios.find(u => u.id === userId);
        if (!usuario) {
            await exports.bot.sendMessage(chatId, "Usuário não encontrado.");
            await exports.bot.answerCallbackQuery(query.id);
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
        await exports.bot.sendMessage(chatId, detalhes, { parse_mode: 'Markdown' });
        await exports.bot.answerCallbackQuery(query.id);
        return;
    }
    // Seleção de site para mostrar editais
    if (data.startsWith('edital_')) {
        const siteId = Number(data.replace('edital_', ''));
        const sites = await (0, db_3.listarSites)();
        const site = sites.find(s => s.id === siteId);
        if (!site) {
            await exports.bot.sendMessage(chatId, 'Site de leilão não encontrado.');
            await exports.bot.answerCallbackQuery(query.id);
            return;
        }
        await exports.bot.sendMessage(chatId, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });
        // Busca do banco (não do scraping) -- ajustar para filtrar por site se desejar!
        const editais = await (0, edital_1.listarEditais)(10);
        if (!editais.length) {
            await exports.bot.sendMessage(chatId, 'Nenhum edital encontrado neste site.');
            await exports.bot.answerCallbackQuery(query.id);
            return;
        }
        let mensagem = `*Editais encontrados em ${site.nome}:*\n\n`;
        for (const edital of editais) {
            mensagem += `• ${edital.titulo}\n`;
        }
        await exports.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
        await exports.bot.answerCallbackQuery(query.id);
        return;
    }
    // Botão de ajuda (exemplo)
    if (data.startsWith('ajuda_')) {
        const topic = data.replace('ajuda_', '');
        await adicionais_1.HandlersAdicionais.processarAjudaCallback(chatId, topic);
        await exports.bot.answerCallbackQuery(query.id);
        return;
    }
    // Responde qualquer outro callback para não travar
    await exports.bot.answerCallbackQuery(query.id);
});
// 14. Confirma início do bot no console do servidor
console.log('🤖 Bot iniciado!');
