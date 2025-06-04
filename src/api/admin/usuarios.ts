import { Router } from "express";
const router = Router();

// Função fake só para testes
const buscarUsuariosNoBanco = async () => [
  {
    id: 1,
    nome: "Usuário Exemplo",
    email: "email@exemplo.com",
    cpf: "123.456.789-00",
    endereco: "Rua Teste, 42",
    sites: [
      { id: 1, nome: "Superbid", status: "pendente" },
      { id: 2, nome: "Freitas Leiloeiro", status: "ativo" }
    ]
  }
];

// GET /api/admin/usuarios
router.get("/", async (req, res) => {
  const usuarios = await buscarUsuariosNoBanco();
  res.json(usuarios);
});

export default router;
