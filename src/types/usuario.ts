export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  cpf: string;
  cnpj?: string;
  senha: string;
  endereco: string;
  chat_id: number;
  imagem_doc_id?: string;
  comprovante_residencia_id?: string;
  criado_em?: Date;
}
