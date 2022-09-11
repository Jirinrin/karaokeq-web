import React, { createContext, useContext, useEffect, useState } from "react";
import {Q} from '../util/types'
import sl from '../songlist.json'

export const songlist = sl
export type Genre = keyof typeof songlist
export const GENRES = Object.keys(songlist) as Genre[]
export const isGenre = (g: Genre) => g !== 'unincluded';

interface AppContext {
  userName: string
  setUserName: (to: string) => void
  queue: Q
  setQueue: (to: Q) => void
  inclFilters: Record<Genre, boolean>
  setInclFilters: (to: Record<Genre, boolean>) => void
}

const Ctx = createContext<AppContext>({userName: '', setUserName: () => {}, queue: [], setQueue: () => {}, inclFilters: {} as any, setInclFilters: () => {}})

export function useAppContext() {
  return useContext(Ctx)
}

export default function ApplicationContext({children}: {children: React.ReactNode}) {
  const [userName, setUserName] = useState(localStorage.getItem('username') ?? '')
  const [queue, setQueue] = useState<Q>([])
  const [inclFilters, setInclFilters] = useState(GENRES.filter(isGenre).reduce((acc, g) => ({...acc, [g]: false}), {} as Record<Genre, boolean>))

  useEffect(() => {
    localStorage.setItem('username', userName)
  }, [userName])

  return (
    <Ctx.Provider value={{userName, setUserName, queue, setQueue, inclFilters, setInclFilters}}>
      {children}
    </Ctx.Provider>
  )
}
