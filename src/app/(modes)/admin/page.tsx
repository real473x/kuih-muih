'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import Link from 'next/link';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    TrendingUp,
    AlertCircle,
    ClipboardList,
    Settings,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Edit2,
    Circle
} from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { WeatherWidget } from '@/components/WeatherWidget';
import { SalesChart } from '@/components/SalesChart';

interface DashboardStats {
    totalRevenue: number;
    totalMade: number;
    totalSold: number;
    unsoldValue: number;
    grossProfit: number;
    bestSeller: { name: string; quantity: number } | null;
    worstSeller: { name: string; quantity: number } | null;
}

interface ProductPerformance {
    id: string;
    name: string;
    sold: number;
    made: number;
    revenue: number;
    unsold: number;
}

export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [stats, setStats] = useState<DashboardStats>({
        totalRevenue: 0,
        totalMade: 0,
        totalSold: 0,
        unsoldValue: 0,
        grossProfit: 0,
        bestSeller: null,
        worstSeller: null
    });
    const [performance, setPerformance] = useState<ProductPerformance[]>([]);
    const [chartData, setChartData] = useState<{ date: string; fullDate: string; totalSales: number }[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    async function fetchAnalytics() {
        try {
            setLoading(true);

            // 1. Determine Date Range
            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0); // Start of today
            } else if (timeRange === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (timeRange === 'month') {
                startDate.setMonth(now.getMonth() - 1);
            } else if (timeRange === 'year') {
                startDate.setFullYear(now.getFullYear() - 1);
            }

            // 2. Fetch Data
            const { data: products } = await supabase.from('products').select('*');
            const { data: inventory } = await supabase
                .from('inventory_batches')
                .select('product_id, quantity_made, created_at')
                .gte('created_at', startDate.toISOString());
            const { data: sales } = await supabase
                .from('sales_logs')
                .select('product_id, quantity_sold, created_at')
                .gte('created_at', startDate.toISOString());

            const productMap = (products || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);

            // 3. Process Per Product
            const productStats: Record<string, ProductPerformance> = {};
            (products || []).forEach(p => {
                productStats[p.id] = { id: p.id, name: p.name, sold: 0, made: 0, revenue: 0, unsold: 0 };
            });

            let totalRev = 0;
            let totalSold = 0;
            let totalMade = 0;

            (inventory || []).forEach(item => {
                if (productStats[item.product_id]) {
                    productStats[item.product_id].made += item.quantity_made;
                    totalMade += item.quantity_made;
                }
            });

            (sales || []).forEach(item => {
                if (productStats[item.product_id]) {
                    productStats[item.product_id].sold += item.quantity_sold;
                    const rev = item.quantity_sold * (productMap[item.product_id]?.default_price || 0);
                    productStats[item.product_id].revenue += rev;
                    totalSold += item.quantity_sold;
                    totalRev += rev;
                }
            });

            // Calculate Unsold & Metrics
            let totalUnsoldVal = 0;
            let maxSold = -1;
            let minSold = Infinity;
            let bestSellerName = null;
            let worstSellerName = null;

            // Chart Data Prep
            const chartMap: Record<string, number> = {};

            (sales || []).forEach(item => {
                const date = new Date(item.created_at);
                let key = '';
                if (timeRange === 'today') {
                    // For today, vary by hour
                    key = date.getHours().toString().padStart(2, '0') + ':00';
                } else if (timeRange === 'week' || timeRange === 'month') {
                    key = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                } else {
                    key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                }

                const val = item.quantity_sold * (productMap[item.product_id]?.default_price || 0);
                if (!chartMap[key]) chartMap[key] = 0;
                chartMap[key] += val;
            });

            // Convert Chart Map to Array
            let chartDataArray = Object.keys(chartMap).map(key => ({
                date: key,
                fullDate: key,
                totalSales: chartMap[key]
            }));

            // Basic Sorting for Chart Data
            // This is rudimentary. For perfect sorting, we'd need real timestamps or ISO keys.
            // For MVP, if 'today', sort by hour string works.
            // For others, it might be roughly ordered if inserted roughly in order, but not guaranteed.
            // Let's try to trust the data structure for now or improve later.
            // Actually, for 'week' and 'month', sorting by DD MMM isn't trivial without the Date object.
            // Improvement: Store timestamp in key or separate map.
            // For now, let's just reverse it if it looks backwards? No.
            // Let's implement a simple sort if possible. 
            if (timeRange === 'today') {
                chartDataArray.sort((a, b) => a.date.localeCompare(b.date));
            } else {
                // Try to parse back to date for sorting?
                chartDataArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }


            const performanceData = Object.values(productStats).map(p => {
                const unsold = Math.max(0, p.made - p.sold);
                const unsoldVal = unsold * (productMap[p.id]?.default_price || 0);
                totalUnsoldVal += unsoldVal;

                if (p.sold > maxSold) { maxSold = p.sold; bestSellerName = p.name; }
                if (p.sold < minSold && p.made > 0) { minSold = p.sold; worstSellerName = p.name; } // Only count active items

                return { ...p, unsold };
            }).sort((a, b) => b.revenue - a.revenue);

            // Handle case where no items sold (minSold still Infinity)
            if (minSold === Infinity) { minSold = 0; worstSellerName = "None"; }
            if (maxSold === -1) { maxSold = 0; bestSellerName = "None"; }


            setStats({
                totalRevenue: totalRev,
                totalMade: totalMade,
                totalSold: totalSold,
                unsoldValue: totalUnsoldVal,
                grossProfit: totalRev,
                bestSeller: bestSellerName ? { name: bestSellerName, quantity: maxSold } : null,
                worstSeller: worstSellerName ? { name: worstSellerName, quantity: minSold } : null
            });

            setPerformance(performanceData);
            setChartData(chartDataArray);

        } catch (error) {
            console.error('Error fetching admin analytics:', error);
        } finally {
            setLoading(false);
        }
    }

    const rangeLabel = {
        'today': 'Today',
        'week': 'Last 7 Days',
        'month': 'Last 30 Days',
        'year': 'Last Year'
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-24">
            {/* 1. Header & Weather */}
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                            <BackButton />
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                        </div>
                    </div>
                    <WeatherWidget />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">

                {/* 2. Quick Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <Link href="/admin/products" className="group">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between group-hover:shadow-md">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-105 transition-transform">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Manage Products</span>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        </div>
                    </Link>

                    <Link href="/admin/history" className="group">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer flex items-center justify-between group-hover:shadow-md">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-105 transition-transform">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">View History</span>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                        </div>
                    </Link>
                </section>

                {/* 3. Extended Stats */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                        Overview ({rangeLabel[timeRange]})
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Revenue"
                            value={`RM ${stats.totalRevenue.toFixed(2)}`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="green"
                        />
                        <StatCard
                            title="Unsold Value"
                            value={`RM ${stats.unsoldValue.toFixed(2)}`}
                            icon={<AlertCircle className="w-5 h-5" />}
                            color="red"
                        />
                        <StatCard
                            title="Items Sold"
                            value={stats.totalSold.toString()}
                            icon={<ShoppingCart className="w-5 h-5" />}
                            color="blue"
                        />
                        <StatCard
                            title="Items Made"
                            value={stats.totalMade.toString()}
                            icon={<Package className="w-5 h-5" />}
                            color="orange"
                        />
                    </div>
                    {/* Best/Worst Seller - Full Width Split */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800">
                            <div className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-1">Best Seller</div>
                            {stats.bestSeller && stats.bestSeller.name !== "None" ? (
                                <div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.bestSeller.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{stats.bestSeller.quantity} sold</div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400 italic">No data</div>
                            )}
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/10 p-4 rounded-xl border border-red-100 dark:border-red-800">
                            <div className="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1">Worst Seller</div>
                            {stats.worstSeller && stats.worstSeller.name !== "None" ? (
                                <div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.worstSeller.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{stats.worstSeller.quantity} sold</div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400 italic">No data</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 4. Performance & Charts */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Performance</h2>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
                            {(['today', 'week', 'month', 'year'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sales Trend</h3>
                        </div>
                        <SalesChart data={chartData} />
                    </div>

                    {/* Table Area */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3 text-right">Sold</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                    <th className="px-4 py-3 text-right">Unsold</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {performance.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center">
                                            {p.name}
                                            {p.sold > 0 && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{p.sold}</td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">RM {p.revenue.toFixed(2)}</td>
                                        <td className={`px-4 py-3 text-right font-medium ${p.unsold > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {p.unsold}
                                        </td>
                                    </tr>
                                ))}
                                {performance.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                                            No performance data for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ title, value, icon, color }: any) {
    const colors = {
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const themeColor = colors[color as keyof typeof colors] || colors.blue;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${themeColor}`}>
                {icon}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">{title}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
        </div>
    );
}
