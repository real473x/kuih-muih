'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { BackButton } from '@/components/BackButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { Trash2, Edit2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';

interface InventoryRecord {
    id: string;
    product_id: string;
    quantity_made: number;
    unit_price: number;
    created_at: string;
    product_name?: string;
}

interface SalesRecord {
    id: string;
    product_id: string;
    quantity_sold: number;
    created_at: string;
    product_name?: string;
}

interface GroupedProduct {
    productId: string;
    productName: string;
    totalMade: number;
    totalSold: number;
    unsold: number;
    revenue: number;
    inventoryLogs: InventoryRecord[];
    salesLogs: SalesRecord[];
}

interface GroupedDay {
    dateStr: string; // YYYY-MM-DD
    displayDate: string;
    totalRevenue: number;
    totalUnsoldValue: number;
    totalItemsSold: number;
    products: Record<string, GroupedProduct>; // Group by Product ID
}

export default function AdminHistoryPage() {
    const [history, setHistory] = useState<GroupedDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQty, setEditQty] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);

            // 1. Fetch Products
            const { data: products } = await supabase.from('products').select('*');
            const productMap = (products || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);

            // 2. Fetch Inventory
            const { data: inventory } = await supabase
                .from('inventory_batches')
                .select('*')
                .order('created_at', { ascending: false });

            // 3. Fetch Sales
            const { data: sales } = await supabase
                .from('sales_logs')
                .select('*')
                .order('created_at', { ascending: false });

            // Grouping Logic
            const days: Record<string, GroupedDay> = {};

            const getDateKey = (isoString: string) => new Date(isoString).toISOString().split('T')[0];

            const getOrInitDay = (dateKey: string, dateObj: Date) => {
                if (!days[dateKey]) {
                    days[dateKey] = {
                        dateStr: dateKey,
                        displayDate: dateObj.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                        totalRevenue: 0,
                        totalUnsoldValue: 0,
                        totalItemsSold: 0,
                        products: {}
                    };
                }
                return days[dateKey];
            };

            const getOrInitProduct = (day: GroupedDay, pid: string, pname: string) => {
                if (!day.products[pid]) {
                    day.products[pid] = {
                        productId: pid,
                        productName: pname,
                        totalMade: 0,
                        totalSold: 0,
                        unsold: 0,
                        revenue: 0,
                        inventoryLogs: [],
                        salesLogs: []
                    };
                }
                return day.products[pid];
            };

            // Process Inventory
            (inventory || []).forEach(inv => {
                const dateKey = getDateKey(inv.created_at);
                const day = getOrInitDay(dateKey, new Date(inv.created_at));
                const pName = productMap[inv.product_id]?.name || 'Unknown';
                const prodGroup = getOrInitProduct(day, inv.product_id, pName);

                prodGroup.inventoryLogs.push({ ...inv, product_name: pName });
                prodGroup.totalMade += inv.quantity_made;
            });

            // Process Sales
            (sales || []).forEach(sale => {
                const dateKey = getDateKey(sale.created_at);
                const day = getOrInitDay(dateKey, new Date(sale.created_at));
                const product = productMap[sale.product_id];
                const pName = product?.name || 'Unknown';
                const prodGroup = getOrInitProduct(day, sale.product_id, pName);

                prodGroup.salesLogs.push({ ...sale, product_name: pName });
                prodGroup.totalSold += sale.quantity_sold;
                prodGroup.revenue += sale.quantity_sold * (product?.default_price || 0);

                day.totalItemsSold += sale.quantity_sold;
                day.totalRevenue += sale.quantity_sold * (product?.default_price || 0);
            });

            // Final Calculations (Unsold)
            Object.values(days).forEach(day => {
                Object.values(day.products).forEach(prod => {
                    prod.unsold = Math.max(0, prod.totalMade - prod.totalSold);
                    if (prod.unsold > 0) {
                        const price = productMap[prod.productId]?.default_price || 0;
                        day.totalUnsoldValue += prod.unsold * price;
                    }
                });
            });

            // Sort by Date Descending
            const sorted = Object.values(days).sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
            setHistory(sorted);

        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }

    const deleteRecord = async (table: 'inventory_batches' | 'sales_logs', id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await supabase.from(table).delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const startEdit = (id: string, currentQty: number) => {
        setEditingId(id);
        setEditQty(currentQty.toString());
    };

    const saveEdit = async (table: 'inventory_batches' | 'sales_logs', id: string) => {
        const newQty = parseInt(editQty);
        if (isNaN(newQty) || newQty < 0) {
            alert('Invalid quantity');
            return;
        }

        try {
            const field = table === 'inventory_batches' ? 'quantity_made' : 'quantity_sold';
            const { error } = await supabase.from(table).update({ [field]: newQty }).eq('id', id);
            if (error) throw error;
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error('Error updating:', error);
            alert('Failed to update');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="mb-2">
                        <BackButton />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">History & Edit</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading history...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No records found.</div>
                ) : (
                    <div className="space-y-4">
                        {history.map((day) => (
                            <ReceiptCard
                                key={day.dateStr}
                                date={day.displayDate}
                                totalItems={day.totalItemsSold}
                                totalValue={day.totalRevenue}
                                totalUnsoldValue={day.totalUnsoldValue}
                                type="sales"
                            >
                                <div className="space-y-4">
                                    {Object.values(day.products).map(product => (
                                        <ProductGroup
                                            key={product.productId}
                                            product={product}
                                            onDelete={deleteRecord}
                                            onEdit={saveEdit}
                                            editingId={editingId}
                                            setEditingId={setEditingId}
                                            editQty={editQty}
                                            setEditQty={setEditQty}
                                            startEdit={startEdit}
                                        />
                                    ))}
                                </div>
                            </ReceiptCard>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProductGroup({ product, onDelete, onEdit, editingId, setEditingId, editQty, setEditQty, startEdit }: any) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-sm">{product.productName}</h4>
                    <div className="flex space-x-3 text-xs mt-1">
                        <span className="text-blue-600 dark:text-blue-400">Made: {product.totalMade}</span>
                        <span className="text-green-600 dark:text-green-400">Sold: {product.totalSold}</span>
                        {product.unsold > 0 && <span className="text-red-500 dark:text-red-400 font-bold">Unsold: {product.unsold}</span>}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Total: RM {product.revenue.toFixed(2)}</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="bg-gray-50 dark:bg-gray-900/30 p-3 border-t border-gray-100 dark:border-gray-700 text-xs space-y-2">
                    {/* Inventory Logs */}
                    {product.inventoryLogs.map((log: any) => (
                        <LogItem
                            key={log.id}
                            log={log}
                            type="inventory"
                            onDelete={onDelete}
                            onEdit={onEdit}
                            editingId={editingId}
                            setEditingId={setEditingId}
                            editQty={editQty}
                            setEditQty={setEditQty}
                            startEdit={startEdit}
                        />
                    ))}
                    {/* Sales Logs */}
                    {product.salesLogs.map((log: any) => (
                        <LogItem
                            key={log.id}
                            log={log}
                            type="sales"
                            onDelete={onDelete}
                            onEdit={onEdit}
                            editingId={editingId}
                            setEditingId={setEditingId}
                            editQty={editQty}
                            setEditQty={setEditQty}
                            startEdit={startEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LogItem({ log, type, onDelete, onEdit, editingId, setEditingId, editQty, setEditQty, startEdit }: any) {
    const isEditing = editingId === log.id;
    const isSales = type === 'sales';
    const quantity = isSales ? log.quantity_sold : log.quantity_made;

    return (
        <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700/50 last:border-0">
            <div className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isSales ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <span className="text-gray-500 dark:text-gray-400 font-mono">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-gray-400 uppercase text-[10px]">{isSales ? 'Sold' : 'Made'}</span>
            </div>

            <div className="flex items-center space-x-2">
                {isEditing ? (
                    <div className="flex items-center space-x-1">
                        <input
                            type="number"
                            className="w-12 px-1 py-0.5 text-right border rounded text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            autoFocus
                        />
                        <button onClick={() => onEdit(isSales ? 'sales_logs' : 'inventory_batches', log.id)} className="text-green-600 hover:bg-green-100 p-0.5 rounded">
                            <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-red-500 hover:bg-red-100 p-0.5 rounded">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <span className={`font-bold ${isSales ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {isSales ? '-' : '+'}{quantity}
                        </span>
                        <div className="flex space-x-1 ml-2">
                            <button onClick={() => startEdit(log.id, quantity)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => onDelete(isSales ? 'sales_logs' : 'inventory_batches', log.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
