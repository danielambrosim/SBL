"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlersAdicionais = void 0;
const bot_1 = require("../bot");
const db_1 = require("../db");
const AJUDA_TOPICOS = {
    cadastro: "📝 *Cadastro*: No menu principal, escolha 'Cadastro' e siga as etapas. Preencha todos os dados e envie os documentos necessários. Seu cadastro será avaliado pela equipe do leilão.",
    login: "🔑 *Login*: Escolha 'Login' no menu e informe seu e-mail e senha. Após login, acesse as funções restritas.",
    editais: "📋 *Buscar Editais*: Clique em 'Editais' no menu, escolha o site desejado e veja os editais disponíveis para cada leilão.",
    status: "📊 *Meu Status*: Veja em quais sites você está pendente, ativo ou recusado após o cadastro.",
    contato: "✉️ *Suporte*: Para dúvidas ou problemas, envie um e-mail para bottcc3@gmail.com ou fale com a equipe do leiloeiro."
};
exports.HandlersAdicionais = {
    listarSitesParaBusca: async (chatId) => {
        const sites = await (0, db_1.listarSites)();
        if (!sites.length) {
            await bot_1.bot.sendMessage(chatId, 'Nenhum site cadastrado para busca de editais.');
            return;
        }
        await bot_1.bot.sendMessage(chatId, 'Escolha um site para ver editais:', {
            reply_markup: {
                inline_keyboard: sites.map(site => [
                    { text: site.nome, callback_data: `edital_${site.id}` }
                ])
            }
        });
    },
    // Ajuda interativa: envia botões de tópicos
    ajuda: async (chatId) => {
        await bot_1.bot.sendMessage(chatId, 'ℹ️ Qual assunto você quer saber mais?', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Como funciona o cadastro?', callback_data: 'ajuda_cadastro' },
                        { text: 'Como fazer login?', callback_data: 'ajuda_login' }
                    ],
                    [
                        { text: 'Buscar editais', callback_data: 'ajuda_editais' },
                        { text: 'Meu status', callback_data: 'ajuda_status' }
                    ],
                    [
                        { text: 'Falar com suporte', callback_data: 'ajuda_contato' }
                    ]
                ]
            }
        });
    },
    // Handler para respostas de ajuda (no seu bot.ts ou aqui)
    processarAjudaCallback: async (chatId, topicKey) => {
        const resposta = AJUDA_TOPICOS[topicKey];
        if (resposta) {
            await bot_1.bot.sendMessage(chatId, resposta, { parse_mode: 'Markdown' });
        }
        else {
            await bot_1.bot.sendMessage(chatId, 'Tópico de ajuda não encontrado.');
        }
    }
};
