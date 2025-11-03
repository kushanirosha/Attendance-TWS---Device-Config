// server/poller.js
import ZKLib from 'node-zklib';

const POLL_INTERVAL = 10000; // 10 seconds

export function startDevicePolling(supabase) {
  pollAllDevices(supabase);
  setInterval(() => pollAllDevices(supabase), POLL_INTERVAL);
}

async function pollAllDevices(supabase) {
  try {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching devices:', error);
      return;
    }

    if (!devices?.length) {
      console.log('⚠️ No active devices configured for polling');
      return;
    }

    console.log(`🔄 Polling ${devices.length} device(s)...`);

    for (const device of devices) {
      if (device.port === 4370 || device.device_type === 'zkteco') {
        await pollZKTecoDevice(device, supabase);
      } else {
        console.log(`⚠️ Skipping ${device.name} (unsupported port ${device.port})`);
      }
    }
  } catch (err) {
    console.error('❌ Error in polling cycle:', err);
  }
}

async function getLastUserSn(supabase, deviceId) {
  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('user_sn')
      .eq('device_id', deviceId)
      .order('user_sn', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ getLastUserSn query error:', error);
      return 0;
    }

    const lastUserSn = Number(data?.user_sn || 0);
    console.log(`📘 Last userSn for device ${deviceId}: ${lastUserSn}`);
    return lastUserSn;
  } catch (err) {
    console.error('❌ getLastUserSn error:', err);
    return 0;
  }
}

async function pollZKTecoDevice(device, supabase) {
  const zk = new ZKLib(device.ip_address, device.port || 4370, 20000);
  console.log(`📡 Connecting to ZKTeco device: ${device.name}`);

  try {
    await zk.createSocket();
    console.log(`✅ Connected to ${device.name}`);

    // Step 1: Get attendance logs
    let rawLogs = [];
    try {
      const logs = await zk.getAttendances();
      rawLogs = Array.isArray(logs) ? logs : logs?.data || [];
    } catch (err) {
      console.warn(`⚠️ Could not fetch attendances from ${device.name}:`, err.message || err);
    }

    if (!rawLogs.length) {
      console.log(`📭 ${device.name}: No new logs`);
      await safeDisconnect(zk, device);
      await updateDeviceStatus(supabase, device.id, 'online');
      return;
    }

    // Step 2: Filter only new logs
    const lastUserSn = await getLastUserSn(supabase, device.id);
    const newLogs = rawLogs.filter(log => Number(log.userSn) > Number(lastUserSn));

    if (!newLogs.length) {
      console.log(`📭 ${device.name}: No new logs beyond userSn ${lastUserSn}`);
      await safeDisconnect(zk, device);
      await updateDeviceStatus(supabase, device.id, 'online');
      return;
    }

    console.log(`🆕 ${device.name}: Found ${newLogs.length} new log(s)`);

    // Step 3: Fetch employee names from Supabase employees table
    const employeeIds = Array.from(
      new Set(newLogs.map(l => String(l.deviceUserId)))
    );

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name')
      .in('id', employeeIds);

    if (empError) {
      console.warn('⚠️ Error fetching employee names:', empError);
    }

    const employeeMap = {};
    if (employees?.length) {
      employees.forEach(emp => {
        employeeMap[String(emp.id)] = emp.name;
      });
    }

    // Step 4: Prepare logs
    const formattedLogs = newLogs.map(l => ({
      device_id: device.id,
      employee_id: String(l.deviceUserId),
      employee_name: employeeMap[String(l.deviceUserId)] || null, // from DB
      timestamp: l.recordTime,
      method: 'fingerprint',
      event_type: 'check_out',
      raw_data: l,
    }));

    // console.log('🧾 Example formatted log:', formattedLogs[0]);

    // Step 5: Save logs
    await saveLogsToDatabase(supabase, device.id, formattedLogs);

    await safeDisconnect(zk, device);
    await updateDeviceStatus(supabase, device.id, 'online');
  } catch (err) {
    console.error(`❌ Error polling ${device.name}:`, err.message || err);
    await safeDisconnect(zk, device);
    await updateDeviceStatus(supabase, device.id, 'offline');
  }
}

async function saveLogsToDatabase(supabase, deviceId, logs) {
  if (!logs.length) return;

  try {
    const sanitized = logs.map(({ user_sn, ...rest }) => rest);
    const { error } = await supabase.from('attendance_logs').insert(sanitized);

    if (error) {
      console.error('❌ Supabase insert error:', error);
    } else {
      console.log(`💾 Saved ${logs.length} new logs for device ${deviceId}`);
    }
  } catch (err) {
    console.error('❌ Error saving logs to database:', err);
  }
}

async function updateDeviceStatus(supabase, deviceId, status) {
  try {
    await supabase
      .from('devices')
      .update({
        status,
        last_poll_at: new Date().toISOString(),
      })
      .eq('id', deviceId);
    console.log(`ℹ️ Updated device ${deviceId} status to '${status}'`);
  } catch (err) {
    console.error('❌ Error updating device status:', err);
  }
}

async function safeDisconnect(zk, device) {
  try {
    await zk.disconnect();
    console.log(`🔌 Disconnected from ${device.name}`);
  } catch (err) {
    console.warn(`⚠️ Could not disconnect from ${device.name}:`, err.message || err);
  }
}
