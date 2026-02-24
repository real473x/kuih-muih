'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/BackButton';
import { Product } from '@/lib/types';
import { Pencil, Save, X, Eye, EyeOff } from 'lucide-react';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ price: string; name: string }>({ price: '', name: '' });

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        const { data } = await supabase.from('products').select('*').order('name');
        setProducts(data || []);
        setLoading(false);
    }

    const startEdit = (product: Product) => {
        setEditingId(product.id);
        setEditForm({ price: product.default_price.toString(), name: product.name });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ price: '', name: '' });
    };

    const saveEdit = async (id: string) => {
        try {
            const newPrice = parseFloat(editForm.price);
            if (isNaN(newPrice)) { // Basic validation
                alert("Invalid price");
                return;
            }

            const { error } = await supabase
                .from('products')
                .update({ default_price: newPrice, name: editForm.name })
                .eq('id', id);

            if (error) throw error;

            setProducts(prev => prev.map(p => p.id === id ? { ...p, default_price: newPrice, name: editForm.name } : p));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating:', error);
            alert('Failed to update product');
        }
    };

    const toggleActive = async (product: Product) => {
        try {
            const newStatus = !product.is_active;
            const { error } = await supabase
                .from('products')
                .update({ is_active: newStatus })
                .eq('id', product.id);

            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Failed to update status');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="mb-2">
                        <BackButton />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Manage Products</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-medium">
                            <tr>
                                <th className="px-4 py-3">Product Name</th>
                                <th className="px-4 py-3">Price (RM)</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>
                            ) : products.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {editingId === product.id ? (
                                            <input
                                                type="text"
                                                className="border rounded px-2 py-1 w-full dark:bg-gray-800 dark:border-gray-600"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : product.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === product.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="border rounded px-2 py-1 w-24 dark:bg-gray-800 dark:border-gray-600"
                                                value={editForm.price}
                                                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                            />
                                        ) : `RM ${product.default_price.toFixed(2)}`}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => toggleActive(product)}
                                            className={`p-1.5 rounded-full transition-colors ${product.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
                                            title={product.is_active ? "Active" : "Inactive"}
                                        >
                                            {product.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right flex justify-end space-x-2">
                                        {editingId === product.id ? (
                                            <>
                                                <button onClick={() => saveEdit(product.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-full" title="Save"><Save className="w-4 h-4" /></button>
                                                <button onClick={cancelEdit} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Cancel"><X className="w-4 h-4" /></button>
                                            </>
                                        ) : (
                                            <button onClick={() => startEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full" title="Edit"><Pencil className="w-4 h-4" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
