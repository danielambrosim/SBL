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
exports.connectionPromise = exports.pool = void 0;
exports.salvarUsuario = salvarUsuario;
exports.buscarUsuarioPorEmail = buscarUsuarioPorEmail;
exports.buscarUsuarioPorChatId = buscarUsuarioPorChatId;
exports.listarSites = listarSites;
exports.listarStatusUsuarioPorSite = listarStatusUsuarioPorSite;
exports.salvarStatusSiteUsuario = salvarStatusSiteUsuario;
exports.atualizarStatusUsuariosNovosSites = atualizarStatusUsuariosNovosSites;
exports.buscarEditaisBanco = buscarEditaisBanco;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv_1.default.config();
exports.pool = promise_1.default.createPool({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'sistema_bot_leilao',
    port: Number(process.env.DATABASE_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Funções básicas para uso nos handlers
function salvarUsuario(usuario) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const sql = `INSERT INTO usuarios
    (nome, email, cpf, cnpj, senha, endereco, chat_id, imagem_doc_id, comprovante_residencia_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = yield exports.pool.execute(sql, [
            usuario.nome,
            usuario.email,
            usuario.cpf,
            (_a = usuario.cnpj) !== null && _a !== void 0 ? _a : null,
            yield bcrypt_1.default.hash(usuario.senha, 10),
            usuario.endereco,
            usuario.chat_id,
            (_b = usuario.imagem_doc_id) !== null && _b !== void 0 ? _b : null,
            (_c = usuario.comprovante_residencia_id) !== null && _c !== void 0 ? _c : null
        ]);
        return result.insertId;
    });
}
function buscarUsuarioPorEmail(email) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = `SELECT * FROM usuarios WHERE email = ?`;
        const [rows] = yield exports.pool.execute(sql, [email]);
        return rows[0] || null;
    });
}
function buscarUsuarioPorChatId(chat_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = `SELECT * FROM usuarios WHERE chat_id = ?`;
        const [rows] = yield exports.pool.execute(sql, [chat_id]);
        return rows[0] || null;
    });
}
function listarSites() {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = 'SELECT * FROM sites_leilao';
        const [rows] = yield exports.pool.query(sql);
        return rows;
    });
}
function listarStatusUsuarioPorSite(usuario_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = `SELECT * FROM status_site_usuario WHERE usuario_id = ?`;
        const [rows] = yield exports.pool.execute(sql, [usuario_id]);
        return rows;
    });
}
function salvarStatusSiteUsuario(usuario_id, site_id, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = `INSERT INTO status_site_usuario (usuario_id, site_id, status) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), atualizado_em = CURRENT_TIMESTAMP`;
        yield exports.pool.execute(sql, [usuario_id, site_id, status]);
    });
}
function atualizarStatusUsuariosNovosSites() {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = `
    INSERT INTO status_site_usuario (usuario_id, site_id, status)
    SELECT u.id, s.id, 'pendente'
    FROM usuarios u
    CROSS JOIN sites_leilao s
    LEFT JOIN status_site_usuario su ON su.usuario_id = u.id AND su.site_id = s.id
    WHERE su.id IS NULL;
  `;
        yield exports.pool.execute(sql);
    });
}
exports.connectionPromise = promise_1.default.createConnection({ /* ... */});
function buscarEditaisBanco() {
    return __awaiter(this, arguments, void 0, function* (qtd = 5) {
        const [rows] = yield exports.pool.query('SELECT titulo, url_pdf as link FROM editais ORDER BY data_publicacao DESC LIMIT ?', [qtd]);
        return rows;
    });
}
