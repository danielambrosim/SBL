import { bot } from '../bot';
import { buscarUsuarioPorChatId, listarStatusUsuarioPorSite, listarSites } from '../db';

export const HandlersStatus = {
  consultar: async (chatId: number) => {
    const usuario = await buscarUsuarioPorChatId(chatId);
    if (!usuario) {
      await bot.sendMessage(chatId, 'Você precisa estar cadastrado para ver seu status.');
      return;
    }
    const statusSites = await listarStatusUsuarioPorSite(usuario.id!);
    const sites = await listarSites();

    if (!statusSites.length) {
      await bot.sendMessage(chatId, 'Nenhum status encontrado.');
      return;
    }

    let mensagem = '📊 *Seu status em cada site de leilão:*\n\n';
    for (const status of statusSites) {
      const site = sites.find(s => s.id === status.site_id);
      mensagem += `• ${site?.nome ?? 'Site desconhecido'}: *${status.status}*\n`;
    }
    await bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
  }
};
