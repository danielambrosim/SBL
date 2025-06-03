import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re
import mysql.connector  # Ou seu driver de banco de dados

def existe_edital_no_banco(url_pdf):
    # Implemente a consulta no banco. Exemplo com MySQL:
    conn = mysql.connector.connect(user='usuario', password='senha', host='localhost', database='sua_db')
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM editais WHERE url_pdf = %s LIMIT 1", (url_pdf,))
    existe = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return existe

def inserir_edital(titulo, url_pdf, data_publicacao, descricao=None):
    conn = mysql.connector.connect(user='usuario', password='senha', host='localhost', database='sua_db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO editais (titulo, url_pdf, data_publicacao, descricao) VALUES (%s, %s, %s, %s)",
        (titulo, url_pdf, data_publicacao, descricao)
    )
    conn.commit()
    cursor.close()
    conn.close()

def buscar_editais_no_site(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        editais = []
        vistos = set()

        for a in soup.find_all('a', href=True):
            texto = a.get_text(strip=True)
            href = a['href']
            if re.search(r'edital', texto, re.IGNORECASE) or href.lower().endswith('.pdf'):
                data_match = re.search(r'\d{2}/\d{2}/\d{4}', texto)
                data = data_match.group(0) if data_match else None
                pdf = urljoin(url, href) if href else None
                if texto not in vistos and pdf:
                    # SALVAR NO BANCO SE NOVO
                    if not existe_edital_no_banco(pdf):
                        inserir_edital(titulo=texto, url_pdf=pdf, data_publicacao=data)
                        # Se quiser baixar o PDF:
                        # r = requests.get(pdf)
                        # with open(f'/caminho/para/salvar/{texto}.pdf', 'wb') as f:
                        #     f.write(r.content)
                    editais.append({
                        'titulo': texto,
                        'data': data,
                        'pdf': pdf
                    })
                    vistos.add(texto)
        return editais
    except Exception as e:
        print(f'Erro ao buscar editais: {e}')
        return []
