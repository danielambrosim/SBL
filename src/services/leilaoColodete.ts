import puppeteer from 'puppeteer';

export async function cadastrarNoColodeteLeiloes(usuario: {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  rg: string;
  telefone: string;
  endereco: string;
}) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Acesse a página de cadastro
  await page.goto('https://www.colodeteleiloes.com.br/index.php?pg=cadastropf');

  // Preencha os campos do formulário (os seletores abaixo são exemplos, você deve inspecionar os campos REAIS da página)
  await page.type('input[name="nome"]', usuario.nome);
  await page.type('input[name="email"]', usuario.email);
  await page.type('input[name="senha"]', usuario.senha);
  await page.type('input[name="cpf"]', usuario.cpf);
  await page.type('input[name="rg"]', usuario.rg);
  await page.type('input[name="telefone"]', usuario.telefone);
  await page.type('input[name="endereco"]', usuario.endereco);

  // Marque o checkbox dos termos (verifique o seletor exato)
  await page.click('input[name="termo"]'); // Ajuste conforme o nome real do campo

  // Submeta o formulário (ajuste o seletor exato do botão)
  await page.click('button[type="submit"]');

  // Aguarde navegação/resultado
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  await browser.close();
}
