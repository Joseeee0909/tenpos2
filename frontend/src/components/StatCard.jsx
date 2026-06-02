import '../styles/StatCard.css';

export default function StatCard({ icon, iconBg, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <div className="stat-num">{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  );
}
