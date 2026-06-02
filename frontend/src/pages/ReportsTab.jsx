import { useState, useMemo } from 'react';
import ReportCard from '../components/ReportCard';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ReportModal from '../components/ReportModal';
import { reportTypes } from '../data/mockData';
import '../styles/ReportCard.css';
import '../styles/Misc.css';

export default function ReportsTab() {
  const [openReport, setOpenReport] = useState(null);
  const [view, setView] = useState('list');
  const navigate = useNavigate();
  const handleGenerate = (options) => {
    alert(`Generando reporte en formato ${options.format.toUpperCase()}...`);
    setOpenReport(null);
  };

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
                    <button className="btn-outline" onClick={() => navigate("/utilidades/historial")}type="button">
                      Historial
                    </button>
                    <button className="btn-outline" onClick={() => navigate("/utilidades/sesiones")}type="button">
                      Sesiones
                    </button>
                    <div className="ph-divider"></div>
                  </>
                ) : null
              }
            />

      <div className="report-grid">
        {reportTypes.map((r) => (
          <ReportCard key={r.key} report={r} onOpen={setOpenReport} />
        ))}
      </div>

      {openReport && (
        <ReportModal
          reportType={openReport}
          onClose={() => setOpenReport(null)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}
