import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Collapse } from 'react-collapse';
import { DebounceInput } from 'react-debounce-input';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RecyclerListViewState } from 'recyclerlistview/dist/web/core/RecyclerListView';
import { DataProvider, LayoutProvider, RecyclerListView, RecyclerListViewProps } from 'recyclerlistview/web';
import { useWindowSize } from 'usehooks-ts';
import { SongName } from '../components/SongName';
import { Genre, isGenre, useAppContext } from '../util/Context';
import { useApi, useRefreshQueue } from '../util/api';
import { useLastNonNull, useScrollPosition } from '../util/hoox';
import { SongListItem } from '../util/types';
import { formatSongId } from '../util/utils';
import NameWidget from './NameWidget';

type SongRow = SongListItem & {g: Genre}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SPOTIFYURL = `
https://open.spotify.com/playlist/5CDdHeDNZv9ZsnicdWV7cd?si=fb66c225fdb446f3&pt=8619e5362717c4f181468575c027da4d
`.trim()

const COLORS = '#77dd77#ff9899#89cff0#f6a6ff#b2fba5#FDFD96#aaf0d1#c1c6fc#bdb0d0#befd73#ff6961#ffb7ce#ca9bf7#ffffd1#c4fafb#fbe4ff#B19CD9#FFDAB9#FFB347#966FD6#b0937b'.match(/#\w{6}/g)!
const LANG_RGX = /lang:(\w+)/

export default function SongList({qAccess}: {qAccess?: boolean}) {
  const {domain} = useParams()
  const api = useApi()
  const refreshQueue = useRefreshQueue()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {queue, setQueue, inclFilters, setInclFilters, setError, viewMode, setViewMode, addSongNoticeOpened, setAddSongNoticeOpened, genres, songlist} = useAppContext()
  const navigate = useNavigate()
  const {width: screenWidth, height: screenHeight} = useWindowSize()
  
  const [srch, setSrch] = useState('')
  const [srchTerms, langFilter] = useMemo(() => {
    const langMatch = srch.match(LANG_RGX)?.[1]
    const terms = srch.replace(LANG_RGX, '').toLowerCase().split(' ').map(t => t.trim()).filter(t => !!t)
    return [terms, langMatch]
  }, [srch])
  const [showUnincluded, setShowUnincluded] = useState(false)

  const weebKeys = genres.filter((k) => k.match(/^[jk]-/))
  const westKeys = genres.filter((k) => k.startsWith('w-'))
  const showWestEast = weebKeys.length > 0 && westKeys.length > 0
  const showUnincludedFilter = !!songlist?.unincluded
  const genreToColor = useMemo(() => Object.fromEntries(genres.map((g,i) => [g, COLORS[i]])), [genres])

  const [displaySongs, setDisplaySongs] = useState<SongRow[]>([])
  const [dataProvider, setDataProvider] = useState(new DataProvider((r1: SongRow, r2: SongRow) => r1.id !== r2.id))
  const d = useMemo<[w:number,h:number]>(() => {
    if (viewMode === 'list') return [800,33]
    if (screenWidth < 600) return [0.8*screenWidth, 0.4*screenWidth]
    if (screenWidth < 800) return [0.42*screenWidth, 0.28*screenWidth]
    if (screenWidth < 1000) return [0.3*screenWidth, 0.28*screenWidth]
    return [300,330]
  }, [viewMode, screenWidth])
  const layoutProvider = new LayoutProvider(() => 'a', (_, dim) => {dim.width = d[0]; dim.height = d[1]})

  const [selectedSong, setSelectedSong] = useState<string|null>(null)
  const shownSelectedSong = useLastNonNull(selectedSong)

  const coverRef = useRef<HTMLImageElement>(null)
  const coverTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const img = coverRef.current
    if (!img) return
    img.classList.add('invisible')
    clearTimeout(coverTimeout.current)
    if (selectedSong)
      coverTimeout.current = setTimeout(() => img.src = prepForCDNQuery(selectedSong), 500)
  }, [selectedSong])

  useEffect(() => {queue === null && qAccess && refreshQueue()}, [qAccess, queue, refreshQueue])

  const requestSong = useCallback((songId: string) => api('post', 'request', {songId})
    .then(q => { setQueue(q); navigate(`/${domain}`) })
    .catch(e => { setError(e.response.text) }),
  [api, domain, navigate, setError, setQueue])

  // todo: sorting

  function toggleInclFilter(g: Genre) {
    setInclFilters({...inclFilters, [g]: !inclFilters[g]})
  }

  const genresToShow = useMemo(() => {
    const all = showUnincluded ? genres : genres.filter(isGenre)
    if (srchTerms.length)
      return all
    else if (Object.values(inclFilters).includes(true))
      return all.filter(g => inclFilters[g])
    else
      return all
  }, [inclFilters, showUnincluded, srchTerms, genres]);

  useEffect(() => {
    if (!songlist) return
    const songs = [...genresToShow.flatMap(g => songlist[g].map((s): SongRow => ({...s, g})))].sort((a,b) => a.id.localeCompare(b.id))
    let newDisplaySongs = songs

    if (langFilter)
      newDisplaySongs = newDisplaySongs.filter(({l}) => l === langFilter)
    newDisplaySongs = newDisplaySongs.filter(({id}) => {const sl = id.toLowerCase(); return srchTerms.every(t => sl.includes(t))})

    setDisplaySongs(newDisplaySongs)
    setDataProvider(d => d.cloneWithRows(newDisplaySongs))
  }, [genresToShow, songlist, srchTerms, langFilter]);

  const searchBox = 
    <div className='input-block pane searchbox'>
      <label htmlFor='searchbox'> 🔍 Search:</label>
      <div className="input-wrapper">
        <DebounceInput id="searchbox" minLength={2} debounceTimeout={50} onChange={e => setSrch(e.target.value)} value={srch} placeholder="Search query" />
        <button className='clear-btn' onClick={() => setSrch('')}>×</button>
      </div>
    </div>

  const [filtersOpened, setFiltersOpened] = useState(true)
  const unincluded = useMemo(() => songlist?.unincluded.map(s => s.id), [songlist?.unincluded])

  const selectedSongAlreadyInQ = !!queue?.find(s => s.id === shownSelectedSong)
  const selectedSongIsUnincluded = useMemo(() => shownSelectedSong !== null && unincluded?.includes(shownSelectedSong), [shownSelectedSong, unincluded])

  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [songlistScrolled, setSonglistScrolled] = useState(false)
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const scrollToPct = (pct: number) => window.scrollTo({top: pct * document.body.scrollHeight, behavior: 'smooth'})

  useScrollPosition(({ currPos }) => {
    const pct = currPos / (document.body.scrollHeight - window.innerHeight)
    setScrolledToBottom(pct > 0.99)
  }, [], undefined, true)
  useEffect(() => {
    if (srchTerms.length && !scrolledToBottom) scrollToPct(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srchTerms])

  const songsWrapperRef = useRef<HTMLDivElement>(null)
  const songlistRef = useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(null)

  return (
    <div className='Songlist'>
      {qAccess && (
        <div className='sticky-section'>
          <div className="input-block-flekz">
            {searchBox}
            <NameWidget />
          </div>
          <Link to={`/${domain}`} className="link-btn back-to-queue-btn">BACK TO QUEUE</Link>
          
          <div className={`selected-song modal-dialog-thing ${selectedSong ? '' : 'invisible'}`}>
            <img className="selected-cover invisible" loading="lazy" alt="" ref={coverRef} onLoad={(e) => e.currentTarget.classList.remove('invisible')} />
            <div className="pane">
              <p>Selected song</p>
              <h2>{shownSelectedSong ? formatSongId(shownSelectedSong) : null}</h2>
              <button className='link-btn' disabled={selectedSongAlreadyInQ || selectedSongIsUnincluded} onClick={() => selectedSong && requestSong(selectedSong)}>
                {selectedSongAlreadyInQ ? 'SONG ALREADY IN QUEUE' : selectedSongIsUnincluded ? 'SONG UNAVAILABLE' : 'REQUEST SONG'}
              </button>
              <button className='link-btn close-btn' onClick={() => setSelectedSong(null)}></button>
            </div>
          </div>
        </div>
      )}
      <div className={`select-random modal-dialog-thing`}>
        <button className='link-btn' onClick={() => {
          const i = Math.floor(Math.random()*displaySongs.length)
          setSelectedSong(displaySongs[i].id)
          songlistRef.current?.scrollToIndex(Math.max(i-3, 0), true)
          if (!scrolledToBottom) scrollToPct(1)
        }}>
          🎲
        </button>
      </div>
      <div className={`scroll-to-top modal-dialog-thing ${showScrollToTop ? '' : 'hidden'}`}>
        <button className='link-btn' onClick={() => songsWrapperRef.current?.firstElementChild?.scrollTo({top: 0, behavior: 'smooth'})}>
          ↑
        </button>
      </div>

      {qAccess && <h1>Songlist</h1>}
      <div className={`sticky-section-backdrop pane ${scrolledToBottom ? '' : 'hidden'}`}></div>
      {!qAccess && <div className='sticky-section anon'>{searchBox}</div>}
      <div className={`filter-section pane ${filtersOpened ? '' : 'collapsed'}`}>
        <h3><button onClick={() => setFiltersOpened(v=>!v)} className='link-btn'>FILTERS</button></h3>
        
        <Collapse isOpened={filtersOpened}>
          <div className={`category-filters disablable ${srchTerms.length ? 'disabled' : ''}`}>
            {Object.entries(inclFilters).map(([g, checked]) =>
              <span key={g} style={{backgroundColor: genreToColor[g]}} className='category-filter'>
                <input id={`filter-${g}`} type="checkbox" checked={checked} onChange={e => toggleInclFilter(g as Genre)} />
                <label htmlFor={`filter-${g}`}>{g}</label>
              </span>
            )}
            {showWestEast && <>
              <span style={{backgroundColor: 'white'}} className='category-filter'>
                <input id={`filter-west`} type="checkbox" checked={westKeys.every(k => inclFilters[k])} onChange={e => setInclFilters(westKeys.reduce((acc, k) => ({...acc, [k]: e.target.checked}), inclFilters))} />
                <label htmlFor={`filter-west`}><em>west</em></label>
              </span>
              <span style={{backgroundColor: 'white'}} className='category-filter'>
                <input id={`filter-weeb`} type="checkbox" checked={weebKeys.every(k => inclFilters[k])} onChange={e => setInclFilters(weebKeys.reduce((acc, k) => ({...acc, [k]: e.target.checked}), inclFilters))} />
                <label htmlFor={`filter-weeb`}><em>east</em></label>
              </span>
            </>}
          </div>
          {showUnincludedFilter &&
            <div className={`show-unincluded disablable ${Object.values(inclFilters).includes(true) && !srchTerms.length ? 'disabled' : ''}`}>
              <label htmlFor="show-unincluded-songs">Show unincluded songs:</label>
              <input id="show-unincluded-songs" type="checkbox" checked={showUnincluded} onChange={e => setShowUnincluded(!showUnincluded)} />
            </div>
          }
        </Collapse>
      </div>

      <Collapse isOpened={addSongNoticeOpened}>
        <div className='notice'>
          <h4>
            Can't find a song? Go ahead and add it to <a href={SPOTIFYURL} target="_blank" rel="noreferrer">this Spotify playlist</a>, and I'll go ahead and try to get it into the game!<br/>
            Or if you got ultrastar files for me: even better! You can drop those <a href="https://mega.nz/megadrop/Id6ACZf_WrI" target="_blank" rel="noreferrer">in here</a>!
            <button onClick={() => setAddSongNoticeOpened(false)}>Dismiss</button>
          </h4>
        </div>
      </Collapse>

      <h2
        className={`songs-title ${songlistScrolled ? 'with-border' : ''} ${viewMode === 'tiled' ? 'align-centerr' : ''}`}
        onClick={() => scrollToPct(scrolledToBottom ? 0 : 1)}
      >
        Songs <span>{displaySongs.length}</span>{' '}
        {/* todo: turn on */}
        {/* <button className='view-toggle' onClick={() => setViewMode(viewMode === 'list' ? 'tiled' : 'list')}>{viewMode.toUpperCase()}</button> */}
      </h2>
      <div ref={songsWrapperRef} className={`songs-wrapper ${viewMode}-view`}>
        {displaySongs.length > 0 &&
          <RecyclerListView
            onScroll={(e, _x, y) => {setSonglistScrolled(y > 0); setShowScrollToTop(y > 400)}}
            layoutProvider={layoutProvider}
            dataProvider={dataProvider}
            ref={songlistRef}
            canChangeSize
            style={{width: '100%', height: screenHeight-160}}
            rowRenderer={(_, {id, g}, i) => (
              <li
                className={`song-item ${qAccess ? 'clickable' : ''} ${selectedSong === id ? 'selected' : ''}`}
                key={`${i}-s`}
                onClick={() => qAccess && setSelectedSong(selectedSong === id ? null : id)}
              >
                {viewMode === 'tiled' &&
                  <div className="img-wrapper">
                    <img className="invisible" loading="lazy" alt="" src={prepForCDNQuery(id)} onLoad={(e) => e.currentTarget.classList.remove('invisible')} />
                  </div>
                }
                <div>
                  <SongName songId={id} />
                  <span className='category-chip' style={{backgroundColor: genreToColor[g]}}>{g}</span>
                </div>
              </li>
            )}
          />
        }
      </div>
    </div>
  )
}

function prepForCDNQuery(name: string) {
  return 'https://pub-d909a0daa125478d9db850d4da553bc4.r2.dev/' + encodeURIComponent(esc(name)).replace(/%(24|26|2B|2C|3B|3D)/g, '%25$1')
}

function esc(name: string) {
  return name
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/"/g, '”')
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\|/g, '｜')
    .replace(/\*/g, '＊')
    .trim()
    .replace(/\.$/, '∙')
    .replace(/\\/g, '＼')
    .replace(/\//g, '／')
}
