import React, { useState, useEffect } from "react";
import { Shield, Activity, Server } from "lucide-react";
import { DeviceList } from "./components/DeviceList";
import { AttendanceLogs } from "./components/AttendanceLogs";
import { supabase } from "./lib/supabase";

function App() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    todayLogs: 0,
  });

  useEffect(() => {
    loadStats();

    const interval = setInterval(loadStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const { data: devices } = await supabase.from("devices").select("*");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayLogs } = await supabase
        .from("attendance_logs")
        .select("id")
        .gte("timestamp", today.toISOString());

      setStats({
        totalDevices: devices?.length || 0,
        activeDevices:
          devices?.filter((d) => d.status === "online").length || 0,
        todayLogs: todayLogs?.length || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="mb-8 bg-white py-2 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="bg-white py-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Attendance Device Manager
              </h1>
              <p className="text-gray-600">
                Real-time attendance machine monitoring system
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Devices
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalDevices}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Online Devices
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.activeDevices}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <DeviceList />
          {/* <AttendanceLogs /> */}
        </div>

        <footer className="fixed bottom-0 left-0 w-full bg-white py-2 text-center text-sm text-gray-500 border-t">
          <p>@2025 All Rights Reserved - TWS</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
