import React from 'react';
import { Appointment } from '@/types';

interface CustomerHistoryProps {
  appointments: Appointment[];
  isLoading?: boolean;
}

export const CustomerHistory: React.FC<CustomerHistoryProps> = ({ 
  appointments, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-500 text-lg">No appointment history found.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-orange-100 text-orange-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Appointment History</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Service</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Barber</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {new Date(appointment.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(appointment.date).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {appointment.service}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  ${appointment.price.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {appointment.barberName || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statistics Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Total Visits</p>
            <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {appointments.filter(a => a.status.toLowerCase() === 'completed').length}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">
              {appointments.filter(a => a.status.toLowerCase() === 'cancelled').length}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Total Spent</p>
            <p className="text-2xl font-bold text-green-600">
              ${appointments.reduce((sum, a) => sum + a.price, 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
