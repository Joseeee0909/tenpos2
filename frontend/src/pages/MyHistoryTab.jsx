import { useState, useMemo } from "react";
import Toolbar, { SearchBox, ActionButtons } from "../components/Toolbar";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LogsTable from "../components/LogsTable";
import { logs as allLogs } from "../data/mockData";
import "../styles/Misc.css";

const CURRENT_USER = "Carlos M.";

const SUMMARY_ROWS = [
  { label: "Usuario actual", value: "Carlos Mendoza (Admin)" },
  { label: "Operaciones realizadas hoy", value: "127" },
  { label: "Última operación", value: "Hace 3 minutos" },
  { label: "Sesiones activas", value: "1 (Navegador - Dispositivo actual)" },
];

const downloadIcon = (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <path d="M6 1v6M3 4l3 3 3-3" />
    <path d="M1 9h10" />
  </svg>
);

export default function MyHistoryTab() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allLogs.filter(
      (l) =>
        l.user === CURRENT_USER &&
        (!q ||
          l.action.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q)),
    );
  }, [search]);
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: 1,
      changes: 2,
      users: 5,
      errors: 4,
    };
  }, []);

  return (
    <div>
      <PageHeader
        label="Gestion de pedidos"
        title={
          view === "list"
            ? "Gestion de pedidos"
            : editingOrderId
              ? "Editar pedido"
              : "Nuevo pedido"
        }
        subtitle={
          view === "list" ? `${stats.total} pedidos registrados hoy` : ""
        }
        iconColor="#3b3b7d"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
            <rect x="4" y="3" width="12" height="14" rx="2" />
            <path d="M7 7h6M7 10h4" />
          </svg>
        }
        actions={
          view === "list" ? (
            <>
              <button
                className="btn-outline"
                onClick={() => navigate("/utilidades")}
              >
                Actividad
              </button>
              <button className="btn-outline" onClick={() => navigate("/utilidades/reportes")}type="button">
                Reportes
              </button>
              <button className="btn-outline" onClick={() => navigate("/utilidades/sesiones")}type="button">
                Sesiones
              </button>
              <div className="ph-divider"></div>
            </>
          ) : null
        }
      />

      <div className="user-summary">
        {SUMMARY_ROWS.map(({ label, value }) => (
          <div key={label} className="summary-row">
            <span className="summary-label">{label}</span>
            <span className="summary-val">{value}</span>
          </div>
        ))}
      </div>

      <Toolbar>
        <SearchBox
          placeholder="Buscar en mis operaciones..."
          value={search}
          onChange={setSearch}
        />
        <ActionButtons
          buttons={[
            {
              label: "Descargar mi historial",
              icon: downloadIcon,
              onClick: () => alert("Descargando historial personal..."),
              primary: true,
            },
          ]}
        />
      </Toolbar>

      <LogsTable logs={filtered} columns="myhistory" />
    </div>
  );
}
