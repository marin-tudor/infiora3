'use client'
import type { ReactNode } from 'react'
import React, { createContext, useContext } from 'react'

import type { getDictionary } from '@/utils/getDictionary'

// Define the type of the dictionary
type Dictionary = Awaited<ReturnType<typeof getDictionary>>

// Create the context with an initial value of `null` or an empty object
const DictionaryContext = createContext<Dictionary | null>(null)

// Create a provider component
export const DictionaryProvider = ({ dictionary, children }: { dictionary: Dictionary; children: ReactNode }) => {
  return <DictionaryContext.Provider value={dictionary}>{children}</DictionaryContext.Provider>
}

// Create a custom hook to use the dictionary in any component
export const useDictionary = () => {
  const context = useContext(DictionaryContext)

  if (!context) {
    throw new Error('useDictionary must be used within a DictionaryProvider')
  }

  return context
}
