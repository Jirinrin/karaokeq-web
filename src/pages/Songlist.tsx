import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Collapse } from 'react-collapse';
import { DebounceInput } from 'react-debounce-input';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RecyclerListViewState } from 'recyclerlistview/dist/web/core/RecyclerListView';
import { DataProvider, LayoutProvider, RecyclerListView, RecyclerListViewProps } from 'recyclerlistview/web';
import { useWindowSize } from 'usehooks-ts';
import { errorAlert } from '../components/AlertModal';
import NameWidget from '../components/NameWidget';
import { SelectedSongModal } from '../components/SelectedSongModal';
import { SongName } from '../components/SongName';
import { Genre, isGenre, useAppContext } from '../util/Context';
import { useApi, useRefreshQueue } from '../util/api';
import { useLastNonNull, useScrollPosition } from '../util/hoox';
import { EnhancedSongListItem } from '../util/types';
import { prepForCDNQuery } from '../util/utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SPOTIFYURL = `
https://open.spotify.com/playlist/5CDdHeDNZv9ZsnicdWV7cd?si=fb66c225fdb446f3&pt=8619e5362717c4f181468575c027da4d
`.trim()

const COLORS = '#77dd77#ff9899#89cff0#f6a6ff#b2fba5#FDFD96#aaf0d1#c1c6fc#bdb0d0#befd73#ff6961#ffb7ce#ca9bf7#ffffd1#c4fafb#fbe4ff#B19CD9#FFDAB9#FFB347#966FD6#b0937b'.match(/#\w{6}/g)!
const LANG_RGX = /lang:(\w+)/
const YEAR_RGX = /year([><]\d+)/

export default function SongList({qAccess}: {qAccess?: boolean}) {
  const {domain} = useParams()
  const api = useApi()
  const refreshQueue = useRefreshQueue()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {queue, setQueue, inclFilters, setInclFilters, setAlert, viewMode, setViewMode, addSongNoticeOpened, setAddSongNoticeOpened, genres, songlist} = useAppContext()
  const navigate = useNavigate()
  const {width: screenWidth, height: screenHeight} = useWindowSize()
  
  const [srch, setSrch] = useState('')
  const [srchTerms, langFilter, yearFilter] = useMemo(() => {
    const langMatch = srch.match(LANG_RGX)?.[1]
    const yearMatch = srch.match(YEAR_RGX)?.[1]
    const terms = srch.replace(LANG_RGX, '').replace(YEAR_RGX, '').toLowerCase().split(' ').map(t => t.trim()).filter(t => !!t)
    return [terms, langMatch, yearMatch]
  }, [srch])
  const [singstarFilter, setSingstarFilter] = useState(false)
  const [showUnincluded, setShowUnincluded] = useState(false)

  const weebKeys = genres.filter((k) => k.match(/^[jk]-/))
  const westKeys = genres.filter((k) => k.startsWith('w-'))
  const showWestEast = weebKeys.length > 0 && westKeys.length > 0
  const showUnincludedFilter = !!songlist?.unincluded
  const genreToColor = useMemo(() => Object.fromEntries(genres.map((g,i) => [g, COLORS[i]])), [genres])

  const [selectedSong, setSelectedSong] = useState<string|null>(null)
  const shownSelectedSong = useLastNonNull(selectedSong)

  const layoutProvider = useMemo<LayoutProvider>(() => {
    const d: [w:number,h:number] = (() => {
      if (viewMode === 'list') return [800,33]
      if (screenWidth < 600) return [0.8*screenWidth, 0.4*screenWidth]
      if (screenWidth < 800) return [0.42*screenWidth, 0.28*screenWidth]
      if (screenWidth < 1000) return [0.3*screenWidth, 0.28*screenWidth]
      return [300,330]
    })()
    return new LayoutProvider(() => 'a', (_, dim) => {dim.width = d[0]; dim.height = d[1]})
  }, [viewMode, screenWidth])

  useEffect(() => {queue === null && qAccess && refreshQueue()}, [qAccess, queue, refreshQueue])

  const requestSong = useCallback((songId: string) => api('post', 'request', {songId})
    .then(q => { setQueue(q); navigate(`/${domain}`) })
    .catch(e => { setAlert(errorAlert(e.response.text)) }),
  [api, domain, navigate, setAlert, setQueue])

  // todo: sorting

  function toggleInclFilter(g: Genre) {
    setInclFilters({...inclFilters, [g]: !inclFilters[g]})
  }

  const genresToShow = useMemo(() => {
    const allGenres = showUnincluded ? genres : genres.filter(isGenre)
    if (srchTerms.length)
      return allGenres
    else if (Object.values(inclFilters).includes(true))
      return allGenres.filter(g => inclFilters[g])
    else
      return allGenres
  }, [inclFilters, showUnincluded, srchTerms, genres]);

  const dataProviderRef = useRef(new DataProvider((r1: EnhancedSongListItem, r2: EnhancedSongListItem) => r1.id !== r2.id || r1.selected !== r2.selected))
  const [displaySongs, dataProvider] = useMemo<[EnhancedSongListItem[], DataProvider]>(() => {
    if (!songlist) return [[], dataProviderRef.current]
    let newDisplaySongs = genresToShow.flatMap(g => songlist[g])

    if (singstarFilter) {
      const gFilterActive = Object.values(inclFilters).includes(true)
      const extraSongs = Object.entries(songlist).filter(([g]) => !(gFilterActive && genresToShow.includes(g))).map(([,ss])=>ss).flat().filter(s => s.e === 's')
      newDisplaySongs = gFilterActive ? [...newDisplaySongs, ...extraSongs] : extraSongs
    }
    newDisplaySongs.sort((a,b) => a.id.localeCompare(b.id))

    if (langFilter)
      newDisplaySongs = newDisplaySongs.filter(({l}) => l === langFilter)
    if (yearFilter) {
      const [gtlt, year] = [yearFilter[0], parseInt(yearFilter.slice(1))]
      newDisplaySongs = newDisplaySongs.filter(gtlt === '>' ? (({y}) => y && y > year) : (({y}) => y && y < year))
    }
    newDisplaySongs = newDisplaySongs.filter((s) => {const sl = (s.id+(s.a??'')+(s.c??'')+(s.s??'')).toLowerCase(); return srchTerms.every(t => sl.includes(t))})
    if (shownSelectedSong) {
      const i = newDisplaySongs.findIndex(s => s.id === shownSelectedSong)
      if (i !== -1) newDisplaySongs[i] = {...newDisplaySongs[i], selected: true}
    }

    dataProviderRef.current = dataProviderRef.current.cloneWithRows(newDisplaySongs)
    return [newDisplaySongs, dataProviderRef.current]
  }, [songlist, genresToShow, singstarFilter, langFilter, yearFilter, shownSelectedSong, inclFilters, srchTerms]);

  const searchBox = 
    <div className='input-block pane searchbox'>
      <label htmlFor='searchbox'> 🔍 Search:</label>
      <div className="input-wrapper">
        <DebounceInput id="searchbox" minLength={1} debounceTimeout={50} onChange={e => setSrch(e.target.value)} value={srch} placeholder="Search query" />
        <button className='clear-btn' onClick={() => {setSrch(''); document.getElementById('searchbox')?.focus()}}>×</button>
      </div>
    </div>

  const [filtersOpened, setFiltersOpened] = useState(true)
  const unincluded = useMemo(() => songlist?.unincluded?.map(s => s.id), [songlist?.unincluded])

  const selectedSongAlreadyInQ = !!queue?.find(s => s.id === shownSelectedSong)
  const selectedSongIsUnincluded = useMemo(() => shownSelectedSong !== null && unincluded?.includes(shownSelectedSong), [shownSelectedSong, unincluded])

  const pageRef = useRef<HTMLDivElement>(null)
  const songsWrapperRef = useRef<HTMLDivElement>(null)
  const songlistRef = useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(null)

  const scrolledToBottom = useRef(false)
  const [songlistScrolled, setSonglistScrolled] = useState(false)
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const scrollToPct = (pct: 0|1, smooth = true) =>
    pct ? pageRef.current?.scrollBy({top: 1, behavior: smooth ? 'smooth' : 'auto'}) : pageRef.current?.scrollTo({top: 0, behavior: smooth ? 'smooth' : 'auto'})

  const [initialLoaded, setInitialLoaded] = useState(false)
  useEffect(() => {setInitialLoaded(true); scrollToPct(0)}, [])
  useEffect(() => {scrollToPct(0)}, [genresToShow, showUnincluded, singstarFilter])

  useScrollPosition(({ currPos }) => {
    if (!pageRef.current) return
    const pct = currPos / (pageRef.current.scrollHeight - pageRef.current.clientHeight)
    scrolledToBottom.current = pct > .99 && currPos > 100
    const cls = document.querySelector('.sticky-section-backdrop')?.classList
    if (cls) {
      if (cls.contains('shown') && !scrolledToBottom.current) cls.remove('shown')
      else if (!cls.contains('shown') && scrolledToBottom.current) cls.add('shown')
    }
  }, [], pageRef)

  const onScrollRecyclerList = (y: number) => {
    if (y > 0 && !songlistScrolled) setSonglistScrolled(true)
    else if (y <= 0 && songlistScrolled) setSonglistScrolled(false)
    if (y > 400 && !songlistScrolled) setShowScrollToTop(true)
    else if (y <= 400 && songlistScrolled) setShowScrollToTop(false)
    if (!scrolledToBottom.current) {scrollToPct(1, false)}
  }

  useEffect(() => {
    if (srchTerms.length && !scrolledToBottom.current) scrollToPct(1)
  }, [srchTerms])

  return (
    // oh-snap is only set after initial page load, because otherwise it'll sometimes randomly snap to the bottom
    <div className={`Songlist page ${initialLoaded ? 'oh-snap' : ''}`} ref={pageRef}>
      <div className="snap-start"></div>
      <div className="page-body">
        <div className='sticky-section'>
          {qAccess && <>
            <div className="input-block-flekz">
              {searchBox}
              <NameWidget />
            </div>
            <Link to={`/${domain}`} className="link-btn back-to-queue-btn">BACK TO QUEUE</Link>
          </>}

          <SelectedSongModal selectedSong={selectedSong} setSelectedSong={setSelectedSong}>
            {qAccess &&
              <button className='link-btn' disabled={selectedSongAlreadyInQ || selectedSongIsUnincluded} onClick={() => selectedSong && requestSong(selectedSong)}>
                {selectedSongAlreadyInQ ? 'SONG ALREADY IN QUEUE' : selectedSongIsUnincluded ? 'SONG UNAVAILABLE' : 'REQUEST SONG'}
              </button>
            }
          </SelectedSongModal>
        </div>

        <div className={`select-random modal-dialog-thing`}>
          <button className='link-btn' onClick={() => {
            const i = Math.floor(Math.random()*displaySongs.length)
            setSelectedSong(displaySongs[i].id)
            songlistRef.current?.scrollToIndex(Math.max(i-3, 0), true)
            if (!scrolledToBottom.current) scrollToPct(1)
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
        <div className={`sticky-section-backdrop pane`}></div>
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
              <span style={{backgroundColor: '#DDDDDD'}} className='category-filter'>
                <input id={`filter-singstar`} type="checkbox" checked={singstarFilter} onChange={e => setSingstarFilter(!singstarFilter)} />
                <label htmlFor={`filter-singstar`}><em>singstar</em></label>
              </span>
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
          onClick={() => scrollToPct(scrolledToBottom.current ? 0 : 1)}
        >
          Songs <span>{displaySongs.length}</span>{' '}
          <button className='view-toggle' onClick={(e) => {e.stopPropagation(); setViewMode(viewMode === 'list' ? 'tiled' : 'list')}}>{viewMode.toUpperCase()}</button>
        </h2>
        <div ref={songsWrapperRef} className={`songs-wrapper ${viewMode}-view`} style={{width: '100%', height: screenHeight-160}}>
          {displaySongs.length > 0 &&
            <RecyclerListView
              onScroll={(_e, _x, y) => onScrollRecyclerList(y)}
              layoutProvider={layoutProvider}
              renderFooter={() => <div style={{height: 55}}></div>}
              dataProvider={dataProvider}
              ref={songlistRef}
              canChangeSize
              style={{width: '100%', height: '100%'}}
              rowRenderer={(_, s: EnhancedSongListItem, i) => (
                <li
                  className={`song-item clickable ${s.selected ? 'selected' : ''}`}
                  key={`${i}-s`}
                  onClick={() => setSelectedSong(selectedSong === s.id ? null : s.id)}
                >
                  {viewMode === 'tiled' &&
                    <div className="img-wrapper">
                      <img className="invisible" loading="lazy" alt="" src={prepForCDNQuery(s.id)} onLoad={(e) => e.currentTarget.classList.remove('invisible')} />
                    </div>
                  }
                  <div>
                    <SongName songId={s.id} windowWidth={screenWidth} displayMode={viewMode} />
                    <span className='category-chip' style={{backgroundColor: genreToColor[s.g]}}>{s.g}</span>
                    {singstarFilter && s.e === 's' &&<span className='category-chip' style={{backgroundColor: '#DDDDDD'}}>ss</span>}
                  </div>
                </li>
              )}
            />
          }
        </div>
      </div>
      <div className="snap-end" />
    </div>
  )
}
