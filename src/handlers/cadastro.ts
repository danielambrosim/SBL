import { bot, userSessions, ADMIN_CHAT_ID } from '../bot';
import { validarEmail, validarCPF, validarCNPJ, validarSenha } from '../utils/validacao';
import { salvarUsuario, listarSites, salvarStatusSiteUsuario, buscarUsuarioPorChatId, Usuario } from '../db';
import { enviarCodigo } from '../utils/mail';
import { Message } from 'node-telegram-bot-api';
import termoAceitacao from '../termos/aceitacaoGeral';


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
    userSessions.set(chatId, { etapa: 0, lastActivity: Date.now() });
    await bot.sendMessage(
      chatId,
      termoAceitacao,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '✅ Aceito' }, { text: '❌ Não aceito' }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    );
  },

  processarEtapa: async (msg: Message, session: CadastroState) => {
    const chatId = msg.chat.id;
    const etapa = session.etapa || 0;
    const text = msg.text?.trim();

    switch (etapa) {
        case 0:
          if (text === '✅ Aceito') {
            session.etapa = 1;
            userSessions.set(chatId, session); // <-- ESSENCIAL!
            await bot.sendMessage(chatId, 'Bem-vindo ao cadastro! Qual o seu nome completo?', {
              reply_markup: { remove_keyboard: true }
            });
            return; // Recomendo usar para não executar mais nada depois
          } else if (text === '❌ Não aceito') {
            await bot.sendMessage(chatId, 'Cadastro cancelado. Se quiser tentar novamente, escolha a opção de cadastro no menu.', {
              reply_markup: { remove_keyboard: true }
            });
            userSessions.delete(chatId);
            return;
          } else {
            await bot.sendMessage(chatId, 'Por favor, responda usando "✅ Aceito" ou "❌ Não aceito".');
            return;
          }

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
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        session.codigo = codigo;
        await enviarCodigo(session.email, codigo);
        session.etapa = 3;
        await bot.sendMessage(chatId, 'Enviamos um código de confirmação para seu e-mail. Digite o código recebido:');
        break;

      case 3:
        if (!text || text !== session.codigo) {
          await bot.sendMessage(chatId, 'Código incorreto ou inválido. Digite o código enviado ao seu e-mail:');
          return;
        }
        session.etapa = 4;
        await bot.sendMessage(chatId, 'Código confirmado! Agora digite seu CPF (apenas números):');
        break;

      case 4:
        if (!text || !validarCPF(text)) {
          await bot.sendMessage(chatId, 'CPF inválido. Digite novamente (apenas números):');
          return;
        }
        session.cpf = text;
        session.etapa = 5;
        await bot.sendMessage(chatId, 'Deseja informar CNPJ? (opcional)\nResponda "sim" para informar ou "não" para pular.');
        break;

      case 5:
        if (text?.toLowerCase() === 'sim') {
          session.etapa = 6;
          await bot.sendMessage(chatId, 'Digite seu CNPJ (apenas números):');
        } else if (text?.toLowerCase() === 'não' || text?.toLowerCase() === 'nao') {
          session.etapa = 7;
          await bot.sendMessage(chatId, 'Digite seu endereço completo:');
        } else {
          await bot.sendMessage(chatId, 'Responda apenas com "sim" ou "não":');
        }
        break;

      case 6:
        if (!text || !validarCNPJ(text)) {
          await bot.sendMessage(chatId, 'CNPJ inválido. Digite novamente ou responda "não" para pular.');
          return;
        }
        session.cnpj = text;
        session.etapa = 7;
        await bot.sendMessage(chatId, 'Digite seu endereço completo:');
        break;

      case 7:
        if (!text || text.length < 8) {
          await bot.sendMessage(chatId, 'Endereço muito curto. Digite o endereço completo:');
          return;
        }
        session.endereco = text;
        session.etapa = 8;
        await bot.sendMessage(chatId, 'Envie uma foto do seu documento (frente):');
        break;

      case 8:
        await bot.sendMessage(chatId, 'Por favor, envie a foto do seu documento.');
        // Aqui você trata o arquivo na função processarDocumento().
        break;

      case 9:
        await bot.sendMessage(chatId, 'Por favor, envie a foto do seu comprovante de residência.');
        // Aqui você trata o arquivo na função processarDocumento().
        break;

      case 10:
        await bot.sendMessage(chatId, 'Crie uma senha (mínimo 6 caracteres):');
        session.etapa = 11;
        break;

      case 11:
        if (!text || !validarSenha(text)) {
          await bot.sendMessage(chatId, 'Senha fraca. Digite uma senha com pelo menos 6 caracteres:');
          return;
        }
        session.senha = text;
        session.etapa = 12;
        await bot.sendMessage(chatId, 'Confirme sua senha:');
        break;

      case 12:
        if (text !== session.senha) {
          await bot.sendMessage(chatId, 'Senhas não coincidem! Digite a senha novamente:');
          session.etapa = 11;
          return;
        }
        session.senhaConfirmacao = text;

        const usuarioExistente = await buscarUsuarioPorChatId(chatId);
        if (usuarioExistente) {
          await bot.sendMessage(chatId, 'Você já está cadastrado! Use /start para acessar o menu.');
          userSessions.delete(chatId);
          return;
        }

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

        const usuarioSalvo = {
          id: usuarioId,
          nome: session.nome!,
          email: session.email!,
          cpf: session.cpf!,
          endereco: session.endereco!,
          chat_id: chatId
          // Adicione mais campos se quiser
        };

       
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
  }
};
