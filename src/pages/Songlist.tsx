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
const LANG_RGX = /lang:(\w*)/
const YEAR_RGX = /year([><]\d*)/
const SORT_RGX = /sort:(\w*)/

export default function SongList({qAccess}: {qAccess?: boolean}) {
  const {domain} = useParams()
  const api = useApi()
  const refreshQueue = useRefreshQueue()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {queue, setQueue, inclFilters, setInclFilters, setAlert, viewMode, setViewMode, genres, songlist} = useAppContext()
  const navigate = useNavigate()
  const {width: screenWidth, height: screenHeight} = useWindowSize()
  
  const [srch, setSrch] = useState('')
  const [srchTerms, langFilter, yearFilter, sortSpec] = useMemo(() => {
    const langMatch = srch.match(LANG_RGX)?.[1]
    const yearMatch = srch.match(YEAR_RGX)?.[1]
    const sortMatch = srch.match(SORT_RGX)?.[1]
    const terms = srch.replace(LANG_RGX, '').replace(YEAR_RGX, '').replace(SORT_RGX, '').toLowerCase().split(' ').map(t => t.trim()).filter(t => !!t)
    return [terms, langMatch, yearMatch, sortMatch]
  }, [srch])
  const [singstarFilter, setSingstarFilter] = useState(false)
  const [showUnincluded, setShowUnincluded] = useState(false)

  const weebKeys = genres.filter((k) => k.match(/^[jk]-/))
  const westKeys = genres.filter((k) => k.startsWith('w-'))
  const showWestEast = weebKeys.length > 0 && westKeys.length > 0
  const showUnincludedFilter = !!songlist?.unincluded
  const showSingstarFilter = useMemo(() => !!Object.values(songlist ?? {}).flat().find(s => s.e === 's'), [songlist])
  const genreToColor = useMemo(() => Object.fromEntries(genres.map((g,i) => [g, COLORS[i]])), [genres])

  const [selectedSong, setSelectedSong] = useState<string|null>(null)
  const shownSelectedSong = useLastNonNull(selectedSong)

  const layoutProvider = useMemo<LayoutProvider>(() => {
    const d: [w:number,h:number] = (() => {
      if (viewMode === 'list') return [800,33]
      const listW = screenWidth < 1090 ? screenWidth-40 : 1060-5
      if (screenWidth < 460)     // 1 col with at least kinda visible cover
        return [listW, listW*0.48]
      if (screenWidth < 600)   // 1 col
        return [listW, listW*0.4]
      if (screenWidth < 800) // 2 cols
        return [listW/2,listW*0.3]
      else                 // 3 cols
        return [listW/3,listW*0.3]
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
  const [displaySongs, dataProvider, selectedSongItem] = useMemo<[EnhancedSongListItem[], DataProvider, EnhancedSongListItem|null]>(() => {
    if (!songlist) return [[], dataProviderRef.current, null]
    let newDisplaySongs = genresToShow.flatMap(g => songlist[g])

    if (singstarFilter) {
      const gFilterActive = Object.values(inclFilters).includes(true)
      const extraSongs = Object.entries(songlist).filter(([g]) => !(gFilterActive && genresToShow.includes(g))).map(([,ss])=>ss).flat().filter(s => s.e === 's')
      newDisplaySongs = gFilterActive ? [...newDisplaySongs, ...extraSongs] : extraSongs
    }
    sortSongs(newDisplaySongs, sortSpec)

    if (langFilter)
      newDisplaySongs = newDisplaySongs.filter(({l}) => l === langFilter)
    if (yearFilter) {
      const [gtlt, year] = [yearFilter[0], parseInt(yearFilter.slice(1))]
      newDisplaySongs = newDisplaySongs.filter(gtlt === '>' ? (({y}) => y && y > year) : (({y}) => y && y < year))
    }
    newDisplaySongs = newDisplaySongs.filter((s) => {const sl = (s.id+(s.a??'')+(s.c??'')+(s.s??'')).toLowerCase(); return srchTerms.every(t => sl.includes(t))})
    let selectedItemIndex = -1
    if (selectedSong) {
      selectedItemIndex = newDisplaySongs.findIndex(s => s.id === selectedSong)
      if (selectedItemIndex !== -1) newDisplaySongs[selectedItemIndex] = {...newDisplaySongs[selectedItemIndex], selected: true}
    }

    dataProviderRef.current = dataProviderRef.current.cloneWithRows(newDisplaySongs)
    return [newDisplaySongs, dataProviderRef.current, newDisplaySongs[selectedItemIndex] ?? null]
  }, [songlist, genresToShow, singstarFilter, langFilter, yearFilter, sortSpec, selectedSong, inclFilters, srchTerms]);

  const searchFocused = useRef(false)
  const searchBox = 
    <div className='input-block pane searchbox'>
      <label htmlFor='searchbox'> 🔍 Search:</label>
      <div className="input-wrapper">
        <DebounceInput
          id="searchbox"
          minLength={1}
          debounceTimeout={50}
          onChange={e => setSrch(e.target.value)}
          onFocus={() => searchFocused.current = true}
          onBlur={e => {if (!e.relatedTarget?.classList.contains('clear-btn')) searchFocused.current = false}}
          value={srch} placeholder="Search query"
        />
        <button className='clear-btn' onClick={(e) => {setSrch(''); if (searchFocused.current) document.getElementById('searchbox')?.focus()}}>×</button>
      </div>
    </div>

  const [filtersOpened, setFiltersOpened] = useState(true)

  const unableToRequestReason: string|null = useMemo(() => {
    if (!shownSelectedSong)
      return null
    if (queue?.find(s => s.id === shownSelectedSong))
      return 'SONG ALREADY IN QUEUE'
    if (songlist?.unincluded?.map(s => s.id).includes(shownSelectedSong))
      return 'SONG UNAVAILABLE'
    return null
  }, [queue, shownSelectedSong, songlist?.unincluded])

  const pageRef = useRef<HTMLDivElement>(null)
  const songsWrapperRef = useRef<HTMLDivElement>(null)
  const songlistRef = useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(null)

  const scrolledToTop = useRef(true)
  const [songlistScrolled, setSonglistScrolled] = useState(false)
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const scrollToPct = (pct: 0|1, smooth = true) =>
    pct ? pageRef.current?.scrollTo({top: pageRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto'}) : pageRef.current?.scrollTo({top: 0, behavior: smooth ? 'smooth' : 'auto'})

  const [initialLoaded, setInitialLoaded] = useState(false)
  useEffect(() => {setInitialLoaded(true); scrollToPct(0)}, [])
  useEffect(() => {scrollToPct(0); setSelectedSong(null)}, [inclFilters, showUnincluded, singstarFilter])

  useScrollPosition(({ currPos }) => {
    if (!pageRef.current) return
    const pct = currPos / (pageRef.current.scrollHeight - pageRef.current.clientHeight)
    scrolledToTop.current = pct <  .01 || currPos < 50
    const cls = document.querySelector('.sticky-section-backdrop')?.classList
    if (cls) {
      if (cls.contains('shown') && scrolledToTop.current) cls.remove('shown')
      else if (!cls.contains('shown') && !scrolledToTop.current) cls.add('shown')
    }
  }, [], pageRef)

  const onScrollRecyclerList = (y: number) => {
    if (y > 0 && !songlistScrolled) setSonglistScrolled(true)
    else if (y <= 0 && songlistScrolled) setSonglistScrolled(false)
    if (y > 400 && !showScrollToTop) setShowScrollToTop(true)
    else if (y <= 400 && showScrollToTop) setShowScrollToTop(false)
    if (scrolledToTop.current) {scrollToPct(1, false)}
  }

  useEffect(() => {
    if (srchTerms.length && scrolledToTop.current) scrollToPct(1)
  }, [selectedSong, srchTerms.length])

  const openAddSongModal = () => setAlert({type: 'notify', title: 'ADDING SONGS', body: addSongNotice()})

  const jumpBtnsPec = useMemo(() => getJumpBtns(sortSpec), [sortSpec])
  const jumpBtn = useMemo(() => jumpBtnsPec && (
      <button className='song-title-btn' onClick={(e) => {
        e.stopPropagation()
        setAlert({type: 'selector', title: jumpBtnsPec.title, btns: jumpBtnsPec.options.map(([opt, indexGetter]) => [opt, () => {
          const i = indexGetter(displaySongs)
          if (i !== -1) songlistRef.current?.scrollToIndex(i, true)
        }])})
      }}>
        {jumpBtnsPec.btn}
      </button>
  ), [displaySongs, jumpBtnsPec, setAlert])

  return (
    // oh-snap is only set after initial page load, because otherwise it'll sometimes randomly snap to the bottom
    <div className={`Songlist page ${initialLoaded ? 'oh-snap' : ''}`} ref={pageRef}>
      <div className="snap-start"></div>
      <div className="page-body">
        {qAccess
          ? <div className='sticky-section'>
              <div className="input-block-flekz" onFocus={() => selectedSong && setSelectedSong(null)}>
                <Link to={`/${domain}`} className="link-btn back-to-queue-btn">BACK</Link>
                {searchBox}
                <NameWidget collapseIfFilled />
              </div>
            </div>
          : <div className='sticky-section anon'>{searchBox}</div>
        }
        <div className="spacer"></div>

        <SelectedSongModal selectedSong={selectedSongItem} unsetSelectedSong={() => setSelectedSong(null)}>
          {qAccess &&
            <button className='link-btn' disabled={!!unableToRequestReason} onClick={() => selectedSong && requestSong(selectedSong)}>
              {unableToRequestReason ?? 'REQUEST SONG'}
            </button>
          }
        </SelectedSongModal>

        {/* todo: proper vertical flex thingy */}
        <div className={`select-random modal-dialog-thing`}>
          <button className='link-btn' onClick={() => {
            const i = Math.floor(Math.random()*displaySongs.length)
            setSelectedSong(displaySongs[i].id)
            songlistRef.current?.scrollToIndex(Math.max(i-(viewMode === 'tiled' ? 1 : 3), 0), true)
            if (scrolledToTop.current) scrollToPct(1)
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
        <div className={`filter-section pane ${filtersOpened ? '' : 'collapsed'}`}>
          {/* todo: (i) icon which opens modal with a lil bit of info */}
          <h3><button onClick={() => setFiltersOpened(v=>!v)} className='link-btn'>FILTERS</button></h3>
          
          <Collapse isOpened={filtersOpened}>
            <div className={`category-filters disablable ${srchTerms.length ? 'disabled' : ''}`}>
              {Object.entries(inclFilters).map(([g, checked]) =>
                <span key={g} style={{backgroundColor: genreToColor[g]}} className='category-filter'>
                  <input id={`filter-${g}`} type="checkbox" checked={checked} onChange={e => toggleInclFilter(g as Genre)} />
                  <label htmlFor={`filter-${g}`}>{g}</label>
                </span>
              )}
              {showSingstarFilter &&
                <span style={{backgroundColor: '#DDDDDD'}} className='category-filter'>
                  <input id={`filter-singstar`} type="checkbox" checked={singstarFilter} onChange={e => setSingstarFilter(!singstarFilter)} />
                  <label htmlFor={`filter-singstar`}><em>singstar</em></label>
                </span>
              }
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

        <h2
          className={`songs-title ${songlistScrolled ? 'with-border' : ''} ${viewMode === 'tiled' ? 'align-centerr' : ''}`}
          onClick={() => scrollToPct(scrolledToTop.current ? 1 : 0)}
        >
          Songs <span>{displaySongs.length}</span>{' '}
          <button className='song-title-btn' onClick={e => {e.stopPropagation(); setViewMode(viewMode === 'list' ? 'tiled' : 'list')}}>{viewMode.toUpperCase()}</button>
          <button className='song-title-btn' onClick={e => {e.stopPropagation(); openAddSongModal()}}><em>ADD</em></button>
          {jumpBtn}
        </h2>
        <div ref={songsWrapperRef} className={`songs-wrapper ${viewMode}-view`} style={{width: '100%', height: screenHeight-160}}>
          {initialLoaded &&
            <RecyclerListView
              onScroll={(_e, _x, y) => onScrollRecyclerList(y)}
              layoutProvider={layoutProvider}
              renderFooter={() => <div className='songlist-footer'>
                <button onClick={openAddSongModal}>Can't find the song you're looking for?</button>
              </div>}
              dataProvider={dataProvider}
              ref={songlistRef}
              canChangeSize
              style={{width: '100%', height: '100%'}}
              rowRenderer={(_, s: EnhancedSongListItem, i) => (
                <li
                  className={`song-item clickable ${s.selected ? 'selected' : ''}`}
                  key={`${i}-s`}
                  onClick={() => setSelectedSong(ss => ss === s.id ? null : s.id)}
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

function addSongNotice() {
  return (
    <p>
      Can't find a song? Go ahead and add it to <br/> <a href={SPOTIFYURL} target="_blank" rel="noreferrer">this Spotify playlist</a> <br/> and it may be added!<br/>
      {/* Or if you got ultrastar files for me: even better! You can drop those <a href="https://mega.nz/megadrop/Id6ACZf_WrI" target="_blank" rel="noreferrer">in here</a>! */}
    </p>
  )
}

const VALID_SORT_RGX = /^(title|artist|year|lang|genre|source|length|random|added|id)(_desc)?/

function sortSongs(songs: EnhancedSongListItem[], sortSpec?: string|null): EnhancedSongListItem[] {
  const [, sortType, desc] = sortSpec?.match(VALID_SORT_RGX) ?? [null, null, null]

  const s = songs.sort((a,b) => a.id.localeCompare(b.id))

  switch (sortType) {
    case null:
    case 'id':
    case 'artist':
      return desc ? s.reverse() : s
    case 'title':
      return s.sort((a,b) => a.id.match(/ : .+/)![0].localeCompare(b.id.match(/ : .+/)![0]) * (desc ? -1 : 1))
    case 'year':
      return s.sort((a,b) => ((a.y ?? 99999) - (b.y ?? 99999)) * (desc ? -1 : 1))
    case 'lang':
      return s.sort((a,b) => (a.l ?? 'zzz').localeCompare(b.l ?? 'zzz') * (desc ? -1 : 1))
    case 'genre':
      return s.sort((a,b) => a.g.localeCompare(b.g) * (desc ? -1 : 1))
    case 'source':
      return s.sort((a,b) => (a.s ?? 'zzz').localeCompare(b.s ?? 'zzz') * (desc ? -1 : 1))
    // case 'length':
    //   return s.sort((a,b) => (a.d ?? 0) - (b.d ?? 0) * (desc ? -1 : 1))
    case 'random':
      // todo: this is going to reshuffle every time the search box changes innit :pensive:
      return s.sort(() => Math.random() - 0.5)
    case 'added':
      return s.sort((a,b) => ((b.t ?? 0) - (a.t ?? 0)) * (desc ? -1 : 1))
    default:
      return s
  }
}


const LETTERS = '0ABCDEFGHIJKLMNOPQRSTUVWXYZあ杏α'.split('')
const YEARS = [1950,1960,1970,1980,1985,1990,1995,2000,2005,2010,2015,2020,2025] as const

type JumpOption = [opt: string, getIndex: (sl: EnhancedSongListItem[]) => number]
function getJumpBtns(sortSpec?: string|null): {btn: string, title: string, options: JumpOption[]} | null {
  const [, sortType, desc] = sortSpec?.match(VALID_SORT_RGX) ?? [null, null, null]
  const asc = !desc

  const findLetterFn = (letter: string, compareGetter: (s: EnhancedSongListItem) => string|undefined) => (songs: EnhancedSongListItem[]): number => {
    const ll = letter.toLowerCase()
    return songs.findIndex(s => (compareGetter(s)?.toLowerCase().localeCompare(ll) ?? 0) * (desc ? -1 : 1) >= 0)
  }
  const findNumberFn = (num: number, compareGetter: (s: EnhancedSongListItem) => number|undefined) => (songs: EnhancedSongListItem[]): number => {
    return songs.findIndex(s => ((((compareGetter(s) ?? 9999) - num) * (desc ? -1 : 1) >= 0)))
  }

  switch (sortType) {
    case null:
    case 'id':
    case 'artist':
      return {
        btn: asc ? 'a..b..c...' : 'z..y..x...',
        title: 'Jump to letter',
        options: (asc ? LETTERS : [...LETTERS].reverse()).map(l => [l, findLetterFn(l, s => s.id[0])] as JumpOption),
      }
    case 'title':
      return {
        btn: asc ? 'a..b..c...' : 'z..y..x...',
        title: 'Jump to letter',
        options: (asc ? LETTERS : [...LETTERS].reverse()).map(l => [l, findLetterFn(l, s => s.id.match(/(?<= : )./)![0])] as JumpOption),
      }
    case 'year':
      return {
        btn: asc ? '1950..1960...' : '2025..2020...',
        title: 'Jump to year',
        options: (asc ? YEARS : [...YEARS].reverse()).map(n => [`${n}`, findNumberFn(n, s => s.y)] as JumpOption),
      }
    // todo
    // case 'lang':
    //   return 
    // case 'genre':
    //   return 
    // case 'source':
    //   return 
    // // case 'length':
    // //   return 
    // case 'added':
    //   return 
    case 'random':
    default:
      return null
  }
}