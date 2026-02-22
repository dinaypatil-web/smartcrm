import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                <Header onToggleSidebar={() => setCollapsed(!collapsed)} />
                <div className="fade-in">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
