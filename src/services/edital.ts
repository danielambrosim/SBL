import { inserirEdital, buscarEditalPorLink, buscarEditaisBanco} from '../db';
import type { Edital } from '../types/edital'; // crie esse arquivo único de tipo

export interface Edital {
  id: number;
  titulo: string;
  url_pdf: string; // caminho do PDF no disco ou URL
  data_publicacao: string | Date;
  matricula?: string;
}

// Busca os editais já salvos no banco
export async function listarEditais(qtd: number = 10): Promise<Edital[]> {
  return await buscarEditaisBanco(qtd);
}

// Salva um edital novo se não existir ainda no banco
export async function salvarEditalSeNovo(edital: Edital): Promise<void> {
  const existe = await buscarEditalPorLink(edital.url_pdf);
  if (!existe) {
    await inserirEdital(edital);
  }
}



