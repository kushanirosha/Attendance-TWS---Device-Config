# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Verify Environment Variables

The `.env` file is already configured with Supabase credentials. No changes needed.

## Step 3: Start the Application

```bash
npm run dev
```

This command starts both:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Step 4: Add Your First Device

1. Open http://localhost:5173 in your browser
2. Click the "Add Device" button
3. Enter device details:
   - **Name**: "Main Entrance" (or any name)
   - **IP Address**: Your device's local IP (e.g., 192.168.1.101)
   - **Port**: 80 (or your device's HTTP port)
   - **API Endpoint**: /api/logs (or your device's endpoint)
   - Check "Enable polling" checkbox
4. Click "Add Device"

## Step 5: Monitor Logs

- The system will poll your device every 10 seconds
- New attendance logs appear automatically in the table
- Device status updates in real-time (online/offline/error)

## Testing Without Real Devices

### Option 1: Manual Database Insert

You can insert test data directly into Supabase:

1. Go to your Supabase dashboard
2. Navigate to Table Editor > attendance_logs
3. Insert a test row:
   - device_id: (copy from devices table)
   - employee_id: "EMP001"
   - employee_name: "John Doe"
   - timestamp: Current timestamp
   - method: "fingerprint"
   - event_type: "check_in"

### Option 2: Create a Mock Device Server

Create a file `mock-device.js`:

```javascript
const express = require('express');
const app = express();

app.get('/api/logs', (req, res) => {
  const logs = [
    {
      employee_id: `EMP${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
      employee_name: `Employee ${Math.floor(Math.random() * 50)}`,
      timestamp: new Date().toISOString(),
      method: ['card', 'fingerprint', 'face'][Math.floor(Math.random() * 3)],
      event_type: ['check_in', 'check_out'][Math.floor(Math.random() * 2)]
    }
  ];
  res.json(logs);
});

app.listen(8080, '0.0.0.0', () => {
  console.log('Mock device server running on http://localhost:8080');
});
```

Run it:
```bash
node mock-device.js
```

Then add device with:
- IP Address: `127.0.0.1`
- Port: `8080`
- API Endpoint: `/api/logs`

## Troubleshooting

### "Cannot connect to device"
- Ensure device is on the same network
- Ping the IP: `ping 192.168.1.101`
- Test endpoint: `curl http://192.168.1.101/api/logs`

### "Port 3001 already in use"
- Change `SERVER_PORT` in `.env` to a different port
- Restart the application

### Frontend not loading
- Clear browser cache
- Check console for errors (F12)
- Verify backend is running on port 3001

## Next Steps

- Configure your actual attendance devices
- Set up multiple devices for different locations
- Monitor the dashboard for real-time updates
- Export data from Supabase for reporting

---

Need help? Check the main README.md for detailed information.
