import { configureStore } from '@reduxjs/toolkit';
import qnReducer from './qnSlice';
import authReducer from './authSlice';
import decisionReducer from './decisionSlice';


export const store = configureStore({
    reducer: {
      qn: qnReducer,
      auth: authReducer,
      decision: decisionReducer
    }
  });