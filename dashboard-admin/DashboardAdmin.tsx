// src/DashboardAdmin.tsx
import React, { useEffect, useState } from "react";
import './DashboardAdmin.css';


interface SiteStatus {
  id: number;
  nome: string;
  status: "ativo" | "pendente" | "recusado";
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  endereco: string;
  sites: SiteStatus[];
}

export default function DashboardAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsuarios() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/usuarios");
        if (!res.ok) throw new Error("Erro ao buscar usuários");
        const data = await res.json();
        setUsuarios(data);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchUsuarios();
  }, []);

  async function atualizarStatus(usuarioId: number, siteId: number, status: "ativo" | "pendente" | "recusado") {
    try {
      // Atualização otimista
      setUsuarios(us =>
        us.map(u =>
          u.id === usuarioId
            ? { ...u, sites: u.sites.map(s => (s.id === siteId ? { ...s, status } : s)) }
            : u
        )
      );
      const res = await fetch(`/api/admin/usuarios/${usuarioId}/sites/${siteId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar status");
    } catch (err) {
      alert("Erro ao atualizar status. Tente novamente.");
      // Recarregar a lista para garantir consistência
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();
      setUsuarios(data);
    }
  }

if (loading) return <p>Carregando usuários...</p>;
if (error) return <p style={{ color: "red" }}>Erro: {error}</p>;

return (
  <div className="container">
    <h2>Painel de Administração</h2>
    {usuarios.map(user => (
      <div key={user.id} className="user-card">
        <div><b>Nome:</b> {user.nome}</div>
        <div><b>Email:</b> {user.email}</div>
        <div><b>CPF:</b> {user.cpf}</div>
        <div><b>Endereço:</b> {user.endereco}</div>
        <div>
          <b>Status em sites:</b>
          <ul className="site-list">
            {user.sites.map(site => (
              <li key={site.id} className="site-item">
                <b>{site.nome}:</b> {site.status}{" "}
                <div className="button-group">
                  <button onClick={() => atualizarStatus(user.id, site.id, "ativo")}>Ativar</button>
                  <button onClick={() => atualizarStatus(user.id, site.id, "pendente")}>Pendente</button>
                  <button onClick={() => atualizarStatus(user.id, site.id, "recusado")}>Recusar</button>
                  <button onClick={() => navigator.clipboard.writeText(
                    `${user.nome}, ${user.email}, ${user.cpf}, ${user.endereco}`)}>Copiar dados</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ))}
  </div>
);
}

function statusColor(status: string) {
  switch (status) {
    case "ativo":
      return "green";
    case "pendente":
      return "orange";
    case "recusado":
      return "red";
    default:
      return "black";
  }
}
