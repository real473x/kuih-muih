'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/BackButton';
import { ReceiptCard } from '@/components/ReceiptCard';

interface Product {
    id: string;
    name: string;
    default_price: number;
    // Add other product fields if necessary
}

interface GroupedRecord {
    date: string;
    dateStr: string; // Keep raw string for key
    totalItems: number;
    totalValue: number;
    totalUnsoldValue: number;
    items: {
        name: string;
        quantity: number;
        subtotal: number;
        status?: 'sold' | 'unsold' | 'produced';
    }[];
}

export default function FatherHistoryPage() {
    const [history, setHistory] = useState<GroupedRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        try {
            setLoading(true);

            // 1. Fetch Products for reference
            const { data: products } = await supabase.from('products').select('*');
            const productMap = (products || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);

            // 2. Fetch Sales Logs
            const { data: salesData, error: salesError } = await supabase
                .from('sales_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            // 3. Fetch Inventory Logs (Production) to calculate Unsold
            // We need to fetch enough inventory to cover the sales dates. 
            // For simplicity, let's fetch all (or limit to last 30 days if strict, but 'all' for prototype is fine)
            const { data: inventoryData, error: invError } = await supabase
                .from('inventory_batches')
                .select('*');

            if (invError) throw invError;

            // Grouping Logic
            const grouped: Record<string, GroupedRecord> = {};

            // Helper to get date key
            const getDateKey = (isoString: string) => {
                return new Date(isoString).toISOString().split('T')[0];
            };

            // Initialize groups with Sales Data
            (salesData || []).forEach(record => {
                const dateKey = getDateKey(record.created_at);
                const productData = productMap[record.product_id];
                const val = record.quantity_sold * (productData?.default_price || 0);

                if (!grouped[dateKey]) {
                    grouped[dateKey] = {
                        dateStr: dateKey, // Store raw ISO date string part
                        date: new Date(record.created_at).toLocaleDateString(), // Display
                        totalItems: 0,
                        totalValue: 0,
                        totalUnsoldValue: 0,
                        items: []
                    };
                }

                grouped[dateKey].totalItems += record.quantity_sold;
                grouped[dateKey].totalValue += val;
                grouped[dateKey].items.push({
                    name: productData?.name || 'Unknown',
                    quantity: record.quantity_sold,
                    subtotal: val,
                    status: 'sold'
                });
            });

            // Process Inventory to find Unsold
            // We iterate over inventory and check if there's a corresponding sales record for that day/product.
            // Note: This logic assumes day-to-day sales. If something made yesterday is sold today, it might not align perfectly 
            // without complex FIFO/batch tracking. 
            // SIMPLIFIED LOGIC: Unsold = (Sum(Made on Date X) - Sum(Sold on Date X)). If negative, ignore (sold stock from prev days).

            const productionByDateAndProduct: Record<string, Record<string, number>> = {};
            (inventoryData || []).forEach(record => {
                const dateKey = getDateKey(record.created_at);
                if (!productionByDateAndProduct[dateKey]) productionByDateAndProduct[dateKey] = {};
                if (!productionByDateAndProduct[dateKey][record.product_id]) productionByDateAndProduct[dateKey][record.product_id] = 0;
                productionByDateAndProduct[dateKey][record.product_id] += record.quantity_made;
            });

            // Now, for each day in our grouped sales (or even days with NO sales but WITH production?), 
            // we should add unsold items.
            // For now, let's attach Unsold items to the DAYS WE HAVE SALES OR PRODUCTION.

            // We need a comprehensive list of all dates involved
            const allDates = new Set([...Object.keys(grouped), ...Object.keys(productionByDateAndProduct)]);

            allDates.forEach(dateKey => {
                if (!grouped[dateKey]) {
                    // Create group if it doesn't exist (e.g. day with production but no sales yet? 
                    // Actually, if NO sales, user might not check "Sales History". 
                    // But "Unsold" implies we should see it. Let's add it.)
                    grouped[dateKey] = {
                        dateStr: dateKey,
                        date: new Date(dateKey).toLocaleDateString(),
                        totalItems: 0,
                        totalValue: 0,
                        totalUnsoldValue: 0,
                        items: []
                    };
                }

                const dailyProd = productionByDateAndProduct[dateKey] || {};

                // For each product produced this day, check sales
                Object.keys(dailyProd).forEach(prodId => {
                    const made = dailyProd[prodId];
                    // Find sold count for this product on this day
                    const soldItem = grouped[dateKey].items.find(i => i.name === productMap[prodId]?.name && i.status === 'sold');
                    const sold = soldItem ? soldItem.quantity : 0; // WARNING: This assumes one sales entry per product per day, which might not be true if multiple sales.

                    // Actually, grouped[dateKey].items might have multiple entries for same product if multiple sales logs?
                    // My previous logic pushed a new item for EVERY sales log.
                    // To do accurate math, I should have aggregated sales first.
                    // Let's refine: The sales loop above pushes raw logs. 
                    // To get total sold for a product, I need to sum them up.
                    const totalSoldForProduct = grouped[dateKey].items
                        .filter(i => i.name === productMap[prodId]?.name && i.status === 'sold')
                        .reduce((sum, i) => sum + i.quantity, 0);

                    const unsold = Math.max(0, made - totalSoldForProduct);

                    if (unsold > 0) {
                        const productData = productMap[prodId];
                        const unsoldVal = unsold * (productData?.default_price || 0);

                        grouped[dateKey].totalUnsoldValue += unsoldVal;
                        grouped[dateKey].items.push({
                            name: productData?.name || 'Unknown',
                            quantity: unsold,
                            subtotal: unsoldVal,
                            status: 'unsold'
                        });
                    }
                });
            });

            // Convert map to array and sort by date (most recent first)
            const sortedDates = [...allDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setHistory(sortedDates.map(date => grouped[date])); // This might fail if I use Set, need Array.from or spread. Fixed above.

        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="mb-2">
                        <BackButton />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Sales History</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading history...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No sales records found.</div>
                ) : (
                    <div className="space-y-4">
                        {history.map((record) => (
                            <ReceiptCard
                                key={record.dateStr}
                                date={new Date(record.dateStr).toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                totalItems={record.totalItems}
                                totalValue={record.totalValue}
                                totalUnsoldValue={record.totalUnsoldValue}
                                items={record.items}
                                type="sales"
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
