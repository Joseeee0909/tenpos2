import '../styles/page-header.css';

export default function PageHeader({
  label,
  title,
  subtitle,
  icon,
  iconColor = '#4f46e5',
  actions = null
}) {
  return (
    <div className="ph-wrap">
      {label ? <div className="ph-label">{label}</div> : null}

      <div className="page-header-card">
        <div className="ph-icon" style={{ background: iconColor }}>
          {icon}
        </div>

        <div className="ph-text">
          <div className="ph-title">{title}</div>
          {subtitle ? <div className="ph-sub">{subtitle}</div> : null}
        </div>

        {actions ? <div className="ph-actions">{actions}</div> : null}
      </div>
    </div>
  );
}