"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlersCadastro = void 0;
const bot_1 = require("../bot");
const validacao_1 = require("../utils/validacao");
const db_1 = require("../db");
const mail_1 = require("../utils/mail");
const aceitacaoGeral_1 = __importDefault(require("../termos/aceitacaoGeral"));
const bot_2 = require("../bot");
exports.HandlersCadastro = {
    iniciar: async (chatId) => {
        bot_1.userSessions.set(chatId, { etapa: 0, lastActivity: Date.now() });
        await bot_1.bot.sendMessage(chatId, aceitacaoGeral_1.default, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '✅ Aceito' }, { text: '❌ Não aceito' }]
                ],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    },
    processarEtapa: async (msg, session) => {
        var _a;
        const chatId = msg.chat.id;
        const etapa = session.etapa || 0;
        const text = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.trim();
        switch (etapa) {
            case 0:
                if (text === '✅ Aceito') {
                    session.etapa = 1;
                    await bot_1.bot.sendMessage(chatId, 'Bem-vindo ao cadastro! Qual o seu nome completo?', {
                        reply_markup: { remove_keyboard: true }
                    });
                }
                else if (text === '❌ Não aceito') {
                    await bot_1.bot.sendMessage(chatId, 'Cadastro cancelado. Se quiser tentar novamente, escolha a opção de cadastro no menu.', {
                        reply_markup: { remove_keyboard: true }
                    });
                    bot_1.userSessions.delete(chatId);
                }
                else {
                    await bot_1.bot.sendMessage(chatId, 'Por favor, responda usando "✅ Aceito" ou "❌ Não aceito".');
                }
                break;
            case 1:
                if (!text || text.length < 3) {
                    await bot_1.bot.sendMessage(chatId, 'Nome inválido. Digite seu nome completo:');
                    return;
                }
                session.nome = text;
                session.etapa = 2;
                await bot_1.bot.sendMessage(chatId, 'Digite seu e-mail:');
                break;
            case 2:
                if (!text || !(0, validacao_1.validarEmail)(text)) {
                    await bot_1.bot.sendMessage(chatId, 'E-mail inválido. Digite novamente:');
                    return;
                }
                session.email = text;
                // Gerar código de confirmação
                const codigo = Math.floor(100000 + Math.random() * 900000).toString();
                session.codigo = codigo;
                await (0, mail_1.enviarCodigo)(session.email, codigo);
                session.etapa = 3;
                await bot_1.bot.sendMessage(chatId, 'Enviamos um código de confirmação para seu e-mail. Digite o código recebido:');
                break;
            case 3:
                if (!text || text !== session.codigo) {
                    await bot_1.bot.sendMessage(chatId, 'Código incorreto ou inválido. Digite o código enviado ao seu e-mail:');
                    return;
                }
                session.etapa = 4;
                await bot_1.bot.sendMessage(chatId, 'Código confirmado! Agora digite seu CPF (apenas números):');
                break;
            case 4:
                if (!text || !(0, validacao_1.validarCPF)(text)) {
                    await bot_1.bot.sendMessage(chatId, 'CPF inválido. Digite novamente (apenas números):');
                    return;
                }
                session.cpf = text;
                session.etapa = 5;
                await bot_1.bot.sendMessage(chatId, 'Deseja informar CNPJ? (opcional)\nResponda "sim" para informar ou "não" para pular.');
                break;
            case 5:
                if ((text === null || text === void 0 ? void 0 : text.toLowerCase()) === 'sim') {
                    session.etapa = 6;
                    await bot_1.bot.sendMessage(chatId, 'Digite seu CNPJ (apenas números):');
                }
                else if ((text === null || text === void 0 ? void 0 : text.toLowerCase()) === 'não' || (text === null || text === void 0 ? void 0 : text.toLowerCase()) === 'nao') {
                    session.etapa = 7;
                    await bot_1.bot.sendMessage(chatId, 'Digite seu endereço completo:');
                }
                else {
                    await bot_1.bot.sendMessage(chatId, 'Responda apenas com "sim" ou "não":');
                }
                break;
            case 6:
                if (!text || !(0, validacao_1.validarCNPJ)(text)) {
                    await bot_1.bot.sendMessage(chatId, 'CNPJ inválido. Digite novamente ou responda "não" para pular.');
                    return;
                }
                session.cnpj = text;
                session.etapa = 7;
                await bot_1.bot.sendMessage(chatId, 'Digite seu endereço completo:');
                break;
            case 7:
                if (!text || text.length < 8) {
                    await bot_1.bot.sendMessage(chatId, 'Endereço muito curto. Digite o endereço completo:');
                    return;
                }
                session.endereco = text;
                session.etapa = 8;
                await bot_1.bot.sendMessage(chatId, 'Envie uma foto do seu documento (frente):');
                break;
            case 8:
                await bot_1.bot.sendMessage(chatId, 'Por favor, envie a foto do seu documento.');
                // O tratamento do arquivo é feito por processarDocumento().
                break;
            case 9:
                await bot_1.bot.sendMessage(chatId, 'Por favor, envie a foto do seu comprovante de residência.');
                // O tratamento do arquivo é feito por processarDocumento().
                break;
            case 10:
                await bot_1.bot.sendMessage(chatId, 'Crie uma senha (mínimo 6 caracteres):');
                session.etapa = 11;
                break;
            case 11:
                if (!text || !(0, validacao_1.validarSenha)(text)) {
                    await bot_1.bot.sendMessage(chatId, 'Senha fraca. Digite uma senha com pelo menos 6 caracteres:');
                    return;
                }
                session.senha = text;
                session.etapa = 12;
                await bot_1.bot.sendMessage(chatId, 'Confirme sua senha:');
                break;
            case 12:
                if (text !== session.senha) {
                    await bot_1.bot.sendMessage(chatId, 'Senhas não coincidem! Digite a senha novamente:');
                    session.etapa = 11;
                    return;
                }
                session.senhaConfirmacao = text;
                // VERIFICA se já existe usuário com esse chat_id
                const usuarioExistente = await (0, db_1.buscarUsuarioPorChatId)(chatId);
                if (usuarioExistente) {
                    await bot_1.bot.sendMessage(chatId, 'Você já está cadastrado! Use /start para acessar o menu.');
                    bot_1.userSessions.delete(chatId);
                    return;
                }
                // Finaliza cadastro e salva usuário
                const usuarioId = await (0, db_1.salvarUsuario)({
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
                // Monta o objeto usuário salvo (você pode adaptar para buscar todos dados se precisar)
                const usuarioSalvo = {
                    id: usuarioId,
                    nome: session.nome,
                    email: session.email,
                    cpf: session.cpf,
                    endereco: session.endereco,
                    chat_id: chatId
                    // Adicione mais campos se quiser
                };
                // Função para enviar mensagem ao admin com dados do usuário
                async function notificarCadastroAdmin(usuario) {
                    const mensagem = `
📢 *Novo cadastro recebido*

Nome: ${usuario.nome}
Email: ${usuario.email}
CPF: ${usuario.cpf}
Endereço: ${usuario.endereco}
Chat ID: ${usuario.chat_id}
  `;
                    await bot_1.bot.sendMessage(bot_2.ADMIN_CHAT_ID, mensagem, { parse_mode: 'Markdown' });
                }
                // Agora avisa o admin
                await notificarCadastroAdmin(usuarioSalvo);
                // Para cada site, status "pendente"
                const sites = await (0, db_1.listarSites)();
                for (const site of sites) {
                    await (0, db_1.salvarStatusSiteUsuario)(usuarioId, site.id, 'pendente');
                }
                bot_1.userSessions.delete(chatId);
                await bot_1.bot.sendMessage(chatId, 'Cadastro concluído! Você será avaliado pelos sites de leilão e poderá acompanhar seu status pelo menu.', { reply_markup: { remove_keyboard: true } });
                break;
            default:
                await bot_1.bot.sendMessage(chatId, 'Erro no cadastro. Digite /start para reiniciar.');
                bot_1.userSessions.delete(chatId);
                break;
        }
        session.lastActivity = Date.now();
        bot_1.userSessions.set(chatId, session);
    },
    processarDocumento: async (chatId, session, fileId) => {
        if (session.etapa === 8) {
            session.imagem_doc_id = fileId;
            session.etapa = 9;
            await bot_1.bot.sendMessage(chatId, 'Foto recebida! Agora envie a foto do comprovante de residência:');
        }
        else if (session.etapa === 9) {
            session.comprovante_residencia_id = fileId;
            session.etapa = 10;
            await bot_1.bot.sendMessage(chatId, 'Comprovante recebido! Agora crie uma senha:');
        }
        session.lastActivity = Date.now();
        bot_1.userSessions.set(chatId, session);
    }
};
