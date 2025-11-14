import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDeviceModal({ onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: '4370',
    api_endpoint: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidIP = (ip: string) => {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(p => {
      const n = parseInt(p);
      return !isNaN(n) && n >= 0 && n <= 255 && p === n.toString();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name.trim()) return setError('Name is required');
    if (!isValidIP(formData.ip_address)) return setError('Invalid IP address');

    try {
      const payload = {
        name: formData.name.trim(),
        ip_address: formData.ip_address.trim(),
        port: parseInt(formData.port) || 4370,
        api_endpoint: formData.api_endpoint.trim() || null,
        is_active: formData.is_active,
        device_type: 'zkteco',
      };

      const { error } = await supabase
        .from('devices')
        .insert(payload);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Device</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Check-In Gate"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use: <code className="bg-gray-100 px-1 rounded">Check-In Gate</code> or <code className="bg-gray-100 px-1 rounded">Check-Out Gate</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">IP Address</label>
            <input
              type="text"
              required
              value={formData.ip_address}
              onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="192.168.1.100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Port</label>
            <input
              type="text"
              required
              value={formData.port}
              onChange={e => setFormData({ ...formData, port: e.target.value.replace(/\D/g, '') })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="4370"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="ml-2 text-sm">Enable polling</label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}