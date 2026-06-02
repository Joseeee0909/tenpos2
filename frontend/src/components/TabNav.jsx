import '../styles/TabNav.css';

export default function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tabs-nav">
      {tabs.map((tab) => (
        <div
          key={tab.key}
          className={`tab-item${activeTab === tab.key ? ' active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}
