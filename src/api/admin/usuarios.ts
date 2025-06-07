import { Router } from "express";
import { buscarUsuariosNoBanco } from "../../db";  // ajuste o caminho correto para seu arquivo db.ts

const router = Router();

// GET /api/admin/usuarios
router.get("/handlers/cadastrar", async (req, res) => {
  try {
    const usuarios = await buscarUsuariosNoBanco();
    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao buscar usuários no banco:", error);
    res.status(500).json({ error: "Erro interno ao buscar usuários" });
  }
});

export default router;