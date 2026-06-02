import { useState, useMemo, useEffect } from "react";
import StatCard from "../components/StatCard";
import { useNavigate, NavLink, useLocation, Navigate } from "react-router-dom";
import Toolbar, {
  SearchBox,
  FilterChips,
  ActionButtons,
} from "../components/Toolbar";
import authService from "../services/api";
import LogsTable from "../components/LogsTable";

import PageHeader from "../components/PageHeader";

const TYPE_CHIPS = [
  { key: "all", label: "Todos", color: "#5eead4" },
  { key: "create", label: "Crear", color: "#059669" },
  { key: "edit", label: "Editar", color: "#0369a1" },
  { key: "delete", label: "Eliminar", color: "#dc2626" },
];

export default function ActivityTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setType] = useState("all");
  const [logs, setLogs] = useState([]);

  const [view, setView] = useState("list");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await authService.getLogs({
          page: 1,
          limit: 50,
        });
        const formattedLogs = res.data.map((log) => ({
          ...log,

          time: new Date(log.createdAt).toLocaleTimeString(),
          user: log.usuarioNombre || log.usuarioUsername || "Sin usuario",
          role: log.modulo,
          action: log.accion,
          type: log.tipo,
          status: log.exito ? "success" : "error",
          avatar: (log.usuarioNombre || log.usuarioUsername || "?")
            .charAt(0)
            .toUpperCase(),
        }));
        // axios: data viene en res.data
        setLogs(formattedLogs);
      } catch (err) {
        console.error("Error cargando logs:", err);
      }
    };

    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        (!typeFilter || typeFilter === "all" || l.action === typeFilter) &&
        (!q ||
          l.user.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q)),
    );
  }, [search, typeFilter, logs]);

  const stats = useMemo(() => {
    const hoy = new Date();

    const eventosHoy = logs.filter((log) => {
      const fecha = new Date(log.createdAt);

      return (
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getDate() === hoy.getDate()
      );
    });

    return {
      total: eventosHoy.length,
      changes: eventosHoy.filter((l) =>
        ["POST", "PUT", "PATCH", "DELETE"].includes(l.metodo),
      ).length,
      users: new Set(eventosHoy.map((l) => l.usuarioId).filter(Boolean)).size,
      errors: eventosHoy.filter((l) => !l.exito || l.statusCode >= 400).length,
    };
  }, [logs]);

  const exportIcon = (
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

  const filterIcon = (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 3h8M2 6h8M2 9h8" />
    </svg>
  );

  return (
    <div>
      <PageHeader
        label="Actividad reciente"
        title={
          view === "list"
            ? "Actividad reciente"
            : editingOrderId
              ? "Editar pedido"
              : "Nuevo pedido"
        }
        subtitle={
          view === "list" ? `${stats.total} eventos registrados hoy` : ""
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
                onClick={() => navigate("/utilidades/historial")}
              >
                Historial
              </button>
              <button
                className="btn-outline"
                onClick={() => navigate("/utilidades/reportes")}
                type="button"
              >
                Reportes
              </button>
              <button
                className="btn-outline"
                onClick={() => navigate("/utilidades/sesiones")}
                type="button"
              >
                Sesiones
              </button>
              <div className="ph-divider"></div>
            </>
          ) : null
        }
      />
      <div className="stats-row">
        <StatCard
          value={stats.total}
          label="Eventos hoy"
          iconBg="#f0f9fb"
          icon=<svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#0891b2"
            strokeWidth="1.6"
          >
            <path d="M2 8h12M8 2v12M2 8l2-2M2 8l2 2M12 8l-2-2M12 8l-2 2" />
          </svg>
        />
        <StatCard
          value={stats.changes}
          label="Cambios realizados"
          iconBg="#ecfdf5"
          icon=<svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#059669"
            strokeWidth="1.6"
          >
            <path d="M3 8h10M8 2v12M2 8l2-2M2 8l2 2" />
          </svg>
        />
        <StatCard
          value={stats.users}
          label="Usuarios activos"
          iconBg="#dbeafe"
          icon=<svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#0369a1"
            strokeWidth="1.6"
          >
            <circle cx="8" cy="5" r="3" />
            <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" />
          </svg>
        />
        <StatCard
          value={stats.errors}
          label="Errores detectados"
          iconBg="#fee2e2"
          icon=<svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.6"
          >
            <circle cx="8" cy="8" r="5.5" />
            <path d="M6 6l4 4M10 6l-4 4" />
          </svg>
        />
      </div>

      <Toolbar>
        <SearchBox
          placeholder="Buscar usuario, acción, IP..."
          value={search}
          onChange={setSearch}
        />
        <FilterChips
          chips={TYPE_CHIPS}
          active={typeFilter}
          onSelect={setType}
        />
        <ActionButtons
          buttons={[
            {
              label: "Filtrar",
              icon: filterIcon,
              onClick: () => alert("Filtros avanzados"),
            },
            {
              label: "Exportar",
              icon: exportIcon,
              onClick: () => alert("Exportando logs..."),
              primary: true,
            },
          ]}
        />
      </Toolbar>

      <LogsTable logs={filtered} columns="full" />
    </div>
  );
}
