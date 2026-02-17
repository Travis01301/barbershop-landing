'use client';

import React, { useState, useEffect } from 'react';
import { InventoryItem } from '@/lib/inventory-service';

interface InventoryListProps {
  shopId: number;
  onSelectItem?: (item: InventoryItem) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ shopId, onSelectItem }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [totalValue, setTotalValue] = useState<number>(0);

  useEffect(() => {
    fetchItems();
  }, [shopId]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory?shop_id=${shopId}&category=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch items');

      const data = await response.json();
      setItems(data.items);
      setTotalValue(data.totalValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current: number, threshold: number) => {
    if (current === 0) return 'text-red-600 font-semibold';
    if (current <= threshold) return 'text-yellow-600 font-semibold';
    return 'text-green-600';
  };

  if (loading) {
    return <div className="text-center py-4">Loading inventory...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Inventory Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-2xl font-bold">
              {items.filter((i) => i.current_quantity <= i.low_stock_threshold).length}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Categories</option>
          <option value="clippers">Clippers</option>
          <option value="shears">Shears</option>
          <option value="razors">Razors</option>
          <option value="products">Products</option>
          <option value="chemicals">Chemicals</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Item Name</th>
              <th className="border p-2 text-left">Category</th>
              <th className="border p-2 text-right">Quantity</th>
              <th className="border p-2 text-right">Unit Cost</th>
              <th className="border p-2 text-right">Total Value</th>
              <th className="border p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectItem?.(item)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="border p-2">{item.item_name}</td>
                <td className="border p-2 capitalize">{item.category}</td>
                <td className="border p-2 text-right">{item.current_quantity}</td>
                <td className="border p-2 text-right">${item.unit_cost.toFixed(2)}</td>
                <td className="border p-2 text-right">
                  ${(item.current_quantity * item.unit_cost).toFixed(2)}
                </td>
                <td className={`border p-2 ${getStockStatus(item.current_quantity, item.low_stock_threshold)}`}>
                  {item.current_quantity === 0 && 'Out of Stock'}
                  {item.current_quantity > 0 && item.current_quantity <= item.low_stock_threshold && 'Low Stock'}
                  {item.current_quantity > item.low_stock_threshold && 'In Stock'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No inventory items found
        </div>
      )}
    </div>
  );
};
