import '../styles/Toolbar.css';

export function SearchBox({ placeholder, value, onChange }) {
  return (
    <div className="search-box">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m11 11 2.5 2.5" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function FilterChips({ chips, active, onSelect }) {
  return (
    <div className="filter-chips">
      {chips.map((chip) => (
        <button
          key={chip.key}
          className={`chip${active === chip.key ? ' on' : ''}`}
          onClick={() => onSelect(chip.key)}
        >
          <span className="chip-dot" style={{ background: chip.color }} />
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function ActionButtons({ buttons }) {
  return (
    <div className="action-btns">
      {buttons.map((btn, i) => (
        <button
          key={i}
          className={`btn-sm${btn.primary ? ' primary' : ''}`}
          onClick={btn.onClick}
        >
          {btn.icon}
          {btn.label}
        </button>
      ))}
    </div>
  );
}

export default function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}
