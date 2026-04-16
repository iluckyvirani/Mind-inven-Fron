import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosInstance from '../../api/axiosInstance';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface LoginResponseBody {
  success?: boolean;
  message?: string;
  user?: User;
  token?: string;
  data?: {
    user?: User;
    token?: string;
  };
}

interface ErrorResponseBody {
  message?: string;
  error?: string;
}

const normalizeLoginResponse = (payload: LoginResponseBody) => {
  const user = payload.user ?? payload.data?.user;
  const token = payload.token ?? payload.data?.token;

  if (!user || !token) {
    throw new Error(payload.message || 'Login response is missing user or token.');
  }

  return { user, token };
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Initialize from localStorage
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk<
  { user: User; token: string },
  { username: string; password: string },
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<LoginResponseBody>('/auth/login', {
        username: credentials.username,
        email: credentials.username,
        password: credentials.password,
      });

      return normalizeLoginResponse(response.data);
    } catch (err) {
      const error = err as AxiosError<LoginResponseBody>;

      try {
        if (error.response?.data?.success) {
          return normalizeLoginResponse(error.response.data);
        }
      } catch {
        // Fall through to the API error message below.
      }

      if (error.code === 'ERR_NETWORK') {
        return rejectWithValue('Cannot reach the API server. Check VITE_API_BASE_URL and backend availability.');
      }

      if (error.code === 'ECONNABORTED') {
        return rejectWithValue('Login request timed out.');
      }

      const errorData = error.response?.data as ErrorResponseBody | undefined;

      return rejectWithValue(
        errorData?.message || errorData?.error || error.message || 'Login failed. Please try again.'
      );
    }
  }
);

export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      return rejectWithValue(error.response?.data?.message || 'Logout failed.');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload ?? 'Login failed. Please try again.';
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
