import React, { createContext, useContext, useEffect, useState } from "react";
import {Q} from '../util/types'
import sl from '../songlist.json'
import { useLastNonNull } from "./hoox";

export const songlist = sl
export type Genre = keyof typeof songlist
export const GENRES = Object.keys(songlist) as Genre[]
export const isGenre = (g: Genre) => g !== 'unincluded';

interface AppContext {
  userName: string
  setUserName: (to: string) => void
  queue: Q|null
  setQueue: (to: Q) => void
  inclFilters: Record<Genre, boolean>
  setInclFilters: (to: Record<Genre, boolean>) => void
  setError: (err: string) => void
}

const Ctx = createContext<AppContext>({userName: '', setUserName: () => {}, queue: [], setQueue: () => {}, inclFilters: {} as any, setInclFilters: () => {}, setError: () => {}})

export function useAppContext() {
  return useContext(Ctx)
}

export default function ApplicationContext({children}: {children: React.ReactNode}) {
  const [userName, setUserName] = useState(localStorage.getItem('username') ?? '')
  const [queue, setQueue] = useState<Q|null>(null)
  const [inclFilters, setInclFilters] = useState(GENRES.filter(isGenre).reduce((acc, g) => ({...acc, [g]: false}), {} as Record<Genre, boolean>))

  const [error, setError] = useState<string|null>(null)
  const shownError = useLastNonNull(error)

  useEffect(() => {
    localStorage.setItem('username', userName)
  }, [userName])

  return (
    <Ctx.Provider value={{userName, setUserName, queue, setQueue, inclFilters, setInclFilters, setError}}>
      {children}
      <ErrorModal visible={!!error} txt={shownError ?? ''} hide={() => setError(null)} />
    </Ctx.Provider>
  )
}

function ErrorModal(p: {visible: boolean, txt: string, hide: () => void}) {
  const invClass = p.visible ? '' : 'invisible'
  return (
    <>
      <div className={`backdrop-glass-pane ${invClass}`}></div>
      <div className={`pane modal-dialog-thing error-modal ${invClass}`}>
        <p>Encountered error</p>
        <h2>{p.txt}</h2>
        <button className='link-btn' onClick={p.hide}>CLOSE</button>
      </div>
    </>
  )
}