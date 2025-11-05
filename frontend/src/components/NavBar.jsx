import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useContext(AuthContext) || {};

  if (!user) return null;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.5rem 1rem',
      background: '#1a1a1a',
      color: 'white'
    }}>
      <div style={{ fontWeight: 700 }}>Sistema Restaurante</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ opacity: 0.9 }}>{user.username} ({user.rol})</div>
        <button onClick={logout} style={{
          background: '#e53e3e',
          border: 'none',
          color: 'white',
          padding: '0.4rem 0.8rem',
          borderRadius: 6,
          cursor: 'pointer'
        }}>Logout</button>
      </div>
    </header>
  );
}
