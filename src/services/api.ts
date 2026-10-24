import {
  HerbBatch,
  SupplyChainEvent,
  LabTest,
  Product,
  User,
  BlockchainStatus,
  LedgerBlock,
  AuditLog,
} from '../types';

const TOKEN_KEY = 'herborigin_auth_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || `Request failed with status ${res.status}`, res.status);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(payload: { email: string; password: string }) {
    const res = await request<{ message: string; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
    phone?: string;
    organization?: string;
    location?: string;
    licenseNumber?: string;
    adminSecretKey?: string;
  }) {
    const res = await request<{ message: string; token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe() {
    return request<{ user: User }>('/api/auth/me');
  },

  async updateProfile(payload: Partial<User>) {
    return request<{ message: string; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(email: string) {
    return request<{ message: string; resetToken?: string; expiresAt?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(payload: { token: string; newPassword: string; confirmPassword: string }) {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  // Batches
  async getBatches(params?: { search?: string; status?: string; herbName?: string; collectorId?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.herbName) query.set('herbName', params.herbName);
    if (params?.collectorId) query.set('collectorId', params.collectorId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ batches: HerbBatch[]; total: number }>(`/api/batches${qs}`);
  },

  async getBatchById(id: string) {
    return request<{ batch: HerbBatch; events: SupplyChainEvent[]; labTests: LabTest[] }>(`/api/batches/${id}`);
  },

  async createBatch(payload: any) {
    return request<{ message: string; batch: HerbBatch; event: SupplyChainEvent }>('/api/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateBatch(id: string, updates: Partial<HerbBatch>) {
    return request<{ message: string; batch: HerbBatch; txHash: string }>(`/api/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteBatch(id: string) {
    return request<{ message: string }>(`/api/batches/${id}`, {
      method: 'DELETE',
    });
  },

  // Events
  async getEvents(batchId: string) {
    return request<{ events: SupplyChainEvent[] }>(`/api/events/batch/${batchId}`);
  },

  async addEvent(payload: {
    batchId: string;
    eventType: SupplyChainEvent['eventType'];
    title: string;
    description: string;
    location?: string;
  }) {
    return request<{ message: string; event: SupplyChainEvent }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Lab Tests
  async getLabTests(batchId?: string) {
    const url = batchId ? `/api/lab-tests/batch/${batchId}` : '/api/lab-tests';
    return request<{ labTests: LabTest[]; total?: number }>(url);
  },

  async addLabTest(payload: any) {
    return request<{ message: string; labTest: LabTest; batchStatus: string }>('/api/lab-tests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Products
  async getProducts() {
    return request<{ products: Product[]; total: number }>('/api/products');
  },

  async getProductById(id: string) {
    return request<{ product: Product; batches: HerbBatch[] }>(`/api/products/${id}`);
  },

  async createProduct(payload: any) {
    return request<{ message: string; product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Stats & Admin
  async getStats() {
    return request<{
      metrics: {
        totalBatches: number;
        totalQuantityKg: number;
        approvedBatches: number;
        pendingBatches: number;
        rejectedBatches: number;
        passRatePercent: number;
        totalProducts: number;
        totalBlocks: number;
        totalTransactions: number;
        rolesBreakdown: Record<string, number>;
      };
    }>('/api/stats/overview');
  },

  async getAdminUsers() {
    return request<{ users: User[] }>('/api/stats/admin/users');
  },

  async updateAdminUserStatus(id: string, updates: { isApproved?: boolean; role?: User['role'] }) {
    return request<{ message: string; user: User }>(`/api/stats/admin/users/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getAuditLogs() {
    return request<{ logs: AuditLog[] }>('/api/stats/admin/audit-logs');
  },

  // Blockchain
  async getBlockchainStatus() {
    return request<{ status: BlockchainStatus }>('/api/blockchain/status');
  },

  async getLedgerBlocks() {
    return request<{ blocks: LedgerBlock[]; totalBlocks: number }>('/api/blockchain/blocks');
  },

  async getContractSource() {
    return request<{ contractName: string; compilerVersion: string; license: string; sourceCode: string }>(
      '/api/blockchain/contract'
    );
  },

  async verifyRecord(identifier: string) {
    return request<{ result: any }>(`/api/blockchain/verify/${encodeURIComponent(identifier)}`);
  },

  // Public QR Verify
  async verifyPublicQr(identifier: string) {
    return request<any>(`/api/public/verify/${encodeURIComponent(identifier)}`);
  },
};
