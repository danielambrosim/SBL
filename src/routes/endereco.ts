import { Router } from "express";
import { buscarEnderecoPorCep } from "../services/viacep";
import { pool } from "../db";

const router = Router();

router.post("/consultar-cep", async (req, res) => {
  try {
    const { cep } = req.body;
    if (!cep) return res.status(400).json({ error: "O campo 'cep' é obrigatório." });
    const endereco = await buscarEnderecoPorCep(cep);
    if (!endereco) return res.status(404).json({ error: "CEP não encontrado ou inválido!" });
    res.json(endereco);
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao consultar o CEP." });
  }
});

router.post("/salvar-endereco", async (req, res) => {
  const { userId, cep, logradouro, numero, complemento, bairro, localidade, uf } = req.body;
  if (!userId || !cep || !logradouro || !numero || !bairro || !localidade || !uf) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  try {
    await pool.execute(
      `UPDATE usuarios SET
        cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ?
       WHERE id = ?`,
      [cep, logradouro, numero, complemento || null, bairro, localidade, uf, userId]
    );
    res.json({ message: "Endereço salvo com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar endereço." });
  }
});

export default router;