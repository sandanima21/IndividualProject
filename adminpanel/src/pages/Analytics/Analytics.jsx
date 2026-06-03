import React, { useEffect, useState } from 'react';
import { getAllOrders } from '../../services/orderService';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const GOLD = '#c9a84c';
const GOLD_ALPHA = 'rgba(201,168,76,0.7)';

const chartOpts = (label) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: true, text: label, color: '#f0ece0', font: { size: 13, weight: '600' }, padding: { bottom: 12 } },
  },
  scales: {
    x: { ticks: { color: '#c0b89a', font: { size: 11 } }, grid: { color: 'rgba(201,168,76,0.18)' }, border: { color: 'rgba(201,168,76,0.25)' } },
    y: { ticks: { color: '#c0b89a', font: { size: 11 } }, grid: { color: 'rgba(201,168,76,0.18)' }, border: { color: 'rgba(201,168,76,0.25)' } },
  },
});

const Analytics = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllOrders().then(setOrders).catch(() => toast.error('Failed to load orders.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-5 text-center"><div className="spinner-border" style={{ color: GOLD }}></div></div>;

  const delivered = orders.filter(o => o.status === 'DELIVERED');

  // Daily revenue — last 14 days
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (13 - i));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  });
  const dailyRevenue = days.map(label => {
    return delivered
      .filter(o => new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) === label)
      .reduce((s, o) => s + o.total, 0);
  });

  // Monthly revenue — last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today); d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });
  const monthlyRevenue = months.map(label =>
    delivered
      .filter(o => new Date(o.createdAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) === label)
      .reduce((s, o) => s + o.total, 0)
  );

  // Order type split
  const deliveryCount = orders.filter(o => o.orderType === 'delivery').length;
  const takeawayCount = orders.filter(o => o.orderType === 'takeaway').length;

  // Status breakdown
  const statusCounts = ['PENDING','CONFIRMED','COOKING','READY','DELIVERED'].map(s => orders.filter(o => o.status === s).length);

  const totalRevenue = delivered.reduce((s, o) => s + o.total, 0);
  const todayRevenue = delivered
    .filter(o => new Date(o.createdAt).toDateString() === today.toDateString())
    .reduce((s, o) => s + o.total, 0);

  const chartBg = '#1a1a1a';

  return (
    <div className="py-4 px-3">
      <div className="d-flex align-items-center mb-4">
        <h4 className="fw-bold mb-0" style={{ color: '#f0ece0' }}>
          <i className="bi bi-bar-chart-line me-2" style={{ color: GOLD }}></i>Analytics
        </h4>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total Revenue", value: `Rs.${totalRevenue.toFixed(0)}`, icon: 'bi-currency-exchange', sub: 'All time (delivered)' },
          { label: "Today's Revenue", value: `Rs.${todayRevenue.toFixed(0)}`, icon: 'bi-calendar-check', sub: 'Delivered today' },
          { label: "Total Orders", value: orders.length, icon: 'bi-bag', sub: 'All statuses' },
          { label: "Delivered Orders", value: delivered.length, icon: 'bi-check-circle', sub: 'Completed' },
        ].map(card => (
          <div key={card.label} className="col-sm-6 col-xl-3">
            <div className="card p-3" style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small style={{ color: '#8a8070' }}>{card.label}</small>
                <i className={`bi ${card.icon}`} style={{ color: GOLD, fontSize: '1.3rem' }}></i>
              </div>
              <div className="fw-bold fs-4" style={{ color: GOLD }}>{card.value}</div>
              <small style={{ color: '#8a8070' }}>{card.sub}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card p-3" style={{ background: chartBg, border: '1px solid rgba(201,168,76,0.15)' }}>
            <div style={{ height: 280 }}>
              <Bar
                data={{
                  labels: days,
                  datasets: [{ label: 'Revenue', data: dailyRevenue, backgroundColor: GOLD_ALPHA, borderColor: GOLD, borderWidth: 1, borderRadius: 6 }]
                }}
                options={chartOpts('Daily Revenue — Last 14 Days (Rs.)')}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card p-3" style={{ background: chartBg, border: '1px solid rgba(201,168,76,0.15)' }}>
            <div style={{ height: 280 }}>
              <Doughnut
                data={{
                  labels: ['Delivery', 'Takeaway'],
                  datasets: [{ data: [deliveryCount, takeawayCount], backgroundColor: [GOLD, '#444'], borderColor: '#1a1a1a', borderWidth: 3 }]
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#f0ece0', font: { size: 13 }, padding: 16 } },
                    title: { display: true, text: 'Order Types', color: '#f0ece0', font: { size: 13, weight: '600' }, padding: { bottom: 12 } }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card p-3" style={{ background: chartBg, border: '1px solid rgba(201,168,76,0.15)' }}>
            <div style={{ height: 280 }}>
              <Line
                data={{
                  labels: months,
                  datasets: [{ label: 'Revenue', data: monthlyRevenue, borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.15)', fill: true, tension: 0.4, pointBackgroundColor: GOLD, pointRadius: 5, pointHoverRadius: 7 }]
                }}
                options={chartOpts('Monthly Revenue — Last 6 Months (Rs.)')}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card p-3" style={{ background: chartBg, border: '1px solid rgba(201,168,76,0.15)' }}>
            <div style={{ height: 280 }}>
              <Bar
                data={{
                  labels: ['Pending','Confirmed','Cooking','Ready','Delivered'],
                  datasets: [{ data: statusCounts, backgroundColor: ['#6c757d','#4d8fcc','#ffc107','#28a745','#c9a84c'], borderRadius: 6 }]
                }}
                options={chartOpts('Orders by Status')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
