'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ShopDisplayProps {
  shopSlug: string;
}

export function ShopDisplay({ shopSlug }: ShopDisplayProps) {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        // You would fetch shop details from an API endpoint
        // For now, this is a placeholder
        setLoading(false);
      } catch (error) {
        console.error('Failed to load shop:', error);
        setLoading(false);
      }
    };

    fetchShop();
  }, [shopSlug]);

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {shop?.logo_url && (
              <Image
                src={shop.logo_url}
                alt={shop.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {shop?.name || 'Barbershop'}
              </h1>
              {shop?.address && (
                <p className="text-sm text-slate-600">📍 {shop.address}</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
              ✓ Booking Available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
