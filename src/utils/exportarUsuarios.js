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
exports.exportarUsuariosParaCSV = exportarUsuariosParaCSV;
// src/utils/exportarUsuarios.ts
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function exportarUsuariosParaCSV() {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield db_1.pool.query('SELECT * FROM usuarios');
        if (!rows || !rows.length)
            throw new Error('Nenhum usuário encontrado.');
        const header = Object.keys(rows[0]).join(';');
        const lines = rows.map((row) => Object.values(row).join(';'));
        const csvContent = [header, ...lines].join('\n');
        const exportPath = path_1.default.join(__dirname, '../../usuarios_leilao.csv');
        fs_1.default.writeFileSync(exportPath, csvContent, { encoding: 'utf8' });
        return exportPath;
    });
}
