"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardAdmin;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/DashboardAdmin.tsx
const react_1 = require("react");
require("./DashboardAdmin.css");
function DashboardAdmin() {
    const [usuarios, setUsuarios] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        async function fetchUsuarios() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/admin/usuarios");
                if (!res.ok)
                    throw new Error("Erro ao buscar usuários");
                const data = await res.json();
                setUsuarios(data);
            }
            catch (err) {
                setError(err.message || "Erro desconhecido");
            }
            finally {
                setLoading(false);
            }
        }
        fetchUsuarios();
    }, []);
    async function atualizarStatus(usuarioId, siteId, status) {
        try {
            // Atualização otimista
            setUsuarios(us => us.map(u => u.id === usuarioId
                ? { ...u, sites: u.sites.map(s => (s.id === siteId ? { ...s, status } : s)) }
                : u));
            const res = await fetch(`/api/admin/usuarios/${usuarioId}/sites/${siteId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok)
                throw new Error("Falha ao atualizar status");
        }
        catch (err) {
            alert("Erro ao atualizar status. Tente novamente.");
            // Recarregar a lista para garantir consistência
            const res = await fetch("/api/admin/usuarios");
            const data = await res.json();
            setUsuarios(data);
        }
    }
    if (loading)
        return (0, jsx_runtime_1.jsx)("p", { children: "Carregando usu\u00E1rios..." });
    if (error)
        return (0, jsx_runtime_1.jsxs)("p", { style: { color: "red" }, children: ["Erro: ", error] });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Painel de Administra\u00E7\u00E3o" }), usuarios.map(user => ((0, jsx_runtime_1.jsxs)("div", { className: "user-card", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Nome:" }), " ", user.nome] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Email:" }), " ", user.email] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "CPF:" }), " ", user.cpf] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Endere\u00E7o:" }), " ", user.endereco] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Status em sites:" }), (0, jsx_runtime_1.jsx)("ul", { className: "site-list", children: user.sites.map(site => ((0, jsx_runtime_1.jsxs)("li", { className: "site-item", children: [(0, jsx_runtime_1.jsxs)("b", { children: [site.nome, ":"] }), " ", site.status, " ", (0, jsx_runtime_1.jsxs)("div", { className: "button-group", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => atualizarStatus(user.id, site.id, "ativo"), children: "Ativar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => atualizarStatus(user.id, site.id, "pendente"), children: "Pendente" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => atualizarStatus(user.id, site.id, "recusado"), children: "Recusar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => navigator.clipboard.writeText(`${user.nome}, ${user.email}, ${user.cpf}, ${user.endereco}`), children: "Copiar dados" })] })] }, site.id))) })] })] }, user.id)))] }));
}
function statusColor(status) {
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
