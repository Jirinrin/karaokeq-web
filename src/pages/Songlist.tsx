import { useCallback, useEffect, useMemo, useState } from 'react';
import { DebounceInput } from 'react-debounce-input';
import { Link, useNavigate, useParams } from 'react-router-dom';
import songlist from '../songlist.json'
import { useApi } from '../util/api';
import { useAppContext } from '../util/Context';
import NameWidget from './NameWidget';

type Genre = keyof typeof songlist
const GENRES = Object.keys(songlist) as Genre[]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SPOTIFYURL = `
https://open.spotify.com/playlist/5CDdHeDNZv9ZsnicdWV7cd?si=fb66c225fdb446f3&pt=8619e5362717c4f181468575c027da4d
`.trim()

const weebKeys = GENRES.filter((k) => k.match(/^[jk]-/))
const westKeys = GENRES.filter((k) => k.startsWith('w-'))

const COLORS = '#77dd77#ff9899#89cff0#f6a6ff#b2fba5#FDFD96#aaf0d1#c1c6fc#bdb0d0#befd73#ff6961#ffb7ce#ca9bf7#ffffd1#c4fafb#fbe4ff#B19CD9#FFDAB9#FFB347#966FD6#b0937b'.match(/#\w{6}/g)!
const genreToColor = Object.fromEntries(GENRES.map((g,i) => [g, COLORS[i]]))

function isGenre(g: Genre) { return g !== 'unincluded'; }

export default function SongList({qAccess}: {qAccess?: boolean}) {
  const {domain} = useParams()
  const api = useApi()
  const {queue, setQueue} = useAppContext()
  const navigate = useNavigate()
  
  const [srch, setSrch] = useState('')
  const [showUnincluded, setShowUnincluded] = useState(false)
  const [inclFilters, setInclFilters] = useState(GENRES.filter(isGenre).reduce((acc, g) => ({...acc, [g]: false}), {} as Record<Genre, boolean>))

  const [selectedSong, setSelectedSong] = useState<string|null>(null)
  const [shownSelectedSong, setShownSelectedSong] = useState<string>('')

  const requestSong = useCallback((songId: string) =>
    api('post', 'request', {songId}).then(q => {
      setQueue(q)
      navigate(`/${domain}`)
    }).catch(e => console.error('ahhhh', e)),
  [api, domain, navigate, setQueue])

  useEffect(() => {
    if (selectedSong)
      setShownSelectedSong(selectedSong)
  }, [selectedSong])

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

  const [displaySongs, setDisplaySongs] = useState<[string, Genre][]>([])

  useEffect(() => {
    const songs = [...genresToShow.flatMap(g => songlist[g].map((s): [string, Genre] => [s, g]))].sort((a,b) => a[0].localeCompare(b[0]))
    if (!srch) setDisplaySongs(songs);

    const terms = srch.toLowerCase().split(' ').map(t => t.trim())
    setDisplaySongs(songs.filter(([s]) => {const sl = s.toLowerCase(); return terms.every(t => sl.includes(t))}))
  }, [genresToShow, srch]);

  const searchBox = 
    <div className='input-block pane searchbox'>
      <label htmlFor='searchbox'> 🔍 Search:</label>
      <div className="input-wrapper">
        <DebounceInput id="searchbox" minLength={2} debounceTimeout={300} onChange={e => setSrch(e.target.value)} value={srch} />
        <button className='clear-btn' onClick={() => setSrch('')}>×</button>
      </div>
    </div>

  const selectedSongAlreadyInQ = !!queue.find(s => s.id === selectedSong)

  return (
    <div className='Songlist'>
      {qAccess && (
        <div className='sticky-section'>
          <div className="input-block-flekz">
            {searchBox}
            <NameWidget />
          </div>
          <Link to={`/${domain}`} className="link-btn back-to-queue-btn">BACK TO QUEUE</Link>
          
          <div className={`selected-song pane ${selectedSong ? '' : 'invisible'}`}>
            <p>Selected song</p>
            <h2>{shownSelectedSong.replace(' : ', ' - ')}</h2>
            <button className='link-btn' disabled={selectedSongAlreadyInQ} onClick={() => selectedSong && requestSong(selectedSong)}>
              {selectedSongAlreadyInQ ? 'SONG ALREADY IN QUEUE' : 'REQUEST SONG'}
            </button>
          </div>
        </div>
      )}
      <h1>Songlist</h1>
      {!qAccess &&
        <div className='sticky-section'>
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
    </div>
  )
}