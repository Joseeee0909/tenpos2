import { useState, useMemo, useEffect, useContext } from "react";
import Toolbar, { SearchBox, ActionButtons } from "../components/Toolbar";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LogsTable from "../components/LogsTable";
import authService from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "../styles/Misc.css";

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
  const [view] = useState("list");
  const [logs, setLogs] = useState([]);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await authService.getMyHistory();

        console.log("Historial completo:", res);

        // 🔥 AQUÍ ESTÁ EL FIX
        const data = res?.data || [];

        const myLogs = data.filter(
          (log) =>
            log.usuarioId === user?.id ||
            log.usuarioUsername === user?.username
        );

        console.log("Historial filtrado:", myLogs);

        setLogs(myLogs);
      } catch (error) {
        console.error("Error cargando historial:", error);
      }
    };

    if (user) fetchLogs();
  }, [user]);

  

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return logs.filter((log) => {
      if (!q) return true;

      return (
        log.accion?.toLowerCase().includes(q) ||
        log.modulo?.toLowerCase().includes(q) ||
        log.detalle?.toLowerCase().includes(q)
      );
    });
  }, [logs, search]);




  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];

    const operacionesHoy = logs.filter(
      (log) => log.createdAt?.split("T")[0] === hoy
    ).length;

    const ultimaOperacion =
      logs.length > 0
        ? new Date(logs[0].createdAt).toLocaleString()
        : "Sin registros";

    const sesionesActivas =
      logs.filter(
        (log) =>
          log.tipo === "sesion" &&
          log.accion === "login"
      ).length -
      logs.filter(
        (log) =>
          log.tipo === "sesion" &&
          log.accion === "logout"
      ).length;

    return {
      operacionesHoy,
      ultimaOperacion,
      sesionesActivas: Math.max(0, sesionesActivas),
    };
  }, [logs]);

  const summaryRows = [
    {
      label: "Usuario actual",
      value: `${user?.username || "-"} (${user?.rol || "-"})`,
    },
    {
      label: "Operaciones realizadas hoy",
      value: stats.operacionesHoy,
    },
    {
      label: "Última operación",
      value: stats.ultimaOperacion,
    },
    {
      label: "Sesiones activas",
      value: stats.sesionesActivas,
    },
  ];

  const tableLogs = filtered.map((log) => ({
    id: log.id,
    date: new Date(log.createdAt).toLocaleString(),
    user: log.usuarioUsername || "-",
    module: log.modulo || "-",
    action: log.accion || "-",
    detail: log.detalle || "-",
    status: log.exito ? "Éxito" : "Error",
    level: log.nivel || "-",
  }));

  return (
    <div>
      <PageHeader
        label="Utilidades"
        title="Mi historial"
        subtitle={`${logs.length} registros encontrados`}
        iconColor="#3b3b7d"
        icon={
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
          >
            <rect x="4" y="3" width="12" height="14" rx="2" />
            <path d="M7 7h6M7 10h4" />
          </svg>
        }
        actions={
          <>
            <button
              className="btn-outline"
              onClick={() => navigate("/utilidades")}
            >
              Actividad
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
        }
      />

      <div className="user-summary">
        {summaryRows.map(({ label, value }) => (
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
              onClick: () =>
                alert("Exportación de historial pendiente"),
              primary: true,
            },
          ]}
        />
      </Toolbar>

      <LogsTable logs={tableLogs} columns="myhistory" />
    </div>
  );
}