import { buscarEditaisBanco, listarSites } from '../db';

export const HandlersEditais = {
  async listarEditais(chatId: number, bot: any) {
    try {
      const editais = await buscarEditaisBanco(20);
      if (!editais.length) {
        await bot.sendMessage(chatId, "Nenhum edital disponível no momento.");
        return;
      }
      const keyboard = editais.map(e => [{
        text: `${e.titulo} (${e.data})`,
        url: e.link
      }]);
      await bot.sendMessage(chatId, "Selecione o edital para baixar:", {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (e) {
      console.error(e);
      await bot.sendMessage(chatId, 'Erro ao listar editais.');
    }
  },

  async listarEditaisPorSite(chatId: number, siteId: number, bot: any) {
    try {
      const sites = await listarSites();
      const site = sites.find(s => s.id === siteId);
      if (!site) {
        await bot.sendMessage(chatId, 'Site de leilão não encontrado.');
        return;
      }
      await bot.sendMessage(chatId, `🔎 Buscando editais em: *${site.nome}*...`, { parse_mode: 'Markdown' });

      // Se sua função buscarEditaisBanco pode receber filtro por site, use:
      // const editais = await buscarEditaisPorSite(site.nome);
      // Se não, filtre manualmente:
      const editais = (await buscarEditaisBanco(50)).filter(e => e.titulo.toLowerCase().includes(site.nome.toLowerCase()));

      if (!editais.length) {
        await bot.sendMessage(chatId, 'Nenhum edital encontrado neste site.');
        return;
      }
      const keyboard = editais.map(e => [{
        text: `${e.titulo} (${e.data})`,
        url: e.link
      }]);
      await bot.sendMessage(chatId, `*Editais encontrados em ${site.nome}:*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (e) {
      console.error(e);
      await bot.sendMessage(chatId, 'Erro ao listar editais do site.');
    }
  }
};
