import '../styles/SessionCard.css';

export default function SessionCard({ session }) {
  const { user, role, avatar, device, ip, login, logout, duration, status } = session;
  const isActive = status === 'active';

  return (
    <div className="session-card">
      <div className="session-left">
        <div className="session-avatar">{avatar}</div>
        <div className="session-info">
          <h3>{user}</h3>
          <p>🏢 {role}</p>
          <p>📱 {device}</p>
          <p>🌐 {ip}</p>
        </div>
      </div>
      <div className="session-duration">
        <div className="duration-time">{duration}</div>
        <div className="duration-label">
          Desde {login}{logout ? ` — ${logout}` : ''}
        </div>
        <span className={`session-status ${isActive ? 'status-active' : 'status-inactive'}`}>
          {isActive ? '🟢 Activa' : '🔵 Cerrada'}
        </span>
      </div>
    </div>
  );
}
