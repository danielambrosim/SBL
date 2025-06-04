// src/handlers/admin.ts
import { atualizarStatusUsuarioNoBanco, buscarUsuariosNoBanco } from '../db';

export const HandlersAdmin = {
  // Atualiza status do usuário (ativo/pendente/recusado)
  async atualizarStatusUsuario(chatId: number, userId: number, novoStatus: 'ativo' | 'pendente' | 'recusado', bot: any) {
    try {
      await atualizarStatusUsuarioNoBanco(userId, novoStatus);
      await bot.sendMessage(chatId, `Status do usuário ${userId} atualizado para: ${novoStatus}`);
    } catch (e) {
      console.error(e);
      await bot.sendMessage(chatId, 'Erro ao atualizar status do usuário.');
    }
  },

  // Mostra detalhes do usuário
  async mostrarDetalhesUsuario(chatId: number, userId: number, bot: any) {
    try {
      const usuarios = await buscarUsuariosNoBanco();
      const usuario = usuarios.find(u => u.id === userId);
      if (!usuario) {
        await bot.sendMessage(chatId, "Usuário não encontrado.");
        return;
      }
      const detalhes = `
👤 *Detalhes do usuário:*

Nome: ${usuario.nome}
Email: ${usuario.email}
CPF: ${usuario.cpf}
Endereço: ${usuario.endereco}
Status: (coloque o status que quiser)
      `;
      await bot.sendMessage(chatId, detalhes, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error(e);
      await bot.sendMessage(chatId, 'Erro ao buscar detalhes do usuário.');
    }
  }
};
