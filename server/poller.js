// server/poller.js
import ZKLib from 'node-zklib';

const POLL_INTERVAL = 10000;

// HARD‑CODED: Device Name → Table + Event Type
const DEVICE_CONFIG = {
  'Check-In': {
    table: 'attendance_logs_check_in',
    event_type: 'check_in'
  },
  'Check-Out': {
    table: 'attendance_logs_check_out',
    event_type: 'check_out'
  }
};

export function startDevicePolling(supabase) {
  console.log('Polling devices every 10 seconds...');
  pollAllDevices(supabase);
  setInterval(() => pollAllDevices(supabase), POLL_INTERVAL);
}

async function pollAllDevices(supabase) {
  try {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    if (!devices?.length) return console.log('No active devices');

    for (const device of devices) {
      const config = DEVICE_CONFIG[device.name];
      if (!config) {
        console.warn(`No config for device: ${device.name}`);
        continue;
      }
      await pollZKTecoDevice(device, supabase, config);
    }
  } catch (err) {
    console.error('Polling error:', err);
  }
}

async function getLastUserSn(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('user_sn')
      .order('user_sn', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') return 0;
    return Number(data?.user_sn || 0);
  } catch (err) {
    return 0;
  }
}

async function pollZKTecoDevice(device, supabase, config) {
  const zk = new ZKLib(device.ip_address, device.port || 4370, 20000);
  console.log(`Connecting to ${device.name} → ${config.table}`);

  try {
    await zk.createSocket();
    console.log(`Connected to ${device.name}`);

    const logs = await zk.getAttendances();
    const rawLogs = Array.isArray(logs) ? logs : logs?.data || [];

    if (!rawLogs.length) {
      await updateStatus(supabase, device.id, 'online');
      await disconnect(zk);
      return;
    }

    const lastUserSn = await getLastUserSn(supabase, config.table);
    const newLogs = rawLogs.filter(l => Number(l.userSn) > lastUserSn);

    if (!newLogs.length) {
      console.log(`${device.name}: No new logs`);
      await updateStatus(supabase, device.id, 'online');
      await disconnect(zk);
      return;
    }

    console.log(`${device.name}: Found ${newLogs.length} new log(s)`);

    // Get employee names (only for existing IDs)
    const empIds = [...new Set(newLogs.map(l => String(l.deviceUserId)))];
    const { data: employees = [] } = await supabase
      .from('employees')
      .select('id, name')
      .in('id', empIds);

    const empMap = {};
    employees.forEach(e => empMap[String(e.id)] = e.name);

    // Format EVERY log – name = null if not found
    const formatted = newLogs.map(l => ({
      device_id: device.id,
      employee_id: String(l.deviceUserId),
      employee_name: empMap[String(l.deviceUserId)] || null,   // ← NULL if missing
      user_sn: Number(l.userSn),
      timestamp: l.recordTime,
      method: 'fingerprint',
      event_type: config.event_type,
      raw_data: l,
    }));

    // INSERT ALL – no skipping
    await saveAllLogs(supabase, config.table, formatted);
    await updateStatus(supabase, device.id, 'online');
  } catch (err) {
    console.error(`Error polling ${device.name}:`, err.message || err);
    await updateStatus(supabase, device.id, 'offline');
  } finally {
    await disconnect(zk);
  }
}

// INSERT ALL LOGS – even with missing employee
async function saveAllLogs(supabase, tableName, logs) {
  if (!logs.length) return;

  try {
    const { error } = await supabase.from(tableName).insert(logs);
    if (error) throw error;
    console.log(`Saved ${logs.length} logs → ${tableName}`);
  } catch (err) {
    console.error(`Failed to save logs to ${tableName}:`, err);
  }
}

async function updateStatus(supabase, deviceId, status) {
  try {
    await supabase
      .from('devices')
      .update({ status, last_poll_at: new Date().toISOString() })
      .eq('id', deviceId);
  } catch (_) {}
}

async function disconnect(zk) {
  try { await zk.disconnect(); } catch (_) {}
}