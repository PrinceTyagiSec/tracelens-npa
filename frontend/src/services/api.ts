import axios from 'axios';
import {
  CaptureSummary, PacketSummary, PacketDetail, EndpointStat,
  ConversationStat, ProtocolTreeNode, IOGraphPoint, SecurityFinding,
  RiskScore, IocItem, StreamData, SystemHealth, NetworkInterface
} from '../types';

const API_BASE = '/api';

export const api = {
  // System
  getHealth: async (): Promise<SystemHealth> => {
    const res = await axios.get(`${API_BASE}/health`);
    return res.data;
  },
  getSystemStatus: async () => {
    const res = await axios.get(`${API_BASE}/system/status`);
    return res.data;
  },
  getSystemLogs: async () => {
    const res = await axios.get(`${API_BASE}/system/logs`);
    return res.data.logs;
  },

  // Captures
  listCaptures: async (): Promise<CaptureSummary[]> => {
    const res = await axios.get(`${API_BASE}/captures`);
    return res.data;
  },
  getCapture: async (id: string): Promise<CaptureSummary> => {
    const res = await axios.get(`${API_BASE}/captures/${id}`);
    return res.data;
  },
  uploadPcap: async (file: File): Promise<CaptureSummary> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/captures/upload`, formData);
    return res.data;
  },
  generateSampleCapture: async (): Promise<CaptureSummary> => {
    const res = await axios.post(`${API_BASE}/captures/sample`);
    return res.data;
  },
  deleteCapture: async (id: string) => {
    const res = await axios.delete(`${API_BASE}/captures/${id}`);
    return res.data;
  },

  // Packets
  getPackets: async (
    captureId: string,
    params?: { offset?: number; limit?: number; search?: string; protocol?: string; marked_only?: boolean }
  ): Promise<PacketSummary[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/packets`, { params });
    return res.data;
  },
  getPacketDetail: async (captureId: string, packetNo: number): Promise<PacketDetail> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/packets/${packetNo}`);
    return res.data;
  },
  updatePacketComment: async (
    captureId: string,
    packetNo: number,
    data: { comment?: string | null; marked?: boolean }
  ): Promise<PacketSummary> => {
    const res = await axios.patch(`${API_BASE}/captures/${captureId}/packets/${packetNo}/comment`, data);
    return res.data;
  },
  evaluateFilter: async (captureId: string, filterExpr: string) => {
    const res = await axios.post(`${API_BASE}/captures/${captureId}/packets/filter`, { filter_expr: filterExpr });
    return res.data;
  },
  validateFilter: async (filterExpr: string) => {
    const res = await axios.post(`${API_BASE}/filter/validate`, { filter_expr: filterExpr });
    return res.data;
  },
  getFilterAutocomplete: async (q: string) => {
    const res = await axios.get(`${API_BASE}/filter/autocomplete`, { params: { q } });
    return res.data;
  },
  getStream: async (captureId: string, streamId: number, protocol: string = 'tcp'): Promise<StreamData> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/packets/streams/${streamId}`, {
      params: { protocol }
    });
    return res.data;
  },

  // Statistics
  getEndpoints: async (captureId: string): Promise<EndpointStat[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/statistics/endpoints`);
    return res.data;
  },
  getConversations: async (captureId: string): Promise<ConversationStat[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/statistics/conversations`);
    return res.data;
  },
  getProtocolHierarchy: async (captureId: string): Promise<ProtocolTreeNode[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/statistics/protocols`);
    return res.data;
  },
  getIOGraph: async (captureId: string, buckets: number = 25): Promise<IOGraphPoint[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/statistics/iograph`, { params: { buckets } });
    return res.data;
  },

  // Analysis & Security
  getHttpTransactions: async (captureId: string) => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/analysis/http`);
    return res.data;
  },
  getDnsRecords: async (captureId: string) => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/analysis/dns`);
    return res.data;
  },
  getTlsSessions: async (captureId: string) => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/analysis/tls`);
    return res.data;
  },
  getSecurityFindings: async (captureId: string): Promise<SecurityFinding[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/analysis/findings`);
    return res.data;
  },
  getRiskScore: async (captureId: string): Promise<RiskScore> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/analysis/risk`);
    return res.data;
  },
  getIocs: async (captureId: string): Promise<IocItem[]> => {
    const res = await axios.get(`${API_BASE}/captures/${captureId}/analysis/iocs`);
    return res.data;
  },

  // Live Capture
  getInterfaces: async (): Promise<NetworkInterface[]> => {
    const res = await axios.get(`${API_BASE}/capture/interfaces`);
    return res.data;
  },
  startCapture: async (interfaceId: string, bpfFilter?: string, snaplen?: number) => {
    const res = await axios.post(`${API_BASE}/capture/start`, {
      interface: interfaceId,
      bpf_filter: bpfFilter,
      snaplen
    });
    return res.data;
  },
  pauseCapture: async () => {
    const res = await axios.post(`${API_BASE}/capture/pause`);
    return res.data;
  },
  resumeCapture: async () => {
    const res = await axios.post(`${API_BASE}/capture/resume`);
    return res.data;
  },
  stopCapture: async () => {
    const res = await axios.post(`${API_BASE}/capture/stop`);
    return res.data;
  },

  // AI
  getAiStatus: async () => {
    const res = await axios.get(`${API_BASE}/ai/status`);
    return res.data;
  },
  chatWithAi: async (data: {
    message: string;
    capture_id: string;
    selected_packet_no?: number;
    history?: { role: string; content: string }[];
  }) => {
    const res = await axios.post(`${API_BASE}/ai/chat`, data);
    return res.data;
  },
  explainPacket: async (captureId: string, packetNo: number) => {
    const res = await axios.post(`${API_BASE}/ai/explain_packet`, {
      capture_id: captureId,
      packet_no: packetNo
    });
    return res.data;
  },
  generateFilterWithAi: async (prompt: string, captureId: string) => {
    const res = await axios.post(`${API_BASE}/ai/generate_filter`, {
      prompt,
      capture_id: captureId
    });
    return res.data;
  },
  generateAiReport: async (captureId: string, model?: string) => {
    const res = await axios.post(`${API_BASE}/ai/report`, {
      capture_id: captureId,
      model
    });
    return res.data;
  }
};
