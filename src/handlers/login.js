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
exports.HandlersLogin = exports.loginSessions = void 0;
const bot_1 = require("../bot");
const db_1 = require("../db");
const bcrypt_1 = __importDefault(require("bcrypt"));
exports.loginSessions = new Map();
exports.HandlersLogin = {
    iniciar: (chatId) => __awaiter(void 0, void 0, void 0, function* () {
        exports.loginSessions.set(chatId, { etapa: 1, lastActivity: Date.now() });
        yield bot_1.bot.sendMessage(chatId, 'Digite seu e-mail cadastrado:');
    }),
    processarEtapa: (msg, session) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const chatId = msg.chat.id;
        const etapa = session.etapa || 1;
        const text = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.trim();
        switch (etapa) {
            case 1:
                if (!text || !text.includes('@')) {
                    yield bot_1.bot.sendMessage(chatId, 'E-mail inválido. Digite novamente:');
                    return;
                }
                session.email = text;
                session.etapa = 2;
                yield bot_1.bot.sendMessage(chatId, 'Digite sua senha:');
                break;
            case 2:
                if (!text) {
                    yield bot_1.bot.sendMessage(chatId, 'Senha inválida. Digite novamente:');
                    return;
                }
                const usuario = yield (0, db_1.buscarUsuarioPorEmail)(session.email);
                if (!usuario) {
                    yield bot_1.bot.sendMessage(chatId, 'Usuário não encontrado. Digite /start para tentar novamente.');
                    exports.loginSessions.delete(chatId);
                    return;
                }
                const ok = yield bcrypt_1.default.compare(text, usuario.senha);
                if (!ok) {
                    yield bot_1.bot.sendMessage(chatId, 'Senha incorreta. Digite /start para tentar novamente.');
                    exports.loginSessions.delete(chatId);
                    return;
                }
                bot_1.loggedInUsers.set(chatId, usuario.id);
                yield bot_1.bot.sendMessage(chatId, `Login realizado com sucesso! Bem-vindo, ${usuario.nome}.`);
                exports.loginSessions.delete(chatId);
                break;
            default:
                yield bot_1.bot.sendMessage(chatId, 'Erro no login. Digite /start para reiniciar.');
                exports.loginSessions.delete(chatId);
                break;
        }
        session.lastActivity = Date.now();
        exports.loginSessions.set(chatId, session);
    })
};
