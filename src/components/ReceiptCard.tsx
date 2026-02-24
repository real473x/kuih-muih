'use client';

import { ChevronDown, ChevronUp, TrendingUp, Package } from 'lucide-react';
import { useState } from 'react';

interface ReceiptItem {
    name: string;
    quantity: number;
    subtotal: number;
    status?: 'sold' | 'unsold' | 'produced'; // New status
}

interface ReceiptCardProps {
    date: string;
    totalItems: number;
    totalValue: number;
    totalUnsoldValue?: number;
    items?: ReceiptItem[]; // Make optional
    type?: 'sales' | 'production' | 'admin_sales' | 'admin_inventory';
    children?: React.ReactNode; // New prop for custom content
}

export function ReceiptCard({ date, totalItems, totalValue, totalUnsoldValue, items = [], type = 'production', children }: ReceiptCardProps) {
    const [expanded, setExpanded] = useState(false);

    const getStatusColor = (status?: string) => {
        if (status === 'sold') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        if (status === 'unsold') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        if (status === 'produced') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    const getStatusLabel = (status?: string) => {
        if (status === 'sold') return 'Sold';
        if (status === 'unsold') return 'Unsold';
        if (status === 'produced') return 'Added';
        return '';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all mb-3">
            <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${type === 'sales' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'}`}>
                        {type === 'sales' ? <TrendingUp className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">{date}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{totalItems} {type === 'sales' ? 'sold' : 'made'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <span className={`font-bold text-lg block ${type === 'sales' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            RM {totalValue.toFixed(2)}
                        </span>
                        {totalUnsoldValue !== undefined && totalUnsoldValue > 0 && (
                            <span className="text-xs text-red-500 dark:text-red-400 font-medium block">
                                Unsold: RM {totalUnsoldValue.toFixed(2)}
                            </span>
                        )}
                    </div>
                    {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-100 dark:border-gray-700 text-sm">
                    {children ? (
                        children
                    ) : (
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${item.status === 'sold' ? 'bg-green-500' : item.status === 'unsold' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-xs text-gray-400">x{item.quantity}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {item.status && (
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getStatusColor(item.status)}`}>
                                                {getStatusLabel(item.status)}
                                            </span>
                                        )}
                                        <span className="font-medium">RM {item.subtotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white">
                                <span>Total Revenue</span>
                                <span>RM {totalValue.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
