import { bot } from '../bot';
import { listarSites } from '../db';

export const HandlersAdicionais = {
  listarSitesParaBusca: async (chatId: number) => {
    const sites = await listarSites();
    if (!sites.length) {
      await bot.sendMessage(chatId, 'Nenhum site cadastrado para busca de editais.');
      return;
    }
    await bot.sendMessage(chatId, 'Escolha um site para ver editais:', {
      reply_markup: {
        inline_keyboard: sites.map(site => [
          { text: site.nome, callback_data: `edital_${site.id}` }
        ])
      }
    });
  },
  ajuda: async (chatId: number) => {
    await bot.sendMessage(chatId, 'ℹ️ Este bot permite cadastro, login, consulta de status e acesso a editais!');
  }
};
