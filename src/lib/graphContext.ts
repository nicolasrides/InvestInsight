import { createContext, useContext } from 'react'

export const GraphContext = createContext({ expanded: false })

export function useGraphContext() {
  return useContext(GraphContext)
}
