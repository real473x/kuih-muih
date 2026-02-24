'use client';

import Image from 'next/image';
import { Counter } from './Counter';
import { Product } from '@/lib/types';

interface ProductCardProps {
    product: Product;
    quantity: number;
    onUpdateQuantity: (newQuantity: number) => void;
}

export function ProductCard({ product, quantity, onUpdateQuantity }: ProductCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 flex flex-col md:flex-row md:items-center">
            <div className="relative h-32 w-full md:w-32 md:h-full flex-shrink-0">
                {/* Using a placeholder if image fails or for optimization */}
                <div className="absolute inset-0 bg-gray-200" />
                {product.image_url ? (
                    <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized // Helpful for external Supabase URLs sometimes
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                        <span className="text-xs">No Photo</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="mb-2 md:mb-0">
                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                    <p className="text-gray-500 text-sm">RM {product.default_price.toFixed(2)} / unit</p>
                </div>

                <div className="mt-2 flex justify-between items-center">
                    <Counter
                        value={quantity}
                        onIncrement={() => onUpdateQuantity(quantity + 1)}
                        onDecrement={() => onUpdateQuantity(Math.max(0, quantity - 1))}
                    />
                    {quantity > 0 && (
                        <div className="text-right ml-4">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="font-bold text-green-600">
                                RM {(quantity * product.default_price).toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
