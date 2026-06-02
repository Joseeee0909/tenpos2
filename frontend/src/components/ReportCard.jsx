import '../styles/ReportCard.css';

export default function ReportCard({ report, onOpen }) {
  return (
    <div className="report-card" onClick={() => onOpen(report.key)}>
      <div className="report-icon">{report.icon}</div>
      <h3 className="report-title">{report.title}</h3>
      <p className="report-desc">{report.desc}</p>
      <div className="report-action">
        Generar reporte{' '}
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 6h8M6 2l4 4-4 4" />
        </svg>
      </div>
    </div>
  );
}
