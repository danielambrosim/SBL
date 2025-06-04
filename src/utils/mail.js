"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
exports.enviarCodigo = enviarCodigo;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
async function enviarCodigo(email, codigo) {
    await exports.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Código de Confirmação',
        text: `Seu código de confirmação é: ${codigo}`,
    });
}
