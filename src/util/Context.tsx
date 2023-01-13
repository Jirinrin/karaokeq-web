import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Q, SongList } from '../util/types';
import { useLastNonNull } from "./hoox";

export type Genre = `w-${string}` | `j-${string}` | string
export const isGenre = (g: Genre) => g !== 'unincluded';

type ViewMode = 'list'|'tiled'

interface AppContext {
  songlist: SongList|null
  genres: Genre[]
  userName: string
  setUserName: (to: string) => void
  queue: Q|null
  setQueue: (to: Q) => void
  inclFilters: Record<Genre, boolean>
  setInclFilters: (to: Record<Genre, boolean>) => void
  setError: (err: string) => void
  viewMode: ViewMode
  setViewMode: (to: ViewMode) => void
  adminToken: string|null
  setAdminToken: (to: string|null) => void
  addSongNoticeOpened: boolean
  setAddSongNoticeOpened: (to: boolean) => void
}

const Ctx = createContext<AppContext>({} as AppContext)

export function useAppContext() {
  return useContext(Ctx)
}

const SONGLISTS_BY_DOMAIN: Record<string, string> = {'dz-owee': 'songlist-w', q42: 'songlist-w'}

export default function ApplicationContext({children}: {children: React.ReactNode}) {
  const [songlist, setSonglist] = useState<SongList|null>(null)
  const [userName, setUserName] = useState(localStorage.getItem('username') ?? '')
  const [queue, setQueue] = useState<Q|null>(null)

  const {domain} = useParams()
  const songlistName = SONGLISTS_BY_DOMAIN[domain ?? ''] ?? 'songlist'
  useEffect(() => { fetch(`/${songlistName}.json`).then(r => r.json()).then(setSonglist) }, [songlistName])

  const genres = useMemo(() => songlist ? Object.keys(songlist) : [], [songlist])

  // todo: allow some init filters set through the querystring or sth (e.g. west=true)
  const [inclFilters, setInclFilters] = useState<Record<Genre, boolean>>({})
  const [adminToken, setAdminToken] = useState<string|null>(localStorage.getItem('admintoken') || null)

  useEffect(() => { setInclFilters(genres.filter(isGenre).reduce((acc, g) => ({...acc, [g]: false}), {})) }, [genres])

  const [viewMode, setViewMode] = useState<ViewMode>(window.location.search.includes('tiled') ? 'tiled' : 'list') // debug feature to activate tile mode (don't want to activate it with a btn yet)

  const [error, setError] = useState<string|null>(null)
  const shownError = useLastNonNull(error)

  const [addSongNoticeOpened, setAddSongNoticeOpened] = useState(true)

  useEffect(() => { localStorage.setItem('username', userName) }, [userName])
  useEffect(() => { adminToken && localStorage.setItem('admintoken', adminToken) }, [adminToken])

  return (
    <Ctx.Provider value={{songlist, genres, userName, setUserName, queue, setQueue, inclFilters, setInclFilters, setError, viewMode, setViewMode, adminToken, setAdminToken, addSongNoticeOpened, setAddSongNoticeOpened}}>
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