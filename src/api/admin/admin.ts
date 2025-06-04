import { Router } from "express";
import { pool } from "../../db";

const router = Router();

// Lista todos usuários com seus sites e status
router.get("/usuarios", async (req, res) => {
  const [users]: any = await pool.query("SELECT * FROM usuarios");
  const [status]: any = await pool.query(`
    SELECT su.usuario_id, su.site_id, su.status, s.nome
    FROM status_site_usuario su
    JOIN sites_leilao s ON su.site_id = s.id
  `);
  const usuarios = users.map((u: any) => ({
    ...u,
    sites: status.filter((s: any) => s.usuario_id === u.id).map((s: any) => ({
      id: s.site_id,
      nome: s.nome,
      status: s.status,
    })),
  }));
  res.json(usuarios);
});

// Atualiza status do usuário em um site
router.post("/usuarios/:usuarioId/sites/:siteId/status", async (req, res) => {
  const { usuarioId, siteId } = req.params;
  const { status } = req.body;
  await pool.execute(
    `UPDATE status_site_usuario SET status = ?, atualizado_em = NOW() WHERE usuario_id = ? AND site_id = ?`,
    [status, usuarioId, siteId]
  );
  res.json({ ok: true });
});

export default router;
