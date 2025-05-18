import { bot, loggedInUsers } from '../bot';
import { buscarUsuarioPorEmail } from '../db';
import { Message } from 'node-telegram-bot-api';
import bcrypt from 'bcrypt';

interface LoginState {
  etapa: number;
  email?: string;
  lastActivity: number;
}
export const loginSessions = new Map<number, LoginState>();

export const HandlersLogin = {
  iniciar: async (chatId: number) => {
    loginSessions.set(chatId, { etapa: 1, lastActivity: Date.now() });
    await bot.sendMessage(chatId, 'Digite seu e-mail cadastrado:');
  },

  processarEtapa: async (msg: Message, session: LoginState) => {
    const chatId = msg.chat.id;
    const etapa = session.etapa || 1;
    const text = msg.text?.trim();

    switch (etapa) {
      case 1:
        if (!text || !text.includes('@')) {
          await bot.sendMessage(chatId, 'E-mail inválido. Digite novamente:');
          return;
        }
        session.email = text;
        session.etapa = 2;
        await bot.sendMessage(chatId, 'Digite sua senha:');
        break;
      case 2:
        if (!text) {
          await bot.sendMessage(chatId, 'Senha inválida. Digite novamente:');
          return;
        }
        const usuario = await buscarUsuarioPorEmail(session.email!);
        if (!usuario) {
          await bot.sendMessage(chatId, 'Usuário não encontrado. Digite /start para tentar novamente.');
          loginSessions.delete(chatId);
          return;
        }
        const ok = await bcrypt.compare(text, usuario.senha);
        if (!ok) {
          await bot.sendMessage(chatId, 'Senha incorreta. Digite /start para tentar novamente.');
          loginSessions.delete(chatId);
          return;
        }
        loggedInUsers.set(chatId, usuario.id!);
        await bot.sendMessage(chatId, `Login realizado com sucesso! Bem-vindo, ${usuario.nome}.`);
        loginSessions.delete(chatId);
        break;
      default:
        await bot.sendMessage(chatId, 'Erro no login. Digite /start para reiniciar.');
        loginSessions.delete(chatId);
        break;
    }
    session.lastActivity = Date.now();
    loginSessions.set(chatId, session);
  }
};
