import { Router, RequestHandler } from 'express';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createObjectCsvStringifier } from 'csv-writer';

dotenv.config();

const router = Router();

interface CadastroRequestBody {
    nome: string;
    email: string;
    senha: string;
    endereco: string;
    cpf: string;
    cnpj?: string;
    fotoDocumento: string;
    fotoComprovante: string;
}

async function enviarCSVParaMim(userData: any) {
    const csvStringifier = createObjectCsvStringifier({
        header: [
            {id: 'nome', title: 'NOME'},
            {id: 'email', title: 'EMAIL'},
            {id: 'cpf', title: 'CPF'},
            {id: 'endereco', title: 'ENDEREÇO'},
            {id: 'dataCadastro', title: 'DATA_CADASTRO'}
        ]
    });

    const records = [userData];
    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: 'Novo cadastro no sistema - ' + new Date().toLocaleDateString(),
        text: `Novo usuário cadastrado:\nNome: ${userData.nome}\nEmail: ${userData.email}`,
        attachments: [{
            filename: `cadastro_${Date.now()}.csv`,
            content: csvContent,
            contentType: 'text/csv'
        }]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email com CSV enviado com sucesso');
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        throw error;
    }
}

// Handler SEPARADO e tipado, todo o código aqui!
const cadastrarHandler: RequestHandler<{}, any, CadastroRequestBody> = async (req, res, next) => {
    try {
        const { nome, email, senha, endereco, cpf, cnpj, fotoDocumento, fotoComprovante } = req.body;

        if (!nome || !email || !senha || !endereco || !cpf || !fotoDocumento || !fotoComprovante) {
            res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos" });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "Formato de email inválido" });
            return;
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT id FROM usuarios WHERE email = ? OR cpf = ?", 
            [email, cpf]
        );
        if (rows.length > 0) {
            res.status(409).json({ error: "Email ou CPF já cadastrado" });
            return;
        }

        await pool.query(
            `INSERT INTO usuarios 
            (nome, email, senha, endereco, cpf, cnpj, foto_documento, foto_comprovante) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, email, senha, endereco, cpf, cnpj || null, fotoDocumento, fotoComprovante]
        );

        const userData = {
            nome, 
            email, 
            cpf, 
            endereco,
            dataCadastro: new Date().toISOString()
        };

        try {
            await enviarCSVParaMim(userData);
            res.status(201).json({
                success: true,
                message: "Usuário cadastrado e notificação enviada"
            });
        } catch (emailError) {
            console.error("Erro no envio de email:", emailError);
            res.status(201).json({
                success: true,
                warning: "Usuário cadastrado, mas falha no envio da notificação"
            });
        }
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).json({ 
            success: false,
            error: "Erro interno no servidor" 
        });
    }
};

// Aqui, apenas PASSA o handler, SEM arrow function!
router.post("/cadastrar", cadastrarHandler);

export default router;
