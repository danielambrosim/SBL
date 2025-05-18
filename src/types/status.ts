export interface StatusSiteUsuario {
  id: number;
  usuario_id: number;
  site_id: number;
  status: 'pendente' | 'ativo' | 'recusado';
  atualizado_em: Date;
}
