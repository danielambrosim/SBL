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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlersStatus = void 0;
const bot_1 = require("../bot");
const db_1 = require("../db");
exports.HandlersStatus = {
    consultar: (chatId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const usuario = yield (0, db_1.buscarUsuarioPorChatId)(chatId);
        if (!usuario) {
            yield bot_1.bot.sendMessage(chatId, 'Você precisa estar cadastrado para ver seu status.');
            return;
        }
        const statusSites = yield (0, db_1.listarStatusUsuarioPorSite)(usuario.id);
        const sites = yield (0, db_1.listarSites)();
        if (!statusSites.length) {
            yield bot_1.bot.sendMessage(chatId, 'Nenhum status encontrado.');
            return;
        }
        let mensagem = '📊 *Seu status em cada site de leilão:*\n\n';
        for (const status of statusSites) {
            const site = sites.find(s => s.id === status.site_id);
            mensagem += `• ${(_a = site === null || site === void 0 ? void 0 : site.nome) !== null && _a !== void 0 ? _a : 'Site desconhecido'}: *${status.status}*\n`;
        }
        yield bot_1.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    })
};
