"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlersStatus = void 0;
const bot_1 = require("../bot");
const db_1 = require("../db");
exports.HandlersStatus = {
    consultar: async (chatId) => {
        var _a;
        const usuario = await (0, db_1.buscarUsuarioPorChatId)(chatId);
        if (!usuario) {
            await bot_1.bot.sendMessage(chatId, 'Você precisa estar cadastrado para ver seu status.');
            return;
        }
        const statusSites = await (0, db_1.listarStatusUsuarioPorSite)(usuario.id);
        const sites = await (0, db_1.listarSites)();
        if (!statusSites.length) {
            await bot_1.bot.sendMessage(chatId, 'Nenhum status encontrado.');
            return;
        }
        let mensagem = '📊 *Seu status em cada site de leilão:*\n\n';
        for (const status of statusSites) {
            const site = sites.find(s => s.id === status.site_id);
            mensagem += `• ${(_a = site === null || site === void 0 ? void 0 : site.nome) !== null && _a !== void 0 ? _a : 'Site desconhecido'}: *${status.status}*\n`;
        }
        await bot_1.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    }
};
