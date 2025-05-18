import { bot, userSessions } from '../bot';
import { validarEmail, validarCPF, validarCNPJ, validarSenha } from '../utils/validacao';
import { salvarUsuario, listarSites, salvarStatusSiteUsuario } from '../db';
import { Message } from 'node-telegram-bot-api';

interface CadastroState {
  etapa: number;
  nome?: string;
  email?: string;
  codigo?: string;
  cpf?: string;
  cnpj?: string;
  senha?: string;
  senhaConfirmacao?: string;
  endereco?: string;
  imagem_doc_id?: string;
  comprovante_residencia_id?: string;
  lastActivity: number;
}

export const HandlersCadastro = {
  iniciar: async (chatId: number) => {
    userSessions.set(chatId, { etapa: 1, lastActivity: Date.now() });
    await bot.sendMessage(chatId, 'Bem-vindo ao cadastro! Qual o seu nome completo?');
  },

  processarEtapa: async (msg: Message, session: CadastroState) => {
    const chatId = msg.chat.id;
    const etapa = session.etapa || 1;
    const text = msg.text?.trim();

    switch (etapa) {
      case 1:
        if (!text || text.length < 3) {
          await bot.sendMessage(chatId, 'Nome inválido. Digite seu nome completo:');
          return;
        }
        session.nome = text;
        session.etapa = 2;
        await bot.sendMessage(chatId, 'Digite seu e-mail:');
        break;

      case 2:
        if (!text || !validarEmail(text)) {
          await bot.sendMessage(chatId, 'E-mail inválido. Digite novamente:');
          return;
        }
        session.email = text;
        // Aqui você pode implementar envio de código por e-mail se quiser
        session.etapa = 3;
        await bot.sendMessage(chatId, 'Digite seu CPF (apenas números):');
        break;

      case 3:
        if (!text || !validarCPF(text)) {
          await bot.sendMessage(chatId, 'CPF inválido. Digite novamente (apenas números):');
          return;
        }
        session.cpf = text;
        session.etapa = 4;
        await bot.sendMessage(chatId, 'Deseja informar CNPJ? (opcional)\nResponda "sim" para informar ou "não" para pular.');
        break;

      case 4:
        if (text?.toLowerCase() === 'sim') {
          session.etapa = 5;
          await bot.sendMessage(chatId, 'Digite seu CNPJ (apenas números):');
        } else if (text?.toLowerCase() === 'não' || text?.toLowerCase() === 'nao') {
          session.etapa = 6;
          await bot.sendMessage(chatId, 'Digite seu endereço completo:');
        } else {
          await bot.sendMessage(chatId, 'Responda apenas com "sim" ou "não":');
        }
        break;

      case 5:
        if (!text || !validarCNPJ(text)) {
          await bot.sendMessage(chatId, 'CNPJ inválido. Digite novamente ou responda "não" para pular.');
          return;
        }
        session.cnpj = text;
        session.etapa = 6;
        await bot.sendMessage(chatId, 'Digite seu endereço completo:');
        break;

      case 6:
        if (!text || text.length < 8) {
          await bot.sendMessage(chatId, 'Endereço muito curto. Digite o endereço completo:');
          return;
        }
        session.endereco = text;
        session.etapa = 7;
        await bot.sendMessage(chatId, 'Envie uma foto do seu documento (frente):');
        break;

      case 7:
        await bot.sendMessage(chatId, 'Por favor, envie a foto do seu documento.');
        // processarDocumento é chamado quando receber a foto
        break;

      case 8:
        await bot.sendMessage(chatId, 'Por favor, envie a foto do seu comprovante de residência.');
        // processarDocumento é chamado quando receber a foto
        break;

      case 9:
        await bot.sendMessage(chatId, 'Crie uma senha (mínimo 6 caracteres):');
        session.etapa = 10;
        break;

      case 10:
        if (!text || !validarSenha(text)) {
          await bot.sendMessage(chatId, 'Senha fraca. Digite uma senha com pelo menos 6 caracteres:');
          return;
        }
        session.senha = text;
        session.etapa = 11;
        await bot.sendMessage(chatId, 'Confirme sua senha:');
        break;

      case 11:
        if (text !== session.senha) {
          await bot.sendMessage(chatId, 'Senhas não coincidem! Digite a senha novamente:');
          session.etapa = 10;
          return;
        }
        session.senhaConfirmacao = text;
        // Finaliza cadastro e salva usuário
        const usuarioId = await salvarUsuario({
          nome: session.nome!,
          email: session.email!,
          cpf: session.cpf!,
          cnpj: session.cnpj,
          senha: session.senha!,
          endereco: session.endereco!,
          chat_id: chatId,
          imagem_doc_id: session.imagem_doc_id,
          comprovante_residencia_id: session.comprovante_residencia_id
        });
        // Para cada site, status "pendente"
        const sites = await listarSites();
        for (const site of sites) {
          await salvarStatusSiteUsuario(usuarioId, site.id, 'pendente');
        }
        userSessions.delete(chatId);
        await bot.sendMessage(chatId, 'Cadastro concluído! Você será avaliado pelos sites de leilão e poderá acompanhar seu status pelo menu.', { reply_markup: { remove_keyboard: true } });
        break;

      default:
        await bot.sendMessage(chatId, 'Erro no cadastro. Digite /start para reiniciar.');
        userSessions.delete(chatId);
        break;
    }
    session.lastActivity = Date.now();
    userSessions.set(chatId, session);
  },

  processarDocumento: async (chatId: number, session: CadastroState, fileId: string) => {
    if (session.etapa === 7) {
      session.imagem_doc_id = fileId;
      session.etapa = 8;
      await bot.sendMessage(chatId, 'Foto recebida! Agora envie a foto do comprovante de residência:');
    } else if (session.etapa === 8) {
      session.comprovante_residencia_id = fileId;
      session.etapa = 9;
      await bot.sendMessage(chatId, 'Comprovante recebido! Agora crie uma senha:');
    }
    session.lastActivity = Date.now();
    userSessions.set(chatId, session);
  }
};
