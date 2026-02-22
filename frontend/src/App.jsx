import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ItemsList from './pages/items/ItemsList';
import PurchasesList from './pages/purchases/PurchasesList';
import SalesList from './pages/sales/SalesList';
import POSTerminal from './pages/pos/POSTerminal';
import InventoryList from './pages/inventory/InventoryList';
import ProductionList from './pages/production/ProductionList';
import PrescriptionsList from './pages/prescriptions/PrescriptionsList';
import Reports from './pages/reports/Reports';
import UsersList from './pages/users/UsersList';
import EntitiesList from './pages/entities/EntitiesList';
import Profile from './pages/profile/Profile';
import NotificationsList from './pages/notifications/NotificationsList';

function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-container"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role) && user.role !== 'developer') {
        return <div className="empty-state"><h3>Access Denied</h3><p>You don't have permission to access this page.</p></div>;
    }
    return children;
}

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
            <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<NotificationsList />} />
                <Route path="entities" element={<ProtectedRoute roles={['developer']}><EntitiesList /></ProtectedRoute>} />
                <Route path="items" element={<ProtectedRoute roles={['admin', 'store']}><ItemsList /></ProtectedRoute>} />
                <Route path="purchases" element={<ProtectedRoute roles={['admin', 'store']}><PurchasesList /></ProtectedRoute>} />
                <Route path="sales" element={<ProtectedRoute roles={['admin', 'store']}><SalesList /></ProtectedRoute>} />
                <Route path="pos/:id?" element={<ProtectedRoute roles={['admin', 'store']}><POSTerminal /></ProtectedRoute>} />
                <Route path="inventory" element={<ProtectedRoute roles={['admin', 'store']}><InventoryList /></ProtectedRoute>} />
                <Route path="production" element={<ProtectedRoute roles={['admin']}><ProductionList /></ProtectedRoute>} />
                <Route path="prescriptions" element={<ProtectedRoute roles={['admin', 'doctor']}><PrescriptionsList /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersList /></ProtectedRoute>} />
            </Route>
        </Routes>
    );
}
