export const logs = [
  { id: 1,  time: '14:32:18', date: '01/06', user: 'Carlos M.',  role: 'Admin',   avatar: 'CM', action: 'Cobró factura #F0041',              type: 'edit',   status: 'success', module: 'Ventas'    },
  { id: 2,  time: '14:28:45', date: '01/06', user: 'Luisa R.',   role: 'Cajero',  avatar: 'LR', action: 'Marcó pedido como listo',            type: 'edit',   status: 'success', module: 'Pedidos'   },
  { id: 3,  time: '14:25:12', date: '01/06', user: 'Admin',      role: 'Root',    avatar: 'AD', action: 'Modificó configuración',             type: 'edit',   status: 'success', module: 'Config'    },
  { id: 4,  time: '14:20:33', date: '01/06', user: 'Andrés P.',  role: 'Mesero',  avatar: 'AP', action: 'Creó nuevo pedido',                  type: 'create', status: 'success', module: 'Pedidos'   },
  { id: 5,  time: '14:15:08', date: '01/06', user: 'María T.',   role: 'Mesero',  avatar: 'MT', action: 'Intentó acceso sin autorización',    type: 'delete', status: 'error',   module: 'Seguridad' },
  { id: 6,  time: '14:10:55', date: '01/06', user: 'Carlos M.',  role: 'Admin',   avatar: 'CM', action: 'Eliminó producto descontinuado',     type: 'delete', status: 'success', module: 'Productos' },
  { id: 7,  time: '14:05:30', date: '01/06', user: 'Luisa R.',   role: 'Cajero',  avatar: 'LR', action: 'Aplicó descuento especial 15%',      type: 'edit',   status: 'success', module: 'Ventas'    },
  { id: 8,  time: '13:58:44', date: '01/06', user: 'Diego L.',   role: 'Cocina',  avatar: 'DL', action: 'Actualizó estado de cocina',         type: 'edit',   status: 'success', module: 'Cocina'    },
  { id: 9,  time: '13:52:20', date: '01/06', user: 'Admin',      role: 'Root',    avatar: 'AD', action: 'Creó nuevo usuario: jlopez',         type: 'create', status: 'success', module: 'Usuarios'  },
  { id: 10, time: '13:45:10', date: '01/06', user: 'Andrés P.',  role: 'Mesero',  avatar: 'AP', action: 'Transfirió mesa 4 a mesa 7',         type: 'edit',   status: 'success', module: 'Mesas'     },
  { id: 11, time: '13:40:02', date: '01/06', user: 'Carlos M.',  role: 'Admin',   avatar: 'CM', action: 'Generó reporte de ventas',           type: 'create', status: 'success', module: 'Reportes'  },
  { id: 12, time: '13:35:58', date: '01/06', user: 'María T.',   role: 'Mesero',  avatar: 'MT', action: 'Canceló pedido #P0089',              type: 'delete', status: 'success', module: 'Pedidos'   },
];

export const sessions = [
  { user: 'Carlos Mendoza', role: 'Admin',   avatar: 'CM', ip: '192.168.1.105', device: 'Windows - Chrome',      login: '09:15', duration: '5h 32min', status: 'active' },
  { user: 'Luisa Ramírez',  role: 'Cajero',  avatar: 'LR', ip: '192.168.1.108', device: 'iPad - Safari',          login: '10:45', duration: '4h 25min', status: 'active' },
  { user: 'Andrés Pérez',   role: 'Mesero',  avatar: 'AP', ip: '192.168.1.110', device: 'Android - App Nativa',   login: '11:20', duration: '3h 48min', status: 'active' },
  { user: 'María Torres',   role: 'Mesero',  avatar: 'MT', ip: '192.168.1.112', device: 'Windows - Chrome',       login: '08:30', logout: '14:12', duration: '5h 42min', status: 'closed' },
  { user: 'Diego López',    role: 'Cocina',  avatar: 'DL', ip: '192.168.1.115', device: 'Tablet - Chrome',        login: '07:00', logout: '15:00', duration: '8h 00min', status: 'closed' },
];

export const reportTypes = [
  {
    key: 'behavior',
    title: 'Comportamiento de usuarios',
    desc: 'Analiza patrones de uso, actividades más comunes y horas pico de actividad',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    key: 'operations',
    title: 'Operaciones por módulo',
    desc: 'Desglose detallado de operaciones en pedidos, productos, usuarios y ventas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
  },
  {
    key: 'errors',
    title: 'Errores y alertas',
    desc: 'Registro completo de errores, advertencias y problemas del sistema',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    key: 'security',
    title: 'Seguridad y accesos',
    desc: 'Análisis de inicios de sesión, intentos fallidos e intentos de acceso no autorizados',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    key: 'performance',
    title: 'Rendimiento del sistema',
    desc: 'Métricas de velocidad, respuesta y carga del sistema en el tiempo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h18v18H3z" />
        <path d="M9 9h6v6H9z" />
        <path d="M3 3l6 6M15 3l6 6M3 15l6-6M15 15l6-6" />
      </svg>
    ),
  },
  {
    key: 'compliance',
    title: 'Cumplimiento normativo',
    desc: 'Auditoría y trazabilidad para cumplir requisitos legales y fiscales',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
];
