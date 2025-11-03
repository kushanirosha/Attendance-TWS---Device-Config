# Attendance Device Manager

A real-time attendance log monitoring system that connects to access control devices on your local network to fetch and display attendance records automatically.

## Features

- **Device Management**: Add, configure, and monitor multiple attendance devices
- **Real-time Polling**: Automatically polls devices every 10 seconds for new logs
- **Live Dashboard**: View attendance logs in real-time with auto-refresh
- **Device Status Monitoring**: Track online/offline status of each device
- **Flexible Configuration**: Support for various device types and API endpoints
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Secure Storage**: All data stored securely in Supabase database

## Architecture

### Backend (`/server`)
- **Express.js** server for API endpoints
- **Device Poller** that fetches logs from attendance devices every 10 seconds
- **Supabase Integration** for data persistence
- Automatic device status tracking (online/offline/error)

### Frontend (`/src`)
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- Real-time updates using Supabase subscriptions

## Prerequisites

- Node.js 18+ installed
- Attendance devices on the same local network
- Devices should expose an HTTP API endpoint (default: `/api/logs`)

## Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables are already configured in `.env`:**
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SERVER_PORT` - Backend server port (default: 3001)

3. **Database is already set up** with the required tables:
   - `devices` - Store device configurations
   - `attendance_logs` - Store fetched attendance records

## Usage

### Starting the System

Run both frontend and backend simultaneously:

```bash
npm run dev
```

This will start:
- **Frontend** at `http://localhost:5173`
- **Backend** at `http://localhost:3001`

The backend will automatically start polling configured devices every 10 seconds.

### Adding Devices

1. Open the web interface at `http://localhost:5173`
2. Click **"Add Device"** button
3. Fill in the device details:
   - **Device Name**: Friendly name (e.g., "Main Entrance")
   - **IP Address**: Device IP on your local network (e.g., "192.168.1.101")
   - **Port**: Device HTTP port (default: 80)
   - **API Endpoint**: Path to logs endpoint (default: "/api/logs")
   - **Enable polling**: Toggle to start/stop automatic polling

4. Click **"Add Device"** to save

### Device API Requirements

Your attendance devices should expose an HTTP API that returns logs in one of these formats:

**Format 1: Array**
```json
[
  {
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "timestamp": "2025-10-28T10:30:00Z",
    "method": "fingerprint",
    "event_type": "check_in"
  }
]
```

**Format 2: Object with logs array**
```json
{
  "logs": [
    {
      "employee_id": "EMP001",
      "employee_name": "John Doe",
      "timestamp": "2025-10-28T10:30:00Z",
      "method": "card",
      "event_type": "entry"
    }
  ]
}
```

**Format 3: Object with data array**
```json
{
  "data": [
    {
      "employee_id": "EMP001",
      "timestamp": "2025-10-28T10:30:00Z",
      "method": "face"
    }
  ]
}
```

**Supported Fields:**
- `employee_id` (required): Employee/user identifier
- `employee_name` (optional): Employee name
- `timestamp` (required): ISO 8601 timestamp
- `method` (optional): Access method - `card`, `fingerprint`, `face`, `pin`, `other`
- `event_type` (optional): Event type - `check_in`, `check_out`, `entry`, `exit`

### Testing with Mock Device

For testing, you can create a simple mock device server:

```javascript
// mock-device.js
const express = require('express');
const app = express();

app.get('/api/logs', (req, res) => {
  const mockLogs = [
    {
      employee_id: `EMP${Math.floor(Math.random() * 999)}`,
      employee_name: 'Test Employee',
      timestamp: new Date().toISOString(),
      method: 'fingerprint',
      event_type: 'check_in'
    }
  ];
  res.json(mockLogs);
});

app.listen(8080, () => {
  console.log('Mock device running on port 8080');
});
```

Then add device with IP: `127.0.0.1`, Port: `8080`

## Dashboard Features

### Statistics Panel
- **Total Devices**: Number of configured devices
- **Online Devices**: Number of currently online devices
- **Today's Logs**: Number of attendance records received today

### Device Management
- View all configured devices
- See real-time status (online/offline/error)
- Toggle device polling on/off
- Delete devices
- View last poll timestamp

### Attendance Logs
- Real-time log display (updates automatically)
- Filter by device
- Shows employee ID and name
- Access method indicator
- Event type (check-in/check-out/entry/exit)
- Timestamp for each log

## Troubleshooting

### Device shows "Offline" status
- Verify the device is powered on and connected to the network
- Ping the device IP: `ping 192.168.1.101`
- Check if the device API is accessible: `curl http://192.168.1.101/api/logs`
- Verify firewall settings allow HTTP connections

### No logs appearing
- Check device status is "Online"
- Verify the API endpoint returns data
- Check browser console for errors
- Review server logs for connection issues

### Server won't start
- Ensure port 3001 is not in use
- Check all environment variables are set
- Verify Node.js version is 18+

## Production Deployment

For production use:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Use a process manager** (PM2, systemd) to keep the server running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "attendance-server" -- run server
   ```

3. **Serve the frontend** with a web server (nginx, apache)

4. **Configure firewall rules** to allow access to devices

## API Endpoints

The backend exposes these REST endpoints:

- `GET /health` - Health check
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device
- `GET /api/logs?limit=100&device_id=xxx` - Get attendance logs

## Security Notes

- The system uses Supabase Row Level Security (RLS) for data protection
- All device communication happens over your local network
- No sensitive credentials are exposed in the frontend
- Consider using VPN or firewall rules in production environments

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime subscriptions
- **Icons**: Lucide React

## Support

For issues or questions:
1. Check device connectivity and API format
2. Review server logs for error messages
3. Verify Supabase connection is active
4. Ensure all dependencies are installed

---

Built with modern web technologies for reliable attendance monitoring.
