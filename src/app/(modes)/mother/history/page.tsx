'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/BackButton';
import { ReceiptCard } from '@/components/ReceiptCard';

interface HistoryBatch {
    dateStr: string;
    totalItems: number;
    totalValue: number;
    items: {
        name: string;
        quantity: number;
        subtotal: number;
        status?: 'sold' | 'unsold' | 'produced';
    }[];
}

export default function MotherHistoryPage() {
    const [history, setHistory] = useState<HistoryBatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_batches')
                .select('created_at, quantity_made, unit_price, products(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by Date
            const grouped: Record<string, HistoryBatch> = {};

            data?.forEach(record => {
                const date = new Date(record.created_at).toLocaleDateString('en-MY', {
                    weekday: 'short', day: 'numeric', month: 'short'
                });

                if (!grouped[date]) {
                    grouped[date] = {
                        dateStr: date,
                        totalItems: 0,
                        totalValue: 0,
                        items: []
                    };
                }

                grouped[date].totalItems += record.quantity_made;
                const val = record.quantity_made * record.unit_price;
                grouped[date].totalValue += val;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const prodName = Array.isArray(record.products) ? record.products[0]?.name : (record.products as any)?.name;

                grouped[date].items.push({
                    name: prodName || 'Unknown',
                    quantity: record.quantity_made,
                    subtotal: val,
                    status: 'produced'
                });
            });

            setHistory(Object.values(grouped));

        } catch (error) {
            console.error(error);
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Production History</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading records...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No records found.</div>
                ) : (
                    history.map((batch, idx) => (
                        <ReceiptCard
                            key={idx}
                            date={batch.dateStr}
                            totalItems={batch.totalItems}
                            totalValue={batch.totalValue}
                            items={batch.items}
                        />
                    ))
                )}
            </main>
        </div>
    );
}
