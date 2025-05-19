"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarEditais = buscarEditais;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const db_1 = require("../db");
function buscarEditais(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, seletor = 'a[href$=".pdf"]') {
        var _a;
        try {
            const response = yield axios_1.default.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Bot Leilao)' }
            });
            if (!response.data)
                throw new Error('Sem conteúdo retornado do site.');
            const $ = cheerio_1.default.load(response.data);
            const editais = [];
            $(seletor).each((_, element) => {
                const href = $(element).attr('href');
                const texto = $(element).text().trim();
                if (href) {
                    const linkCompleto = href.startsWith('http') ? href : new URL(href, url).href;
                    editais.push({ titulo: texto || 'Edital', link: linkCompleto });
                }
            });
            return editais.slice(0, 10); // Limita a 10 resultados
        }
        catch (error) {
            console.error('Erro ao buscar editais:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.status, error.message);
            // Aqui busca no banco caso o scraping falhe
            const editaisBanco = yield (0, db_1.buscarEditaisBanco)(5);
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
    });
}
