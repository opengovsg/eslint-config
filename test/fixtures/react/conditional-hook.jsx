import { useState } from 'react'

export const Counter = ({ enabled }) => {
  if (enabled) {
    const [count] = useState(0)
    return <p>{count}</p>
  }
  return null
}
