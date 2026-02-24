'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { BackButton } from '@/components/BackButton';
import { ClockWidget } from '@/components/ClockWidget'; // Updated to use new Clock
import { AlertCircle, Plus, Eye, EyeOff } from 'lucide-react'; // Added icons for toggle
import Link from 'next/link';

export default function MotherInventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]); // Store ALL products for toggling
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHidden, setShowHidden] = useState(false); // Toggle to see inactive items

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            setLoading(true);
            setError(null);
            // Fetch ALL products, order by active first
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('is_active', { ascending: false })
                .order('name');

            if (error) throw error;

            const fetched = data || [];
            setAllProducts(fetched);
            // Initially show only active
            setProducts(fetched.filter(p => p.is_active));

        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Could not load the list. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateQuantity = (productId: string, newQuantity: number) => {
        setQuantities((prev) => ({
            ...prev,
            [productId]: newQuantity,
        }));
    };

    const toggleProductActive = async (product: Product) => {
        const newStatus = !product.is_active;

        // Optimistic update
        const updatedAll = allProducts.map(p =>
            p.id === product.id ? { ...p, is_active: newStatus } : p
        );
        setAllProducts(updatedAll);
        setProducts(updatedAll.filter(p => p.is_active));

        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: newStatus })
                .eq('id', product.id);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status. Reverting...');
            fetchProducts(); // Revert on error
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const batches = products
                .map(p => {
                    const qty = quantities[p.id] || 0;
                    if (qty > 0) {
                        return {
                            product_id: p.id,
                            quantity_made: qty,
                            unit_price: p.default_price
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            if (batches.length === 0) {
                alert("Please add at least one item first!");
                setSaving(false);
                return;
            }

            const { error } = await supabase
                .from('inventory_batches')
                .insert(batches);

            if (error) throw error;

            alert('Successfully saved!');
            setQuantities({}); // Reset quantities
        } catch (error) {
            console.error('Error saving inventory:', error);
            alert('Something went wrong saving the data. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const totalItems = Object.values(quantities).reduce((acc, curr) => acc + curr, 0);
    const totalValue = products.reduce((acc, product) => {
        const qty = quantities[product.id] || 0;
        return acc + (qty * product.default_price);
    }, 0);

    if (loading) return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="animate-pulse">Loading...</div>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center space-y-4 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md mx-auto flex justify-start">
                <BackButton />
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Oops!</h2>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <button
                onClick={() => fetchProducts()}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            >
                Try Again
            </button>
        </div>
    );

    const hiddenCount = allProducts.filter(p => !p.is_active).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors">
                <div className="max-w-md mx-auto px-4 py-4 flex flex-col">
                    <div className="mb-2">
                        <BackButton />
                    </div>
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Today&apos;s Inventory</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-4">
                <ClockWidget />

                {/* Action Buttons Row */}
                <div className="flex gap-3">
                    <Link href="/mother/add-menu" className="flex-1">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors cursor-pointer bg-white dark:bg-gray-800/50 h-full">
                            <Plus className="w-5 h-5 mr-2" />
                            <span className="font-medium text-sm">New Product</span>
                        </div>
                    </Link>

                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className={`
                            flex-1 border-2 border-dashed rounded-xl p-4 flex items-center justify-center transition-colors h-full
                            ${showHidden
                                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'}
                        `}
                    >
                        {showHidden ? <Eye className="w-5 h-5 mr-2" /> : <EyeOff className="w-5 h-5 mr-2" />}
                        <span className="font-medium text-sm">
                            {showHidden ? 'Hide Inactive' : `Show Inactive (${hiddenCount})`}
                        </span>
                    </button>
                </div>

                {/* Active Items */}
                <div className="space-y-4">
                    {products.length > 0 ? (
                        products.map((product) => (
                            <div key={product.id} className="relative group">
                                <ProductCard
                                    product={product}
                                    quantity={quantities[product.id] || 0}
                                    onUpdateQuantity={(q) => handleUpdateQuantity(product.id, q)}
                                />
                                {/* Quick Hide Button */}
                                <button
                                    onClick={() => toggleProductActive(product)}
                                    className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-full opacity-50 hover:opacity-100 transition-opacity"
                                    title="Hide from today"
                                >
                                    <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-300 font-medium">No active items.</p>
                            <p className="text-xs text-gray-400 mt-2">
                                Enable items from the "Show Inactive" list or create new ones.
                            </p>
                        </div>
                    )}
                </div>

                {/* Hidden Items List (Only shows when toggled) */}
                {showHidden && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Inactive Items</h3>
                        <div className="space-y-2">
                            {allProducts.filter(p => !p.is_active).map(product => (
                                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md mr-3 overflow-hidden relative">
                                            {/* Image placeholder */}
                                        </div>
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">{product.name}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleProductActive(product)}
                                        className="flex items-center text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-3 py-1.5 rounded-md font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                                    >
                                        <Eye className="w-3 h-3 mr-1.5" />
                                        Show
                                    </button>
                                </div>
                            ))}
                            {hiddenCount === 0 && (
                                <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    No inactive items found.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Summary Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors z-50">
                <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Produced</p>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</span>
                            <span className="text-xs text-gray-400">units</span>
                        </div>
                    </div>

                    <div className="text-right mr-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Est. Value</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">RM {totalValue.toFixed(2)}</p>
                    </div>

                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={totalItems === 0 || saving}
                        onClick={handleSave}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
