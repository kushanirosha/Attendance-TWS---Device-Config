import React, { useState, useEffect } from 'react';
import { Clock, User, CreditCard, Fingerprint, Scan, Hash, LogIn, LogOut, DoorOpen, DoorClosed } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AttendanceLog } from '../types';

export function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          devices:device_id (
            id,
            name,
            ip_address
          )
        `)
        .order('timestamp', { ascending: false })
        .limit();

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'fingerprint':
        return <Fingerprint className="w-4 h-4" />;
      case 'face':
        return <Scan className="w-4 h-4" />;
      case 'pin':
        return <Hash className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'check_in':
        return <LogIn className="w-4 h-4" />;
      case 'check_out':
        return <LogOut className="w-4 h-4" />;
      case 'entry':
        return <DoorOpen className="w-4 h-4" />;
      case 'exit':
        return <DoorClosed className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'check_in':
      case 'entry':
        return 'bg-green-100 text-green-700';
      case 'check_out':
      case 'exit':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.devices?.id === filter);

  const uniqueDevices = Array.from(new Set(logs.map(log => log.devices?.id).filter(Boolean)));

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
        <h2 className="text-xl font-semibold text-gray-800">Recent Attendance Logs</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter by device:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Devices</option>
            {uniqueDevices.map((deviceId) => {
              const device = logs.find(log => log.devices?.id === deviceId)?.devices;
              return (
                <option key={deviceId} value={deviceId}>
                  {device?.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance logs yet</h3>
          <p className="text-gray-500">Logs will appear here once devices start reporting data</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.employee_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">ID: {log.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.devices?.name}</div>
                      <div className="text-xs text-gray-500">{log.devices?.ip_address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(log.method)}
                        <span className="text-sm text-gray-900 capitalize">{log.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getEventColor(log.event_type)}`}>
                        {getEventIcon(log.event_type)}
                        <span className="capitalize">{log.event_type.replace('_', ' ')}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
