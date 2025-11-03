/*
  # Attendance Device System - Database Schema

  ## Overview
  This migration sets up the database schema for an attendance device integration system
  that fetches logs from access control devices on the local network.

  ## 1. New Tables

  ### `devices`
  Stores configuration for attendance devices on the local network
  - `id` (uuid, primary key) - Unique identifier for each device
  - `name` (text) - Friendly name for the device (e.g., "Main Entrance")
  - `ip_address` (text, unique) - IP address of the device (e.g., "192.168.1.101")
  - `port` (integer) - Port number (default: 80)
  - `api_endpoint` (text) - API endpoint path (default: "/api/logs")
  - `is_active` (boolean) - Whether polling is enabled for this device
  - `last_poll_at` (timestamptz) - Timestamp of last successful poll
  - `status` (text) - Current status: 'online', 'offline', 'error'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `attendance_logs`
  Stores fetched attendance records from all devices
  - `id` (uuid, primary key) - Unique identifier for each log entry
  - `device_id` (uuid, foreign key) - Reference to the device that reported this log
  - `employee_id` (text) - Employee/user ID from the device
  - `employee_name` (text, nullable) - Employee name if provided by device
  - `timestamp` (timestamptz) - When the attendance was recorded
  - `method` (text) - Access method: 'card', 'fingerprint', 'face', 'pin', 'other'
  - `event_type` (text) - Event type: 'check_in', 'check_out', 'entry', 'exit'
  - `raw_data` (jsonb, nullable) - Original data from device for reference
  - `created_at` (timestamptz) - When this record was fetched and stored

  ## 2. Security
  - Enable Row Level Security (RLS) on both tables
  - Add policies for authenticated users to:
    - Read all device configurations
    - Read all attendance logs
    - Insert, update device configurations
    - Insert new attendance logs (for the polling service)

  ## 3. Indexes
  - Index on `attendance_logs.device_id` for fast device-specific queries
  - Index on `attendance_logs.timestamp` for time-based queries
  - Index on `attendance_logs.employee_id` for employee-specific lookups
  - Index on `devices.ip_address` for quick device lookups

  ## 4. Important Notes
  - The system uses polling to fetch logs every 10 seconds
  - Duplicate log prevention should be handled at application level
  - Raw device data is preserved in JSONB for debugging and future use
  - Timestamps are stored in UTC for consistency across time zones
*/

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ip_address text UNIQUE NOT NULL,
  port integer DEFAULT 80,
  api_endpoint text DEFAULT '/api/logs',
  is_active boolean DEFAULT true,
  last_poll_at timestamptz,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  employee_id text NOT NULL,
  employee_name text,
  timestamp timestamptz NOT NULL,
  method text DEFAULT 'other' CHECK (method IN ('card', 'fingerprint', 'face', 'pin', 'other')),
  event_type text DEFAULT 'entry' CHECK (event_type IN ('check_in', 'check_out', 'entry', 'exit')),
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_device_id ON attendance_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON attendance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip_address ON devices(ip_address);

-- Enable Row Level Security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices table
CREATE POLICY "Anyone can view devices"
  ON devices FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete devices"
  ON devices FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for attendance_logs table
CREATE POLICY "Anyone can view attendance logs"
  ON attendance_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert attendance logs"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();