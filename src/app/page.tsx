'use client';

import Link from 'next/link';
import { ChefHat, DollarSign, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Kuih Muih Tracker</h1>
          <p className="text-gray-500">Select your role to continue</p>
        </div>

        <div className="grid gap-4">
          <Link href="/mother" className="group relative block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-full group-hover:bg-orange-200 transition-colors">
                <ChefHat className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900">Mother Mode</h3>
                <p className="text-gray-500 text-sm">Record morning inventory</p>
              </div>
            </div>
          </Link>

          <Link href="/father" className="group relative block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-green-500 hover:shadow-md transition-all">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900">Father Mode</h3>
                <p className="text-gray-500 text-sm">Track sales & view total due</p>
              </div>
            </div>
          </Link>

          <Link href="/admin" className="group relative block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-purple-500 hover:shadow-md transition-all">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900">Admin Mode</h3>
                <p className="text-gray-500 text-sm">View analytics & wastage</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-8 text-xs text-gray-400">
          <p>Prototype v0.1</p>
        </div>
      </div>
    </div>
  );
}
