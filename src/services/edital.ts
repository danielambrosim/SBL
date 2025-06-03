import axios from 'axios';
import cheerio from 'cheerio';
import { inserirEdital, buscarEditalPorLink } from '../db'; // Funções que você deve criar para manipular o banco

export interface Edital {
  titulo: string;
  link: string;
  data?: string;
}

export async function buscarEditais(
  url: string,
  seletor: string = 'a[href$=".pdf"]'
): Promise<Edital[]> {
  try {
    const response = await axios.get<string>(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Bot Leilao)' }
    });

    if (!response.data) throw new Error('Sem conteúdo retornado do site.');

    const $ = cheerio.load(response.data);
    let editais: Edital[] = [];

    $(seletor).each((_, el) => {
      const href = $(el).attr('href');
      const texto = $(el).text().trim();
      if (href) {
        const linkCompleto = href.startsWith('http') ? href : new URL(href, url).href;
        const data = texto.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
        editais.push({ titulo: texto || 'Edital', link: linkCompleto, data });
      }
    });

    if (editais.length === 0) {
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const texto = $(el).text().trim();
        if (href && /edital/i.test(texto + href)) {
          const linkCompleto = href.startsWith('http') ? href : new URL(href, url).href;
          const data = texto.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
          editais.push({ titulo: texto || 'Edital', link: linkCompleto, data });
        }
      });
    }

    // Remove duplicados por link
    const unicos: Edital[] = [];
    const linksVistos = new Set<string>();
    for (const edital of editais) {
      if (!linksVistos.has(edital.link)) {
        unicos.push(edital);
        linksVistos.add(edital.link);
      }
    }

    // Agora, salva no banco editais novos!
    for (const edital of unicos) {
      const existe = await buscarEditalPorLink(edital.link); // Você precisa implementar essa função
      if (!existe) {
        await inserirEdital(edital); // Essa função insere o edital no banco. Você pode adicionar campos!
        // Opcional: aqui pode baixar o PDF e salvar local/cloud, gravando o caminho no banco
      }
    }

    return unicos.slice(0, 10).length > 0
      ? unicos.slice(0, 10)
      : [
          {
            titulo: 'Nenhum edital encontrado',
            link: '#'
          }
        ];

  } catch (error: any) {
    console.error('Erro ao buscar editais:', error.response?.status, error.message);
    return [
      {
        titulo: 'Nenhum edital encontrado',
        link: '#'
      }
    ];
  }
}
