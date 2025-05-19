import axios from 'axios';
import cheerio from 'cheerio';
import { buscarEditaisBanco } from '../db';

export interface Edital {
  titulo: string;
  link: string;
}

export async function buscarEditais(url: string, seletor: string = 'a[href$=".pdf"]'): Promise<Edital[]> {
  try {
    const response = await axios.get<string>(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Bot Leilao)' }
    });

    if (!response.data) throw new Error('Sem conteúdo retornado do site.');

    const $ = cheerio.load(response.data);
    const editais: Edital[] = [];

    $(seletor).each((_, element) => {
      const href = $(element).attr('href');
      const texto = $(element).text().trim();
      if (href) {
        const linkCompleto = href.startsWith('http') ? href : new URL(href, url).href;
        editais.push({ titulo: texto || 'Edital', link: linkCompleto });
      }
    });

    return editais.slice(0, 10); // Limita a 10 resultados
  } catch (error: any) {
    console.error('Erro ao buscar editais:', error.response?.status, error.message);

    // Aqui busca no banco caso o scraping falhe
      const editaisBanco = await buscarEditaisBanco(5);
    if (editaisBanco.length > 0) {
      return editaisBanco;
    }
    // Caso nem no banco tenha, retorna um exemplo
    return [
      {
        titulo: 'Nenhum edital encontrado',
        link: '#'
      }
    ];
  }
}
