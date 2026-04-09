import { Outlet } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';

export default function AppShell() {
  return (
    <div className="shell-layout">
      <SidebarMenu />
      <main className="with-sidebar-page">
        <Outlet />
      </main>
    </div>
  );
}
