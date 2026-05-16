import { configureStore } from "@reduxjs/toolkit";
import type { TypedUseSelectorHook } from "react-redux";
import { useDispatch, useSelector } from "react-redux";

import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import userReducer from "./features/userSlice";
import { hotelApi } from "./api/hotelApi";
import { ticketApi } from "./api/ticketApi";
import { roomApi } from "./api/roomApi";
import { groupApi } from "./api/groupApi";
import { ordersApi } from "./api/ordersApi";
import { staffApi } from "./api/staffApi";

export const store: any = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [ticketApi.reducerPath]: ticketApi.reducer,
    [hotelApi.reducerPath]: hotelApi.reducer,
    [roomApi.reducerPath]: roomApi.reducer,
    [groupApi.reducerPath]: groupApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
    [staffApi.reducerPath]: staffApi.reducer,
    userState: userReducer,
  },
  devTools: process.env.NODE_ENV === "development",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({}).concat([
      authApi.middleware,
      userApi.middleware,
      ticketApi.middleware,
      hotelApi.middleware,
      roomApi.middleware,
      groupApi.middleware,
      ordersApi.middleware,
      staffApi.middleware,
    ]),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
