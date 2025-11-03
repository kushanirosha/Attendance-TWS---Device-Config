export interface Device {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  api_endpoint: string;
  is_active: boolean;
  last_poll_at: string | null;
  status: 'online' | 'offline' | 'error';
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  device_id: string;
  employee_id: string;
  employee_name: string | null;
  timestamp: string;
  method: 'card' | 'fingerprint' | 'face' | 'pin' | 'other';
  event_type: 'check_in' | 'check_out' | 'entry' | 'exit';
  raw_data: any;
  created_at: string;
  devices?: {
    id: string;
    name: string;
    ip_address: string;
  };
}
