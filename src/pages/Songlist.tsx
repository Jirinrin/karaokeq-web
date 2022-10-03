import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DebounceInput } from 'react-debounce-input';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useRefreshQueue } from '../util/api';
import { Genre, GENRES, isGenre, songlist, useAppContext } from '../util/Context';
import { useLastNonNull } from '../util/hoox';
import NameWidget from './NameWidget';


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
  const {queue, setQueue, inclFilters, setInclFilters, setError} = useAppContext()
  const navigate = useNavigate()
  
  const [srch, setSrch] = useState('')
  const [showUnincluded, setShowUnincluded] = useState(false)

  const [displaySongs, setDisplaySongs] = useState<[string, Genre][]>([])

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
      coverTimeout.current = setTimeout(() => img.src = `https://pub-d909a0daa125478d9db850d4da553bc4.r2.dev/${prepForCDNQuery(selectedSong)}`, 500)
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
    if (Object.values(inclFilters).includes(true))
      return GENRES.filter(g => inclFilters[g])
    else if (!showUnincluded)
      return GENRES.filter(isGenre)
    else
      return GENRES
  }, [inclFilters, showUnincluded]);

  useEffect(() => {
    const songs = [...genresToShow.flatMap(g => songlist[g].map((s): [string, Genre] => [s, g]))].sort((a,b) => a[0].localeCompare(b[0]))
    if (!srch) setDisplaySongs(songs);

    const terms = srch.toLowerCase().split(' ').map(t => t.trim())
    const newDisplaySongs = songs.filter(([s]) => {const sl = s.toLowerCase(); return terms.every(t => sl.includes(t))})
    setDisplaySongs(newDisplaySongs)
    // setDataProvider(d => d.cloneWithRows(newDisplaySongs))
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

  // todo: toggle to switch to a display in thumbnail tiles :D

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
      <div>
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

      <div className='show-unincluded'>
        <label htmlFor="show-unincluded-songs">Show unincluded songs:</label>
        <input id="show-unincluded-songs" type="checkbox" checked={showUnincluded} onChange={e => setShowUnincluded(!showUnincluded)} />
      </div>


      <div className='notice'>
        <h4>
          Can't find a song? Go ahead and add it to <a href={SPOTIFYURL} target="_blank" rel="noreferrer">this Spotify playlist</a>, and I'll go ahead and try to get it into the game!<br/>
          Or if you got ultrastar files for me: even better! You can drop those <a href="https://mega.nz/megadrop/Id6ACZf_WrI" target="_blank" rel="noreferrer">in here</a>!
        </h4>
      </div>

      <h2>Song results ({displaySongs.length})</h2>
      <ul>
        {displaySongs.map(([s, g], i) =>
          <li className='song-item' key={`${i}-s`}>
            <span
              className={`song-name ${qAccess ? 'clickable' : ''} ${selectedSong === s ? 'selected' : ''}`}
              onClick={() => qAccess && setSelectedSong(selectedSong === s ? null : s)}
            >
              {s.replace(' : ', ' - ')}
            </span>
            <span className='category-chip' style={{backgroundColor: genreToColor[g]}}>{g}</span>
          </li>
        )}
      </ul>

      {/* todo: couple floating btns: [scroll to top], [select random song & scroll to it] */}
    </div>
  )
}

function prepForCDNQuery(name: string) {
  return encodeURIComponent(esc(name)).replace(/%(24|26|2B|2C|3B|3D)/g, '%25$1')
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
