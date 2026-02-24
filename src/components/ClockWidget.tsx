'use client';

import { useState, useEffect } from 'react';

export function ClockWidget() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return null; // Prevent hydration mismatch

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-bold text-gray-800 dark:text-white font-mono tracking-wider">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">
                {time.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
        </div>
    );
}
