import { createSlice } from "@reduxjs/toolkit";

const LOCAL_KEY = "authData";

let token = null;
let data = null;

try {
  const stored = JSON.parse(localStorage.getItem(LOCAL_KEY));
  if (stored && stored.token) {
    token = stored.token;
    data = stored.data;
  }
} catch (err) {
  console.warn("Failed to parse auth data from localStorage:", err);
}

const initialState = {
  isAuthenticated: !!token,
  token,
  data,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      const { token, data } = action.payload;
      state.isAuthenticated = true;
      state.token = token;
      state.data = data;
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ token, data }));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.data = null;
      localStorage.removeItem(LOCAL_KEY);
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
