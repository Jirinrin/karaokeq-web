import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Collapse } from 'react-collapse';
import { DebounceInput } from 'react-debounce-input';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DataProvider, LayoutProvider, RecyclerListView } from 'recyclerlistview/web';
import { SongName } from '../components/SongName';
import { GENRES, Genre, isGenre, songlist, useAppContext } from '../util/Context';
import { useApi, useRefreshQueue } from '../util/api';
import { useLastNonNull, useScrollPosition } from '../util/hoox';
import NameWidget from './NameWidget';

type SongRow = [id: string, g: Genre]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SPOTIFYURL = `
https://open.spotify.com/playlist/5CDdHeDNZv9ZsnicdWV7cd?si=fb66c225fdb446f3&pt=8619e5362717c4f181468575c027da4d
`.trim()

const weebKeys = GENRES.filter((k) => k.match(/^[jk]-/))
const westKeys = GENRES.filter((k) => k.startsWith('w-'))

const COLORS = '#77dd77#ff9899#89cff0#f6a6ff#b2fba5#FDFD96#aaf0d1#c1c6fc#bdb0d0#befd73#ff6961#ffb7ce#ca9bf7#ffffd1#c4fafb#fbe4ff#B19CD9#FFDAB9#FFB347#966FD6#b0937b'.match(/#\w{6}/g)!
const genreToColor = Object.fromEntries(GENRES.map((g,i) => [g, COLORS[i]]))

export default function SongList({qAccess}: {qAccess?: boolean}) {
  const {domain} = useParams()
  const api = useApi()
  const refreshQueue = useRefreshQueue()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {queue, setQueue, inclFilters, setInclFilters, setError, viewMode, setViewMode} = useAppContext()
  const navigate = useNavigate()
  
  const [srch, setSrch] = useState('')
  const [showUnincluded, setShowUnincluded] = useState(false)

  const [displaySongs, setDisplaySongs] = useState<SongRow[]>([])
  const [dataProvider, setDataProvider] = useState(new DataProvider((r1: SongRow, r2: SongRow) => r1[0] !== r2[0] || r1[1] !== r2[1]))

  const [selectedSong, setSelectedSong] = useState<string|null>(null)
  const shownSelectedSong = useLastNonNull(selectedSong)

  const coverRef = useRef<HTMLImageElement>(null)
  const coverTimeout = useRef<NodeJS.Timeout>()

  const [addSongNoticeOpened, setAddSongNoticeOpened] = useState(true)

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
    const all = showUnincluded ? GENRES : GENRES.filter(isGenre)
    if (srch)
      return all
    else if (Object.values(inclFilters).includes(true))
      return all.filter(g => inclFilters[g])
    else
      return all
  }, [inclFilters, showUnincluded, srch]);

  useEffect(() => {
    const songs = [...genresToShow.flatMap(g => songlist[g].map((s): SongRow => [s, g]))].sort((a,b) => a[0].localeCompare(b[0]))
    if (!srch) setDisplaySongs(songs);

    const terms = srch.toLowerCase().split(' ').map(t => t.trim())
    const newDisplaySongs = songs.filter(([s]) => {const sl = s.toLowerCase(); return terms.every(t => sl.includes(t))})
    setDisplaySongs(newDisplaySongs)
    setDataProvider(d => d.cloneWithRows(newDisplaySongs))
  }, [genresToShow, srch]);

  const searchBox = 
    <div className='input-block pane searchbox'>
      <label htmlFor='searchbox'> 🔍 Search:</label>
      <div className="input-wrapper">
        <DebounceInput id="searchbox" minLength={2} debounceTimeout={300} onChange={e => setSrch(e.target.value)} value={srch} placeholder="Search query" />
        <button className='clear-btn' onClick={() => setSrch('')}>×</button>
      </div>
    </div>

  const selectedSongAlreadyInQ = !!queue?.find(s => s.id === shownSelectedSong)
  const selectedSongIsUnincluded = useMemo(() => shownSelectedSong !== null && songlist.unincluded.includes(shownSelectedSong), [shownSelectedSong])

  const [spaceAboveResults, setSpaceAboveResults] = useState(0)
  const [songlistScrollEnabled, setSonglistScrollEnabled] = useState(false)
  const [songlistScrolled, setSonglistScrolled] = useState(false)

  useScrollPosition(({ prevPos, currPos }) => {
    const pct = currPos / (document.body.scrollHeight - window.innerHeight)
    setSpaceAboveResults(pct * 104)

    if (pct >= 1)
      setSonglistScrollEnabled(true)
    else
      setSonglistScrollEnabled(false)
  }, [], undefined, true)

  // const songsViewRef = useRef<HTMLDivElement>(null)
  // const scrollToTop = () => {
  //   songsViewRef.current?.scrollToTop()
  // }

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
              <h2>{shownSelectedSong?.replace(' : ', ' - ')}</h2>
              <button className='link-btn' disabled={selectedSongAlreadyInQ || selectedSongIsUnincluded} onClick={() => selectedSong && requestSong(selectedSong)}>
                {selectedSongAlreadyInQ ? 'SONG ALREADY IN QUEUE' : selectedSongIsUnincluded ? 'SONG UNAVAILABLE' : 'REQUEST SONG'}
              </button>
              <button className='link-btn close-btn' onClick={() => setSelectedSong(null)}></button>
            </div>
          </div>
        </div>
      )}

      <h1>Songlist</h1>
      {!qAccess &&
        <div className='sticky-section anon'>
          {searchBox}
        </div>
      }
      <div className={`filter-section disablable ${srch ? 'disabled' : ''}`}>
        <h3>Category filters</h3>
        {Object.entries(inclFilters).map(([g, checked]) =>
          <span key={g} style={{backgroundColor: genreToColor[g]}} className='category-filter'>
            <input id={`filter-${g}`} type="checkbox" checked={checked} onChange={e => toggleInclFilter(g as Genre)} />
            <label htmlFor={`filter-${g}`}>{g}</label>
          </span>
        )}
        <span style={{backgroundColor: 'white'}} className='category-filter'>
          <input id={`filter-west`} type="checkbox" checked={westKeys.every(k => inclFilters[k])} onChange={e => setInclFilters(westKeys.reduce((acc, k) => ({...acc, [k]: e.target.checked}), inclFilters))} />
          <label htmlFor={`filter-west`}><em>west</em></label>
        </span>
        <span style={{backgroundColor: 'white'}} className='category-filter'>
          <input id={`filter-weeb`} type="checkbox" checked={weebKeys.every(k => inclFilters[k])} onChange={e => setInclFilters(weebKeys.reduce((acc, k) => ({...acc, [k]: e.target.checked}), inclFilters))} />
          <label htmlFor={`filter-weeb`}><em>east</em></label>
        </span>
      </div>

      <div className={`show-unincluded disablable ${Object.values(inclFilters).includes(true) && !srch ? 'disabled' : ''}`}>
        <label htmlFor="show-unincluded-songs">Show unincluded songs:</label>
        <input id="show-unincluded-songs" type="checkbox" checked={showUnincluded} onChange={e => setShowUnincluded(!showUnincluded)} />
      </div>


      <Collapse isOpened={addSongNoticeOpened && !srch}>
        <div className='notice'>
          <h4>
            Can't find a song? Go ahead and add it to <a href={SPOTIFYURL} target="_blank" rel="noreferrer">this Spotify playlist</a>, and I'll go ahead and try to get it into the game!<br/>
            Or if you got ultrastar files for me: even better! You can drop those <a href="https://mega.nz/megadrop/Id6ACZf_WrI" target="_blank" rel="noreferrer">in here</a>!
            <button onClick={() => setAddSongNoticeOpened(false)}>Dismiss</button>
          </h4>
        </div>
      </Collapse>

      {/* todo: also make tile view work with recyclerview :) */}
      {/* <button className='view-toggle' onClick={() => setViewMode(viewMode === 'list' ? 'tile' : 'list')}>VIEW: {viewMode.toUpperCase()}</button> */}
      <div style={{height: spaceAboveResults}}></div>
      <h2 className={`songs-title ${songlistScrolled ? 'with-border' : ''} ${viewMode === 'tile' ? 'align-center' : ''}`}>
        Songs <span>{displaySongs.length}</span>
      </h2>
      <div id="songs-wrapper">
        {displaySongs.length > 0 &&
          <RecyclerListView
            // todo: get ref to implement scrollToTop
            onScroll={(e, _x, y) => {setSonglistScrolled(y === 0 ? false : true)}}
            layoutProvider={new LayoutProvider(() => 'a', (_, dim) => {dim.height = 33; dim.width = 800})}
            dataProvider={dataProvider}
            scrollViewProps={{id: 'songs-scroll-view'}}
            style={{width: '100%', height: `calc(100vh - ${160}px)`, pointerEvents: songlistScrollEnabled ? 'all' : 'none'}}
            rowRenderer={(_, [s,g], i) => (
              <li
                className={`song-item ${qAccess ? 'clickable' : ''} ${selectedSong === s ? 'selected' : ''}`}
                key={`${i}-s`}
                onClick={() => qAccess && setSelectedSong(selectedSong === s ? null : s)}
              >
                <SongName songId={s} />
                <span className='category-chip' style={{backgroundColor: genreToColor[g]}}>{g}</span>
              </li>
            )}
          />
        }
      </div>

      {/* <ul className={`${viewMode}-view`}>
        {displaySongs.map(([s, g], i) =>
          <li
            className={`song-item ${qAccess ? 'clickable' : ''} ${selectedSong === s ? 'selected' : ''}`}
            key={`${i}-s`}
            onClick={() => qAccess && setSelectedSong(selectedSong === s ? null : s)}
          >
            {viewMode === 'tile' &&
              <div className="img-wrapper">
                <img className="invisible" loading="lazy" alt="" src={prepForCDNQuery(s)} onLoad={(e) => e.currentTarget.classList.remove('invisible')} />
              </div>
            }
            <div>

            <span className='song-name'>
              {formatSongId(s)}
            </span>
            <span className='category-chip' style={{backgroundColor: genreToColor[g]}}>{g}</span>
            </div>
          </li>
        )}
      </ul> */}

      {/* todo: couple floating btns: [scroll to top], [select random song & scroll to it] */}
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
