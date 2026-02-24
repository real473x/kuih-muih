'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-4 p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50"
            aria-label="Go back"
        >
            <ArrowLeft className="w-6 h-6" />
            <span className="sr-only">Back</span>
        </button>
    );
}
