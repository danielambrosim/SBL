// src/routes/adminCadastrar.ts

import { Router } from "express";
import { pool } from "../db"; // Ajuste o caminho conforme a estrutura real do seu projeto
import { enviarCSVParaMim } from "../utils/enviarCSVEmail";

const router = Router();

// POST /admin/usuarios/cadastrar
router.post("/cadastrar", async (req, res) => {
  try {
    const { nome, email, senha, endereco, cpf, cnpj, fotoDocumento, fotoComprovante } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome || !email || !senha || !endereco || !cpf || !fotoDocumento || !fotoComprovante) {
      return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos" });
    }

    // Validação do formato do email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    // Verifica se o usuário já existe
    const [existingUser] = await pool.query(
      "SELECT id FROM usuarios WHERE email = ? OR cpf = ?", 
      [email, cpf]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Email ou CPF já cadastrado" });
    }

    // Insere no banco de dados
    await pool.query(
      `INSERT INTO usuarios 
      (nome, email, senha, endereco, cpf, cnpj, foto_documento, foto_comprovante) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, email, senha, endereco, cpf, cnpj || null, fotoDocumento, fotoComprovante]
    );

    // Tenta enviar o CSV para o admin
    try {
      await enviarCSVParaMim();
      return res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso e CSV enviado ao administrador",
      });
    } catch (emailError) {
      console.error("Erro ao enviar CSV:", emailError);
      return res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso, mas houve um erro ao enviar o CSV",
        warning: "O administrador não foi notificado"
      });
    }
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return res.status(500).json({ 
      success: false,
      error: "Erro interno ao processar o cadastro do usuário" 
    });
  }
});


export default router;
