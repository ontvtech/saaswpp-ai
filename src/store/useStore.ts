import { create } from 'zustand';
import { MOCK_DATA, mockDelay } from '../services/mockData';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RESELLER' | 'MERCHANT';
  tenantId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  planModules?: string[];
  merchant?: {
    id: string;
    name: string;
    plan?: any;
    niche?: any;
    tokenQuota: number;
    tokenUsed: number;
  };
}

interface StoreState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: User | null;
  token: string | null;
  impersonatedMerchantId: string | null;
  impersonatedResellerId: string | null;
  setAuth: (user: User, token: string, merchant?: any) => void;
  setToken: (token: string) => void;
  setImpersonation: (type: 'merchant' | 'reseller' | null, id: string | null) => void;
  loginDemo: (role: 'ADMIN' | 'RESELLER' | 'MERCHANT') => void;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export const useStore = create<StoreState>()(
  (set, get) => ({
    theme: 'light',
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    user: null,
    token: null,
    impersonatedMerchantId: null,
    impersonatedResellerId: null,
    
    loginDemo: (role: 'ADMIN' | 'RESELLER' | 'MERCHANT') => {
      const demoUser: User = {
        id: 'demo-id',
        name: role === 'ADMIN' ? 'Admin Demo' : role === 'RESELLER' ? 'Revenda Demo' : 'Lojista Demo',
        email: 'demo@saaswpp.com',
        role: role,
        status: 'active',
        merchant: role === 'MERCHANT' ? {
          id: 'm-1',
          name: 'Loja Demo',
          tokenQuota: 100000,
          tokenUsed: 45000,
          plan: { name: 'Pro', tokenLimit: 100000 },
          niche: { name: 'Mecânica' }
        } : undefined
      };
      set({ user: demoUser, token: 'demo-token' });
    },

    setAuth: (user, token, merchant) => set({ 
      user: merchant ? { ...user, merchant } : user, 
      token 
    }),
    setToken: (token) => set({ token }),
    
    setImpersonation: (type, id) => set((state) => {
      if (type === 'merchant') return { impersonatedMerchantId: id, impersonatedResellerId: null };
      if (type === 'reseller') return { impersonatedMerchantId: null, impersonatedResellerId: id };
      return { impersonatedMerchantId: null, impersonatedResellerId: null };
    }),
    
    logout: () => set({ user: null, token: null, impersonatedMerchantId: null, impersonatedResellerId: null }),
    
    fetchWithAuth: async (url, options = {}) => {
      const token = get().token;
      const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        set({ user: null, token: null });
      }
      
      return response;
    },
  })
);
