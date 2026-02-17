import React from 'react';
import { Customer } from '@/types';

interface CustomerProfileProps {
  customer: Customer;
  isLoading?: boolean;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ 
  customer, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Customer ID: {customer.id}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            customer.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {customer.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                {customer.email}
              </a>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Phone</label>
              <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                {customer.phone}
              </a>
            </div>
            {customer.address && (
              <div>
                <label className="block text-sm font-medium text-gray-600">Address</label>
                <p className="text-gray-900">{customer.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Preferences Summary */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600">Total Appointments</label>
              <p className="text-2xl font-bold text-gray-900">{customer.totalAppointments || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Total Spent</label>
              <p className="text-2xl font-bold text-green-600">
                ${(customer.totalSpent || 0).toFixed(2)}
              </p>
            </div>
            {customer.joinDate && (
              <div>
                <label className="block text-sm font-medium text-gray-600">Member Since</label>
                <p className="text-gray-900">
                  {new Date(customer.joinDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preferred Services */}
      {customer.preferredServices && customer.preferredServices.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Preferred Services</h2>
          <div className="flex flex-wrap gap-2">
            {customer.preferredServices.map((service) => (
              <span 
                key={service}
                className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last Appointment */}
      {customer.lastAppointmentDate && (
        <div className="mt-6 pt-6 border-t">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Last Appointment</h2>
          <p className="text-gray-600">
            {new Date(customer.lastAppointmentDate).toLocaleDateString()} at{' '}
            {new Date(customer.lastAppointmentDate).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      )}
    </div>
  );
};
