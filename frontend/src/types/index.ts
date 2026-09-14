export interface CaptureSummary {
  id: string;
  filename: string;
  file_size: number;
  packet_count: number;
  duration: number;
  start_time: number | null;
  end_time: number | null;
  status: string;
  error_message: string | null;
  capture_type: string;
  interface: string | null;
  created_at: string;
}

export interface PacketSummary {
  id: string;
  packet_no: number;
  timestamp: number;
  time_delta: number;
  src_ip: string;
  dst_ip: string;
  src_port: number | null;
  dst_port: number | null;
  protocol: string;
  length: number;
  info: string;
  marked: boolean;
  comment: string | null;
}

export interface ProtocolLayer {
  name: string;
  summary: string;
  fields: Record<string, string>;
  expanded?: boolean;
}

export interface PacketDetail extends PacketSummary {
  raw_layers: ProtocolLayer[];
  hex_dump: string;
  ascii_dump: string;
  raw_hex: string;
}

export interface EndpointStat {
  ip: string;
  packets: number;
  bytes: number;
  packets_sent: number;
  packets_recv: number;
  bytes_sent: number;
  bytes_recv: number;
  country: string;
}

export interface ConversationStat {
  id: string;
  protocol: string;
  host_a: string;
  host_b: string;
  port_a: number | null;
  port_b: number | null;
  packets: number;
  bytes: number;
  duration: number;
  stream_id: number | null;
}

export interface ProtocolTreeNode {
  name: string;
  protocol: string;
  packets: number;
  bytes: number;
  percent_packets: number;
  percent_bytes: number;
  children: ProtocolTreeNode[];
  indent?: number;
}

export interface IOGraphPoint {
  timestamp: number;
  time_label: string;
  packets: number;
  bytes: number;
  tcp_packets: number;
  udp_packets: number;
  dns_packets: number;
  http_packets: number;
  tls_packets: number;
}

export interface SecurityFinding {
  id: string;
  category: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  evidence: string;
  affected_packets: number[];
  affected_hosts: string[];
  why_it_matters: string;
  recommendation: string;
  created_at: string;
}

export interface RiskScore {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  findings_count: Record<string, number>;
  breakdown: Record<string, number>;
  label: string;
}

export interface IocItem {
  type: "ip" | "domain" | "url" | "user_agent" | "port" | "hash";
  value: string;
  context: string;
  first_seen_packet: number;
  count: number;
}

export interface StreamMessage {
  direction: "client_to_server" | "server_to_client";
  payload_ascii: string;
  payload_hex: string;
  payload_raw: string;
  src: string;
  dst: string;
  timestamp: number;
  length: number;
}

export interface StreamData {
  stream_id: number;
  protocol: string;
  client: string;
  server: string;
  total_packets: number;
  total_bytes: number;
  messages: StreamMessage[];
}

export interface SystemHealth {
  backend: string;
  database: string;
  packet_engine: string;
  live_capture: string;
  ollama: string;
}

export interface NetworkInterface {
  id: string;
  device: string;
  name: string;
  status: string;
}
