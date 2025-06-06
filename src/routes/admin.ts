import { Router } from "express";
import { buscarUsuariosPainelAdmin } from "../db";
import { enviarCSVParaMim } from '../utils/enviarCSVEmail';

const router = Router();

router.get("/admin/usuarios", async (req, res) => {
  const usuarios = await buscarUsuariosPainelAdmin();
  res.json(usuarios);
});

// NOVA ROTA: Dispara o envio do CSV por email
router.post("/admin/usuarios/exportar-csv", async (req, res) => {
  try {
    await enviarCSVParaMim();
    res.json({ ok: true, msg: 'CSV enviado para seu email!' });
  } catch (err: any) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

export default router;
