"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarEditais = listarEditais;
exports.salvarEditalSeNovo = salvarEditalSeNovo;
const db_1 = require("../db");
// Busca os editais já salvos no banco
async function listarEditais(qtd = 10) {
    return await (0, db_1.buscarEditaisBanco)(qtd);
}
// Salva um edital novo se não existir ainda no banco
async function salvarEditalSeNovo(edital) {
    const existe = await (0, db_1.buscarEditalPorLink)(edital.url_pdf);
    if (!existe) {
        await (0, db_1.inserirEdital)(edital);
    }
}
