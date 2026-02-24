'use client';

import { Minus, Plus } from 'lucide-react';

interface CounterProps {
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
}

export function Counter({ value, onIncrement, onDecrement }: CounterProps) {
    return (
        <div className="flex items-center space-x-4 bg-gray-100 rounded-full p-2">
            <button
                onClick={onDecrement}
                className="p-3 bg-white rounded-full shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                disabled={value <= 0}
                aria-label="Decrease quantity"
            >
                <Minus className="w-6 h-6 text-red-500" />
            </button>

            <span className="text-2xl font-bold w-12 text-center select-none text-gray-900">
                {value}
            </span>

            <button
                onClick={onIncrement}
                className="p-3 bg-white rounded-full shadow-sm active:scale-95 transition-transform"
                aria-label="Increase quantity"
            >
                <Plus className="w-6 h-6 text-green-500" />
            </button>
        </div>
    );
}
