import axios from 'axios';
import cheerio from 'cheerio';

export interface Edital {
  titulo: string;
  link: string;
}

export async function buscarEditais(url: string, seletor: string = 'a[href$=".pdf"]'): Promise<Edital[]> {
  try {
    const { data } = await axios.get<string>(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Bot Leilao)' }
    });

    const $ = cheerio.load(data);
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
  } catch (error) {
    console.error('Erro ao buscar editais:', error);
    return [];
  }
}
