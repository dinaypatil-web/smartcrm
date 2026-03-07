import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    FiGrid, FiShoppingCart, FiPackage, FiTruck, FiDollarSign,
    FiClipboard, FiSettings, FiBarChart2, FiUsers, FiUser,
    FiActivity, FiFileText, FiLayers, FiCalendar
} from 'react-icons/fi';

const navItems = [
    {
        section: 'Overview', items: [
            { path: '/', label: 'Dashboard', icon: FiGrid, roles: ['developer', 'admin', 'doctor', 'store', 'attendant'] },
        ]
    },
    {
        section: 'System', items: [
            { path: '/entities', label: 'Entities', icon: FiLayers, roles: ['developer'] },
        ]
    },
    {
        section: 'Commerce', items: [
            { path: '/pos', label: 'POS Terminal', icon: FiShoppingCart, roles: ['developer', 'admin', 'store'] },
            { path: '/items', label: 'Items', icon: FiPackage, roles: ['developer', 'admin', 'store'] },
            { path: '/purchases', label: 'Purchases', icon: FiTruck, roles: ['developer', 'admin', 'store'] },
            { path: '/sales', label: 'Sales', icon: FiDollarSign, roles: ['developer', 'admin', 'store'] },
            { path: '/inventory', label: 'Inventory', icon: FiClipboard, roles: ['developer', 'admin', 'store'] },
        ]
    },
    {
        section: 'Operations', items: [
            { path: '/appointments', label: 'Appointments', icon: FiCalendar, roles: ['developer', 'admin', 'attendant'] },
            { path: '/production', label: 'Production', icon: FiActivity, roles: ['developer', 'admin'] },
            { path: '/prescriptions', label: 'Prescriptions', icon: FiFileText, roles: ['developer', 'admin', 'doctor'] },
        ]
    },
    {
        section: 'Management', items: [
            { path: '/reports', label: 'Reports', icon: FiBarChart2, roles: ['developer', 'admin'] },
            { path: '/users', label: 'Users', icon: FiUsers, roles: ['developer', 'admin'] },
        ]
    },
];

export default function Sidebar({ collapsed, mobileOpen, onToggle }) {
    const { user } = useAuth();

    const filterItems = (items) => items.filter(item =>
        item.roles.includes(user?.role) || user?.role === 'developer'
    );

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
            <div className="sidebar-logo">
                <div className="logo-icon">A</div>
                {!collapsed && (
                    <div>
                        <h2>AyurERP</h2>
                        <div className="subtitle">Business Suite</div>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                {navItems.map(section => {
                    const visible = filterItems(section.items);
                    if (visible.length === 0) return null;
                    return (
                        <div key={section.section}>
                            {!collapsed && <div className="nav-section">{section.section}</div>}
                            {visible.map(item => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/'}
                                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon"><Icon size={16} /></span>
                                        {!collapsed && <span>{item.label}</span>}
                                    </NavLink>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* Footer — Profile */}
            {!collapsed && (
                <div style={{
                    padding: '12px 8px', borderTop: '1px solid var(--border)',
                    flexShrink: 0
                }}>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon"><FiUser size={16} /></span>
                        <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
                    </NavLink>
                </div>
            )}
        </aside>
    );
}
