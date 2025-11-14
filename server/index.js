// server/index.js
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { startDevicePolling } from './poller.js';
import 'dotenv/config';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// === DEVICES CRUD ===
app.get('/api/devices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/devices', async (req, res) => {
  try {
    const { name, ip_address, port, api_endpoint, is_active } = req.body;

    if (!name || !ip_address) {
      return res.status(400).json({ success: false, error: 'Name and IP address are required' });
    }

    const { data, error } = await supabase
      .from('devices')
      .insert({
        name,
        ip_address,
        port: port || 4370,
        api_endpoint: api_endpoint || '/api/logs',
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === LOGS ENDPOINT (Supports single device or all via RPC) ===
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const deviceId = req.query.device_id;

    let data = [];
    let error = null;

    if (deviceId) {
      // Single device: direct query
      const tableName = `attendance_logs_${deviceId}`;
      const result = await supabase
        .from(tableName)
        .select(`
          *,
          devices!inner (
            id,
            name,
            ip_address
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      data = result.data || [];
      error = result.error;
    } else {
      // All devices: use RPC function
      const result = await supabase
        .rpc('get_all_device_logs', { p_limit: limit });

      data = result.data || [];
      error = result.error;
    }

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Polling devices every 10 seconds...`);
  startDevicePolling(supabase);
});