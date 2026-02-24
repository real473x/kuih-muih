'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/BackButton';
import { ClockWidget } from '@/components/ClockWidget';
import { WeatherWidget } from '@/components/WeatherWidget';
import Link from 'next/link';
import { Calendar, ChevronRight, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function MotherDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        weekCount: 0,
        monthCount: 0,
        totalValue: 0,
        topItem: 'N/A'
    });

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            setLoading(true);
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // 1. Fetch Inventory for counts and values
            // Note: For a real rigorous stats, we'd use Supabase RPC or more complex queries.
            // For prototype, we'll fetch last 30 days and filter in JS if dataset is small.
            // Assuming small dataset for family app.

            const { data: inventory, error } = await supabase
                .from('inventory_batches')
                .select('quantity_made, unit_price, created_at, product_id, products(name)')
                .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()); // Last month buffer

            if (error) throw error;

            let week = 0;
            let month = 0;
            let value = 0;
            const productCounts: Record<string, number> = {};

            inventory?.forEach(item => {
                const date = new Date(item.created_at);

                // Weekly
                if (date >= startOfWeek) week += item.quantity_made;

                // Monthly
                if (date >= startOfMonth) {
                    month += item.quantity_made;
                    value += (item.quantity_made * item.unit_price);
                }

                // Top Item logic (using Production as proxy for "Most Active" if sales not avail, 
                // OR we can fetch sales. Let's fetch sales for "Top Selling" accuracy)
            });

            // Fetch Sales for Top Selling Item
            const { data: sales } = await supabase
                .from('sales_logs')
                .select('quantity_sold, products(name)')
                .gte('created_at', startOfMonth.toISOString());

            sales?.forEach(sale => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pData = Array.isArray(sale.products) ? sale.products[0] : (sale.products as any);
                const name = pData?.name || 'Unknown';
                productCounts[name] = (productCounts[name] || 0) + sale.quantity_sold;
            });

            // Find top item
            let topItem = 'None';
            let maxSold = 0;
            Object.entries(productCounts).forEach(([name, count]) => {
                if (count > maxSold) {
                    maxSold = count;
                    topItem = name;
                }
            });

            setStats({
                weekCount: week,
                monthCount: month,
                totalValue: value,
                topItem: topItem
            });

        } catch (err) {
            console.error("Error fetching stats", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors">
                <div className="max-w-md mx-auto px-4 py-4">
                    <div className="mb-2">
                        <BackButton />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Mother&apos;s Dashboard</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                <ClockWidget />
                <WeatherWidget />

                {/* Primary Action */}
                <Link href="/mother/today-inventory" className="block transform transition hover:scale-105">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Today&apos;s Inventory</h2>
                                <p className="text-blue-100 mt-1 text-sm">Start making today&apos;s order</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                                <ChevronRight className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </Link>
                <div className="grid grid-cols-2 gap-4">
                    {/* Weekly */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-2">
                            <Package className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase">This Week</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.weekCount}</p>
                        <p className="text-xs text-gray-400">items made</p>
                    </div>

                    {/* Monthly */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase">This Month</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.monthCount}</p>
                        <p className="text-xs text-gray-400">items made</p>
                    </div>

                    {/* Revenue (Value) */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase">Est. Value (M)</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">RM {stats.totalValue.toFixed(0)}</p>
                        <p className="text-xs text-gray-400">production value</p>
                    </div>

                    {/* Best Seller */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase">Best Seller</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white truncate" title={stats.topItem}>
                            {stats.topItem}
                        </p>
                        <p className="text-xs text-gray-400">most sold (Month)</p>
                    </div>
                </div>

                {/* History Links */}
                <Link href="/mother/history" className="block mt-6">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl text-center text-blue-600 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        View Past Production Records
                    </div>
                </Link>

            </main>
        </div>
    );
}
