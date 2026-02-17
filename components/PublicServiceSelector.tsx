'use client';

import { useEffect, useState } from 'react';

interface ServiceSelectorProps {
  shopSlug: string;
  shopId: number;
  barberId?: number;
  onSelect: (service: any) => void;
  onBack: () => void;
}

export function ServiceSelector({
  shopSlug,
  shopId,
  barberId,
  onSelect,
  onBack,
}: ServiceSelectorProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch(`/api/public/shops/${shopSlug}/services`);
        const data = await response.json();

        if (data.success) {
          setServices(data.services);
        } else {
          setError(data.error || 'Failed to load services');
        }
      } catch (err) {
        setError('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [shopSlug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Select a Service</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Choose the service you'd like</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => onSelect(service)}
              className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 transition-all text-left"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{service.description}</p>
                  )}
                  <div className="flex gap-4 mt-3 text-sm text-slate-600">
                    <span>⏱ {service.duration_minutes} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">${service.price.toFixed(2)}</div>
                </div>
              </div>

              {/* Add-ons if available */}
              {service.addOns && service.addOns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Optional Add-ons
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {service.addOns.slice(0, 3).map((addon: any) => (
                      <span
                        key={addon.id}
                        className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1 rounded-full"
                      >
                        +${addon.price.toFixed(2)} {addon.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
