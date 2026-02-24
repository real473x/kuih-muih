'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { BackButton } from '@/components/BackButton';
import { WeatherWidget } from '@/components/WeatherWidget';
import Link from 'next/link';

export default function FatherPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [stock, setStock] = useState<Record<string, number>>({}); // Stock = Made - Sold
    const [totalMadeValue, setTotalMadeValue] = useState(0);
    const [totalSoldValue, setTotalSoldValue] = useState(0);

    const [salesInput, setSalesInput] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            // 1. Fetch Products
            const { data: productsData, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('name');
            if (prodError) throw prodError;

            // 2. Fetch Inventory Batches (Total Made)
            // Note: In a real app we might filter by date (today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data: inventoryData, error: invError } = await supabase
                .from('inventory_batches')
                .select('product_id, quantity_made, unit_price')
                .gte('created_at', today.toISOString());

            if (invError) throw invError;

            // 3. Fetch Sales Logs (Total Sold)
            const { data: salesData, error: salesError } = await supabase
                .from('sales_logs')
                .select('product_id, quantity_sold')
                .gte('created_at', today.toISOString());

            if (salesError) throw salesError;

            // Process Data
            const productMap = (productsData || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);
            const inventoryMap: Record<string, number> = {};
            let madeVal = 0;

            (inventoryData || []).forEach(item => {
                inventoryMap[item.product_id] = (inventoryMap[item.product_id] || 0) + item.quantity_made;
                madeVal += item.quantity_made * item.unit_price;
            });

            const salesMap: Record<string, number> = {};
            (salesData || []).forEach(item => {
                salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity_sold;
            });

            // Calculate Stock
            const currentStock: Record<string, number> = {};
            let soldVal = 0;

            Object.keys(productMap).forEach(pid => {
                const made = inventoryMap[pid] || 0;
                const sold = salesMap[pid] || 0;
                currentStock[pid] = made - sold;
                soldVal += sold * productMap[pid].default_price; // Using default price for sales value est
            });

            setProducts(productsData || []);
            setStock(currentStock);
            setTotalMadeValue(madeVal);
            setTotalSoldValue(soldVal);

        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data');
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateSalesInput = (productId: string, newQuantity: number) => {
        // Cannot sell more than available stock
        const available = stock[productId] || 0;
        if (newQuantity <= available) {
            setSalesInput((prev) => ({
                ...prev,
                [productId]: newQuantity,
            }));
        }
    };

    const handleEndDay = async () => {
        const salesToRecord = Object.entries(salesInput).filter(([_, qty]) => qty > 0);
        if (salesToRecord.length === 0) {
            alert("No sales recorded to submit.");
            return;
        }

        setSubmitting(true);
        try {
            const records = salesToRecord.map(([pid, qty]) => ({
                product_id: pid,
                quantity_sold: qty,
                logged_by: 'Father'
            }));

            const { error } = await supabase.from('sales_logs').insert(records);
            if (error) throw error;

            alert("Sales recorded!");
            setSalesInput({}); // Clear inputs
            fetchData(); // Refresh stock
        } catch (error) {
            console.error('Error recording sales:', error);
            alert('Error recording sales');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
            <header className="bg-blue-600 dark:bg-blue-900 text-white shadow-md sticky top-0 z-50 transition-colors">
                <div className="max-w-md mx-auto px-4 py-6">
                    <div className="mb-2 flex justify-between items-center">
                        <BackButton />
                        <Link href="/father/history" className="text-white/80 hover:text-white text-sm font-medium underline">
                            View History
                        </Link>
                    </div>
                    <h1 className="text-xl font-bold opacity-90">Total Due to Mom</h1>
                    <p className="text-4xl font-bold mt-1">RM {totalMadeValue.toFixed(2)}</p>
                    <div className="mt-4 flex justify-between text-sm opacity-80">
                        <span>Collected: RM {totalSoldValue.toFixed(2)}</span>
                        <span>Pending: RM {(totalMadeValue - totalSoldValue).toFixed(2)}</span>
                    </div>
                    {/* Simple Progress Bar */}
                    <div className="mt-2 w-full bg-blue-800 dark:bg-blue-950 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-green-400 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${totalMadeValue > 0 ? (totalSoldValue / totalMadeValue) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 pb-40 space-y-6"> {/* Increased bottom padding to prevent overlap */}
                <WeatherWidget />
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Record New Sales</h2>
                {products.map((product) => {
                    const currentStock = stock[product.id] || 0;
                    const inputQty = salesInput[product.id] || 0;

                    if (currentStock <= 0) return null; // Hide if out of stock

                    return (
                        <div key={product.id} className="relative">
                            <div className="absolute top-0 right-0 z-10 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                                Stock Left: {currentStock - inputQty}
                            </div>
                            <ProductCard
                                product={product}
                                quantity={inputQty}
                                onUpdateQuantity={(q) => handleUpdateSalesInput(product.id, q)}
                            />
                        </div>
                    );
                })}
                {products.every(p => (stock[p.id] || 0) <= 0) && (
                    <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-600 dark:text-gray-300">No stock available.</p>
                        <p className="text-sm text-gray-400 mt-2">Wait for Mom to add inventory!</p>
                    </div>
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[100] transition-colors">
                <div className="max-w-md mx-auto">
                    <button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                        disabled={submitting}
                        onClick={handleEndDay}
                    >
                        {submitting ? 'Recording...' : 'Confirm Sales'}
                    </button>
                </div>
            </div>
        </div>
    );
}
