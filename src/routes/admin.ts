// src/routes/admin.ts
import { Router } from "express";
// importe buscarUsuariosNoBanco de onde você implementou
import { buscarUsuariosPainelAdmin } from "../db";


const router = Router();

router.get("/admin/usuarios", async (req, res) => {
  const usuarios = await buscarUsuariosPainelAdmin();
  res.json(usuarios);
});

export default router;
