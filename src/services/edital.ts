import { inserirEdital, buscarEditalPorLink, buscarEditaisBanco} from '../db';

export interface Edital {
  titulo: string;
  link: string;
  data?: string;
  matricula?: string;
}

// Busca os editais já salvos no banco
export async function listarEditais(qtd: number = 10): Promise<Edital[]> {
  return await buscarEditaisBanco(qtd);
}

// Salva um edital novo se não existir ainda no banco
export async function salvarEditalSeNovo(edital: Edital): Promise<void> {
  const existe = await buscarEditalPorLink(edital.link);
  if (!existe) {
    await inserirEdital(edital);
  }
}



