import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { Alert, AlertModal } from "../components/AlertModal";
import { Config, EnhancedSongList, Q, SongList } from '../util/types';
import { _useApi } from "./api";
import { useLastNonNull } from "./hoox";

export type Genre = `w-${string}` | `j-${string}` | string
export const isGenre = (g: Genre) => g !== 'unincluded';

type ViewMode = 'list'|'tiled'

const Ctx = createContext<AppContext>({} as AppContext)

export function useAppContext() {
  return useContext(Ctx)
}

export default function ApplicationContext({children}: {children: React.ReactNode}) {
  const [ctx, ctxInternal] = _useAppContext()
  const shownAlert = useLastNonNull(ctxInternal.alert)

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <AlertModal visible={!!ctxInternal.alert} alert={shownAlert} hide={() => ctx.setAlert(null)} />
    </Ctx.Provider>
  )
}

function _useAppContext() {
  const domain = useLocation().pathname.match(/^\/([^/]+)/)?.[1]

  const [songlist, setSonglist] = useState<EnhancedSongList|null>(null)
  const [userName, setUserName] = useState(localStorage.getItem('username') ?? '')
  const [adminToken, setAdminToken] = useState<string|null>(localStorage.getItem(`admintoken_${domain}`) || null)
  const [queue, setQueue] = useState<Q|null>(null)
  const [config, _setConfig] = useState<Config|null>(null)

  const [alert, setAlert] = useState<Alert|null>(null)

  const api = _useApi(domain ?? '', userName, adminToken, setAlert)

  const refreshConfig = useCallback(() => api('get', 'config').then(c => _setConfig(c)), [api])

  useEffect(() => { refreshConfig() }, [adminToken, refreshConfig])

  const setConfig = useCallback(async (c: Partial<Config>) => {
    await api('patch', 'config', c)
    _setConfig(cc => cc && ({...cc, ...c}))
    setTimeout(refreshConfig, 30000)
  }, [api, refreshConfig])

  const postSonglist = useCallback(async (sl: SongList) => {
    await api('post', 'songlist.json', sl)
    setSonglist(enhanceSonglist(sl))
    setTimeout(refreshConfig, 30000)
  }, [api, refreshConfig])

  useEffect(() => {
    api('get', 'songlist.json').then(sl => setSonglist(enhanceSonglist(sl)))
  }, [api])

  const genres = useMemo(() => songlist ? Object.keys(songlist) : [], [songlist])

  // todo: allow some init filters set through the querystring or sth (e.g. west=true)
  const [inclFilters, setInclFilters] = useState<Record<Genre, boolean>>({})

  useEffect(() => { setInclFilters(genres.filter(isGenre).reduce((acc, g) => ({...acc, [g]: g.startsWith('w-') ? true : false}), {})) }, [genres])

  const [viewMode, setViewMode] = useState<ViewMode>(window.location.search.includes('tiled') ? 'tiled' : 'list') // debug feature to activate tile mode (don't want to activate it with a btn yet)

  useEffect(() => { localStorage.setItem('username', userName) }, [userName])
  useEffect(() => { adminToken && localStorage.setItem(`admintoken_${domain}`, adminToken) }, [adminToken, domain])
  useEffect(() => { setAdminToken(localStorage.getItem(`admintoken_${domain}`) || null) }, [domain])

  return [
    {songlist, genres, userName, setUserName, queue, setQueue, inclFilters, setInclFilters, setAlert, viewMode, setViewMode, adminToken, setAdminToken, config, setConfig, postSonglist},
    // Internal ctx
    {alert}
  ] as const
}

const enhanceSonglist = (sl: SongList): EnhancedSongList => Object.fromEntries(Object.entries(sl).map(([g,ss]) => [g, ss.map(s => ({...s, g}))]))

export type AppContext = ReturnType<typeof _useAppContext>[0];