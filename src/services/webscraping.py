import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re
import mysql.connector

def existe_edital_no_banco(cursor, url_pdf):
    cursor.execute("SELECT 1 FROM editais WHERE url_pdf = %s LIMIT 1", (url_pdf,))
    return cursor.fetchone() is not None

def inserir_edital(cursor, titulo, url_pdf, data_publicacao=None):
    cursor.execute(
        "INSERT INTO editais (titulo, url_pdf, data_publicacao) VALUES (%s, %s, %s)",
        (titulo, url_pdf, data_publicacao)
    )

def buscar_editais_no_site(url, db_config):
    try:
        response = requests.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        vistos = set()
        editais = []

        # Conecta ao banco uma vez só
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        for a in soup.find_all('a', href=True):
            texto = a.get_text(strip=True)
            href = a['href']

            if re.search(r'edital', texto, re.I) or href.lower().endswith('.pdf'):
                data_match = re.search(r'\d{2}/\d{2}/\d{4}', texto)
                data = data_match.group(0) if data_match else None
                pdf_url = urljoin(url, href)

                if texto not in vistos and pdf_url:
                    vistos.add(texto)

                    if not existe_edital_no_banco(cursor, pdf_url):
                        inserir_edital(cursor, texto, pdf_url, data)
                        conn.commit()

                    editais.append({
                        'titulo': texto,
                        'data': data,
                        'pdf': pdf_url
                    })

        cursor.close()
        conn.close()

        return editais

    except Exception as e:
        print(f'Erro ao buscar editais: {e}')
        return []
