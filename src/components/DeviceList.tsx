import React, { useState, useEffect } from 'react';
import { Plus, Server, Wifi, WifiOff, AlertCircle, Trash2, Power, PowerOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Device } from '../types';
import { AddDeviceModal } from './AddDeviceModal';

export function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadDevices();

    const channel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
        },
        () => {
          loadDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDevice = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadDevices();
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);

      if (error) throw error;
      loadDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Configured Devices</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Device
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No devices configured</h3>
          <p className="text-gray-500 mb-6">Add your first attendance device to start fetching logs</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{device.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(device.status)}
                  <span className={`text-xs font-medium ${device.status === 'online' ? 'text-green-600' : device.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                    {getStatusText(device.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">IP:</span>
                  <span className="font-mono">{device.ip_address}:{device.port}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Endpoint:</span>
                  <span className="font-mono text-xs">{device.api_endpoint}</span>
                </div>
                {device.last_poll_at && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Last poll:</span>
                    <span className="text-xs">{new Date(device.last_poll_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => toggleDevice(device.id, device.is_active)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    device.is_active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {device.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                  {device.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => deleteDevice(device.id)}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && <AddDeviceModal onClose={() => setShowAddModal(false)} onSuccess={loadDevices} />}
    </div>
  );
}
