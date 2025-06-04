import React, { useEffect, useState } from "react";
import "./DashboardAdmin.css";


interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  endereco: string;
  sites: { id: number; nome: string; status: string }[];
}

export default function DashboardAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then(r => r.json())
      .then(setUsuarios);
  }, []);

  const atualizarStatus = async (usuarioId: number, siteId: number, status: string) => {
    await fetch(`/api/admin/usuarios/${usuarioId}/sites/${siteId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setUsuarios(users => users.map(u =>
      u.id === usuarioId
        ? { ...u, sites: u.sites.map(s =>
            s.id === siteId ? { ...s, status } : s
          )}
        : u
    ));
  };

return (
  <div className="admin-container">
    <h2>Painel de Administração</h2>
    {usuarios.map(user => (
      <div key={user.id} className="admin-card">
        <div><b>Nome:</b> {user.nome}</div>
        <div><b>Email:</b> {user.email}</div>
        <div><b>CPF:</b> {user.cpf}</div>
        <div><b>Endereço:</b> {user.endereco}</div>
        <div>
          <b>Status em sites:</b>
          <ul>
            {user.sites.map(site => (
              <li key={site.id}>
                <b>{site.nome}:</b> {site.status}{" "}
                <button className="status-btn" onClick={() => atualizarStatus(user.id, site.id, "ativo")}>Ativar</button>
                <button className="status-btn" onClick={() => atualizarStatus(user.id, site.id, "pendente")}>Pendente</button>
                <button className="status-btn" onClick={() => atualizarStatus(user.id, site.id, "recusado")}>Recusar</button>
                <button className="status-btn" onClick={() => navigator.clipboard.writeText(
                  `${user.nome}, ${user.email}, ${user.cpf}, ${user.endereco}`
                )}>Copiar dados</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ))}
  </div>
);
}
