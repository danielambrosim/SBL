"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarEmail = validarEmail;
exports.validarCPF = validarCPF;
exports.validarCNPJ = validarCNPJ;
exports.validarSenha = validarSenha;
// src/utils/validacao.ts
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validarCPF(cpf) {
    return /^\d{11}$/.test(cpf);
}
function validarCNPJ(cnpj) {
    return /^\d{14}$/.test(cnpj);
}
function validarSenha(senha) {
    return senha.length >= 6;
}
