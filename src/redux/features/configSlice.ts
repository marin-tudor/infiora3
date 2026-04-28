import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

const getInitialState = (): any | null => {
  return null
}

const initialState: any | null = getInitialState()

export const configSlice = createSlice({
  name: 'configSlice',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<any>) => {
      return action.payload
    }
  }
})

export default configSlice.reducer

export const { setConfig } = configSlice.actions
