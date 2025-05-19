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
exports.HandlersCadastro = void 0;
const bot_1 = require("../bot");
const validacao_1 = require("../utils/validacao");
const db_1 = require("../db");
exports.HandlersCadastro = {
    iniciar: (chatId) => __awaiter(void 0, void 0, void 0, function* () {
        bot_1.userSessions.set(chatId, { etapa: 1, lastActivity: Date.now() });
        yield bot_1.bot.sendMessage(chatId, 'Bem-vindo ao cadastro! Qual o seu nome completo?');
    }),
    processarEtapa: (msg, session) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const chatId = msg.chat.id;
        const etapa = session.etapa || 1;
        const text = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.trim();
        switch (etapa) {
            case 1:
                if (!text || text.length < 3) {
                    yield bot_1.bot.sendMessage(chatId, 'Nome inválido. Digite seu nome completo:');
                    return;
                }
                session.nome = text;
                session.etapa = 2;
                yield bot_1.bot.sendMessage(chatId, 'Digite seu e-mail:');
                break;
            case 2:
                if (!text || !(0, validacao_1.validarEmail)(text)) {
                    yield bot_1.bot.sendMessage(chatId, 'E-mail inválido. Digite novamente:');
                    return;
                }
                session.email = text;
                // Aqui você pode implementar envio de código por e-mail se quiser
                session.etapa = 3;
                yield bot_1.bot.sendMessage(chatId, 'Digite seu CPF (apenas números):');
                break;
            case 3:
                if (!text || !(0, validacao_1.validarCPF)(text)) {
                    yield bot_1.bot.sendMessage(chatId, 'CPF inválido. Digite novamente (apenas números):');
                    return;
                }
                session.cpf = text;
                session.etapa = 4;
                yield bot_1.bot.sendMessage(chatId, 'Deseja informar CNPJ? (opcional)\nResponda "sim" para informar ou "não" para pular.');
                break;
            case 4:
                if ((text === null || text === void 0 ? void 0 : text.toLowerCase()) === 'sim') {
                    session.etapa = 5;
                    yield bot_1.bot.sendMessage(chatId, 'Digite seu CNPJ (apenas números):');
                }
                else if ((text === null || text === void 0 ? void 0 : text.toLowerCase()) === 'não' || (text === null || text === void 0 ? void 0 : text.toLowerCase()) === 'nao') {
                    session.etapa = 6;
                    yield bot_1.bot.sendMessage(chatId, 'Digite seu endereço completo:');
                }
                else {
                    yield bot_1.bot.sendMessage(chatId, 'Responda apenas com "sim" ou "não":');
                }
                break;
            case 5:
                if (!text || !(0, validacao_1.validarCNPJ)(text)) {
                    yield bot_1.bot.sendMessage(chatId, 'CNPJ inválido. Digite novamente ou responda "não" para pular.');
                    return;
                }
                session.cnpj = text;
                session.etapa = 6;
                yield bot_1.bot.sendMessage(chatId, 'Digite seu endereço completo:');
                break;
            case 6:
                if (!text || text.length < 8) {
                    yield bot_1.bot.sendMessage(chatId, 'Endereço muito curto. Digite o endereço completo:');
                    return;
                }
                session.endereco = text;
                session.etapa = 7;
                yield bot_1.bot.sendMessage(chatId, 'Envie uma foto do seu documento (frente):');
                break;
            case 7:
                yield bot_1.bot.sendMessage(chatId, 'Por favor, envie a foto do seu documento.');
                // processarDocumento é chamado quando receber a foto
                break;
            case 8:
                yield bot_1.bot.sendMessage(chatId, 'Por favor, envie a foto do seu comprovante de residência.');
                // processarDocumento é chamado quando receber a foto
                break;
            case 9:
                yield bot_1.bot.sendMessage(chatId, 'Crie uma senha (mínimo 6 caracteres):');
                session.etapa = 10;
                break;
            case 10:
                if (!text || !(0, validacao_1.validarSenha)(text)) {
                    yield bot_1.bot.sendMessage(chatId, 'Senha fraca. Digite uma senha com pelo menos 6 caracteres:');
                    return;
                }
                session.senha = text;
                session.etapa = 11;
                yield bot_1.bot.sendMessage(chatId, 'Confirme sua senha:');
                break;
            case 11:
                if (text !== session.senha) {
                    yield bot_1.bot.sendMessage(chatId, 'Senhas não coincidem! Digite a senha novamente:');
                    session.etapa = 10;
                    return;
                }
                session.senhaConfirmacao = text;
                // Finaliza cadastro e salva usuário
                const usuarioId = yield (0, db_1.salvarUsuario)({
                    nome: session.nome,
                    email: session.email,
                    cpf: session.cpf,
                    cnpj: session.cnpj,
                    senha: session.senha,
                    endereco: session.endereco,
                    chat_id: chatId,
                    imagem_doc_id: session.imagem_doc_id,
                    comprovante_residencia_id: session.comprovante_residencia_id
                });
                // Para cada site, status "pendente"
                const sites = yield (0, db_1.listarSites)();
                for (const site of sites) {
                    yield (0, db_1.salvarStatusSiteUsuario)(usuarioId, site.id, 'pendente');
                }
                bot_1.userSessions.delete(chatId);
                yield bot_1.bot.sendMessage(chatId, 'Cadastro concluído! Você será avaliado pelos sites de leilão e poderá acompanhar seu status pelo menu.', { reply_markup: { remove_keyboard: true } });
                break;
            default:
                yield bot_1.bot.sendMessage(chatId, 'Erro no cadastro. Digite /start para reiniciar.');
                bot_1.userSessions.delete(chatId);
                break;
        }
        session.lastActivity = Date.now();
        bot_1.userSessions.set(chatId, session);
    }),
    processarDocumento: (chatId, session, fileId) => __awaiter(void 0, void 0, void 0, function* () {
        if (session.etapa === 7) {
            session.imagem_doc_id = fileId;
            session.etapa = 8;
            yield bot_1.bot.sendMessage(chatId, 'Foto recebida! Agora envie a foto do comprovante de residência:');
        }
        else if (session.etapa === 8) {
            session.comprovante_residencia_id = fileId;
            session.etapa = 9;
            yield bot_1.bot.sendMessage(chatId, 'Comprovante recebido! Agora crie uma senha:');
        }
        session.lastActivity = Date.now();
        bot_1.userSessions.set(chatId, session);
    })
};
