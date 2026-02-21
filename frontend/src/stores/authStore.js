import { create } from 'zustand';
import { authAPI } from '../api/endpoints';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data: res } = await authAPI.login({ email, password });
      const { user, accessToken, refreshToken } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      return res;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const rt = get().refreshToken;
      if (rt) {
        await authAPI.logout(rt).catch(() => {});
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    }
  },

  refreshAuth: async () => {
    const rt = get().refreshToken;
    if (!rt) return;

    try {
      const { data: res } = await authAPI.refresh(rt);
      const newToken = res.data.accessToken;

      localStorage.setItem('accessToken', newToken);
      set({ token: newToken });
    } catch {
      // Refresh failed — force logout
      get().logout();
    }
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
