import '../styles/LogsTable.css';

function Badge({ type }) {
  const map = {
    success: 'badge-success',
    error:   'badge-error',
    warning: 'badge-warning',
    create:  'badge-info',
    edit:    'badge-info',
    delete:  'badge-info',
  };
  return (
    <span className={`log-badge ${map[type] || 'badge-info'}`}>
      {type}
    </span>
  );
}

export default function LogsTable({ logs, columns = 'full' }) {
  const isEmpty = !logs || logs.length === 0;

  if (columns === 'myhistory') {
    return (
      <table className="logs-table">
        <thead>
          <tr>
            <th style={{ minWidth: 90 }}>Hora</th>
            <th style={{ minWidth: 180 }}>Operación</th>
            <th style={{ minWidth: 100 }}>Módulo</th>
            <th style={{ minWidth: 80 }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td className="table-empty" colSpan={4}>Sin operaciones</td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id}>
                <td>{l.time}</td>
                <td>{l.action}</td>
                <td><Badge type={l.module} /></td>
                <td><Badge type={l.status} /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  return (
    <table className="logs-table">
      <thead>
        <tr>
          <th style={{ minWidth: 90 }}>Hora</th>
          <th style={{ minWidth: 120 }}>Usuario</th>
          <th style={{ minWidth: 180 }}>Acción realizada</th>
          <th style={{ minWidth: 90 }}>Tipo</th>
          <th style={{ minWidth: 80 }}>Estado</th>
        </tr>
      </thead>
      <tbody>
        {isEmpty ? (
          <tr>
            <td className="table-empty" colSpan={5}>Sin registros</td>
          </tr>
        ) : (
          logs.map((l) => (
            <tr key={l.id}>
              <td>{l.time}</td>
              <td>
                <div className="log-user">
                  <div className="log-avatar">{l.avatar}</div>
                  <div>
                    <div className="log-name">{l.user}</div>
                    <div className="log-role">{l.role}</div>
                  </div>
                </div>
              </td>
              <td>{l.action}</td>
              <td><Badge type={l.type} /></td>
              <td><Badge type={l.status} /></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
