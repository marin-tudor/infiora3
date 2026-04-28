// Third-party Imports
import { configureStore } from '@reduxjs/toolkit'

// Slice Imports
import { authApi } from './api/authApi'
import { configApi } from './api/configApi'
import configReducer from './features/configSlice'
import { userApi } from './api/userApi'
import { ticketApi } from './api/ticketApi'
import { hotelApi } from './api/hotelApi'
import { roomApi } from './api/roomApi'
import { linkApi } from './api/linkApi'
import { groupApi } from './api/groupApi'
import { subscriberApi } from './api/subscriberApi'
import { ordersApi } from './api/ordersApi'
import { housekeepingApi } from './api/housekeepingApi'
import { maintenanceApi } from './api/maintenanceApi'
import { staffApi } from './api/staffApi'
import { bookingApi } from './api/bookingApi'
import { analyticsApi } from './api/analyticsApi'

export const store: any = configureStore({
  reducer: {
    [configApi.reducerPath]: configApi.reducer,
    config: configReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [ticketApi.reducerPath]: ticketApi.reducer,
    [hotelApi.reducerPath]: hotelApi.reducer,
    [roomApi.reducerPath]: roomApi.reducer,
    [linkApi.reducerPath]: linkApi.reducer,
    [groupApi.reducerPath]: groupApi.reducer,
    [subscriberApi.reducerPath]: subscriberApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
    [housekeepingApi.reducerPath]: housekeepingApi.reducer,
    [maintenanceApi.reducerPath]: maintenanceApi.reducer,
    [staffApi.reducerPath]: staffApi.reducer,
    [bookingApi.reducerPath]: bookingApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
  },
  devTools: process.env.NODE_ENV === 'development',
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({}).concat([
      configApi.middleware,
      authApi.middleware,
      userApi.middleware,
      ticketApi.middleware,
      hotelApi.middleware,
      roomApi.middleware,
      linkApi.middleware,
      groupApi.middleware,
      subscriberApi.middleware,
      ordersApi.middleware,
      housekeepingApi.middleware,
      maintenanceApi.middleware,
      staffApi.middleware,
      bookingApi.middleware,
      analyticsApi.middleware,
    ])
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
