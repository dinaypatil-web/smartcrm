import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { FiTrendingUp, FiShoppingCart, FiPackage, FiAlertTriangle, FiActivity, FiDollarSign, FiCalendar, FiClock } from 'react-icons/fi';

const CHART_COLORS = ['#635BFF', '#00C853', '#FFB300', '#FF5252', '#448AFF', '#7B73FF'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12,
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)'
        }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, fontWeight: 500 }}>
                    {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
                </div>
            ))}
        </div>
    );
};

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [alerts, setAlerts] = useState({ expiringSoon: [], expired: [] });
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [dashRes, alertsRes] = await Promise.all([
                    api.get('/reports/dashboard'),
                    api.get('/inventory/alerts')
                ]);
                setData(dashRes.data);
                setAlerts(alertsRes.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    const metrics = user?.role === 'doctor' ? [
        {
            label: 'Appointments Booked',
            value: data?.appointmentsBooked || 0,
            sub: 'today',
            icon: <FiCalendar />,
            color: 'var(--accent)'
        },
        {
            label: 'Patients Attended',
            value: data?.patientsAttended || 0,
            sub: 'completed diagnosis',
            icon: <FiActivity />,
            color: 'var(--success)'
        },
        {
            label: 'Balance Appointments',
            value: data?.balanceAppointments || 0,
            sub: 'waiting/pending',
            icon: <FiClock />,
            color: 'var(--warning)'
        },
        {
            label: 'Low Stock Items',
            value: data?.lowStockCount || 0,
            sub: 'medicines needed',
            icon: <FiAlertTriangle />,
            color: data?.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)'
        }
    ] : [
        {
            label: "Today's Revenue",
            value: `₹${(data?.todaySales?.total || 0).toLocaleString('en-IN')}`,
            sub: `${data?.todaySales?.count || 0} transactions`,
            icon: <FiDollarSign />,
            color: 'var(--success)'
        },
        {
            label: 'Monthly Sales',
            value: `₹${(data?.monthSales?.total || 0).toLocaleString('en-IN')}`,
            sub: `${data?.monthSales?.count || 0} invoices`,
            icon: <FiTrendingUp />,
            color: 'var(--accent)'
        },
        {
            label: 'Purchases',
            value: `₹${(data?.monthPurchases?.total || 0).toLocaleString('en-IN')}`,
            sub: `${data?.monthPurchases?.count || 0} orders`,
            icon: <FiShoppingCart />,
            color: 'var(--warning)'
        },
        {
            label: 'Total Items',
            value: data?.totalItems || 0,
            sub: 'in catalogue',
            icon: <FiPackage />,
            color: 'var(--info)'
        },
        {
            label: 'Low Stock',
            value: data?.lowStockCount || 0,
            sub: 'items below threshold',
            icon: <FiAlertTriangle />,
            color: data?.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)'
        },
        {
            label: 'Production',
            value: data?.monthProduction || 0,
            sub: 'batches this month',
            icon: <FiActivity />,
            color: 'var(--accent-hover)'
        }
    ];

    const topSellingChart = data?.topSelling?.map(i => ({
        name: i.itemName?.substring(0, 12) || 'Unknown',
        qty: i.totalQuantity,
        revenue: i.totalRevenue
    })) || [];

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Overview</h1>
                    <p className="page-subtitle">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Welcome */}
            <div className="dashboard-welcome fade-in">
                <h2>Welcome back, {user?.name?.split(' ')[0]}</h2>
                <p>Here's what's happening with your business today.</p>
            </div>

            {/* Alertas de Expiración */}
            {(alerts.expired.length > 0 || alerts.expiringSoon.length > 0) && (
                <div style={{ marginBottom: '24px' }}>
                    {alerts.expired.map((b, i) => (
                        <div key={`exp-${i}`} className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FiAlertTriangle style={{ color: 'var(--danger)', fontSize: '20px' }} />
                            <div>
                                <strong style={{ color: 'var(--danger)' }}>EXPIRED: {b.itemName}</strong>
                                <p style={{ fontSize: '12px', margin: 0 }}>Batch: {b.batchNumber} | Quantity: {b.quantity} | Expired on: {new Date(b.expiryDate).toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>
                    ))}
                    {alerts.expiringSoon.map((b, i) => (
                        <div key={`soon-${i}`} className="card" style={{ borderLeft: '4px solid var(--warning)', marginBottom: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FiAlertTriangle style={{ color: 'var(--warning)', fontSize: '20px' }} />
                            <div>
                                <strong style={{ color: 'var(--warning)' }}>EXPIRING SOON: {b.itemName}</strong>
                                <p style={{ fontSize: '12px', margin: 0 }}>Batch: {b.batchNumber} | Quantity: {b.quantity} | Expires on: {new Date(b.expiryDate).toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Metrics */}
            <div className="stats-grid">
                {metrics.map((m, i) => (
                    <div key={i} className={`stat-card fade-in stagger-${i + 1}`}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'var(--accent-muted)', color: m.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, marginBottom: 12
                        }}>
                            {m.icon}
                        </div>
                        <div className="stat-info">
                            <h3>{m.value}</h3>
                            <p>{m.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {user?.role !== 'doctor' && (
                <div className="dashboard-grid">
                    <div className="card fade-in">
                        <div className="card-header">
                            <span className="card-title">Top selling items</span>
                        </div>
                        {topSellingChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={topSellingChart}>
                                    <defs>
                                        <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone" dataKey="qty" name="Quantity"
                                        stroke="var(--accent)" strokeWidth={2}
                                        fill="url(#colorQty)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state"><p>No sales data yet</p></div>
                        )}
                    </div>

                    <div className="card fade-in">
                        <div className="card-header">
                            <span className="card-title">Stock valuation</span>
                        </div>
                        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Total Value
                            </div>
                            <h2 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                ₹{(data?.stockValue || 0).toLocaleString('en-IN')}
                            </h2>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>at cost price</div>
                        </div>
                        {topSellingChart.length > 0 && (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={topSellingChart}
                                        dataKey="revenue" nameKey="name"
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={72}
                                        paddingAngle={2}
                                        label={false}
                                        strokeWidth={0}
                                    >
                                        {topSellingChart.map((e, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
