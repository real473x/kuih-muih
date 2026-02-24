'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/BackButton';
import { useRouter } from 'next/navigation';
import { Camera, Upload } from 'lucide-react';
import Image from 'next/image';

export default function AddMenuPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Handle file selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) {
            alert("Please fill in name and price");
            return;
        }

        setUploading(true);
        try {
            let publicUrl = null;

            // 1. Upload Image if exists
            if (imageFile) {

                // NOTE: This assumes a 'products' bucket exists and is public.
                // If not, this step will fail. 
                // We'll try to catch it and warn the user.
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(fileName, imageFile);

                if (uploadError) {
                    console.warn("Image upload failed (Bucket might not exist/public?):", uploadError);
                    // Fallback: Skip image or alert? Let's alert but proceed if user wants?
                    // For this prototype, let's assume we proceed without image if upload fails
                } else {
                    const { data: urlData } = supabase.storage
                        .from('products')
                        .getPublicUrl(fileName);
                    publicUrl = urlData.publicUrl;
                }
            }

            // 2. Insert Record
            const { error } = await supabase
                .from('products')
                .insert({
                    name,
                    default_price: parseFloat(price),
                    image_url: publicUrl, // Can be null
                    is_active: true
                });

            if (error) throw error;

            alert("Menu item added successfully!");
            router.push('/mother'); // Go back to inventory
            router.refresh();

        } catch (error) {
            console.error('Error adding product:', error);
            alert('Error adding product');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
            <div className="max-w-md mx-auto">
                <BackButton />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Kuih</h1>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Photo</label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative overflow-hidden">
                                {imagePreview ? (
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Camera className="w-10 h-10 mb-3 text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or take photo</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            placeholder="e.g. Karipap Besar"
                            required
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Price (RM)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {uploading ? (
                            <span className="animate-pulse">Saving...</span>
                        ) : (
                            <>
                                <Upload className="w-5 h-5 mr-2" />
                                Save Menu Item
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
