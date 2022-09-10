import React, { createContext, useContext, useEffect, useState } from "react";
import {Q} from '../util/types'


interface AppContext {
  userName: string
  setUserName: (to: string) => void
  queue: Q
  setQueue: (to: Q) => void
}

const Ctx = createContext<AppContext>({userName: '', setUserName: () => {}, queue: [], setQueue: () => {}})

export function useAppContext() {
  return useContext(Ctx)
}

export default function ApplicationContext({children}: {children: React.ReactNode}) {
  const [userName, setUserName] = useState(localStorage.getItem('username') ?? '')
  const [queue, setQueue] = useState<Q>([])

  useEffect(() => {
    localStorage.setItem('username', userName)
  }, [userName])

  return (
    <Ctx.Provider value={{userName, setUserName, queue, setQueue}}>
      {children}
    </Ctx.Provider>
  )
}
