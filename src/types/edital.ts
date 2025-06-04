export interface Edital {
  id?: number;
  titulo: string;
  url_pdf: string;
  data_publicacao: string | Date;
  // Aliases para compatibilidade
  link?: string;      // Sinônimo de url_pdf
  data?: string;      // Sinônimo de data_publicacao
  // Outros campos opcionais
  descricao?: string;
  caminho_pdf?: string;
  data_scraping?: string | Date;
  hash_pdf?: string;
  matricula?: string;
}