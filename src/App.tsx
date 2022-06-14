import { useEffect, useMemo, useState } from 'react';
import { DebounceInput } from 'react-debounce-input';
import songlist from './songlist.json'

type Genre = keyof typeof songlist
const GENRES = Object.keys(songlist) as Genre[]

function isGenre(g: Genre) { return g !== 'bleh'; }

function App() {
  const [srch, setSrch] = useState('')
  const [showBleh, setShowBleh] = useState(false)
  const [inclFilters, setInclFilters] = useState(GENRES.filter(isGenre).reduce((acc, g) => ({...acc, [g]: false}), {} as Record<Genre, boolean>))
  // todo: sorting

  // const filters = Object.keys
  function toggleInclFilter(g: Genre) {
    setInclFilters({...inclFilters, [g]: !inclFilters[g]})
  }

  const genresToShow = useMemo(() => {
    if (Object.values(inclFilters).includes(true))
      return GENRES.filter(g => inclFilters[g])
    else if (!showBleh)
      return GENRES.filter(isGenre)
    else
      return GENRES
  }, [inclFilters, showBleh]);

  const [displaySongs, setDisplaySongs] = useState<[string, Genre][]>([])

  useEffect(() => {
    const songs = [...genresToShow.flatMap(g => songlist[g].map((s): [string, Genre] => [s, g]))].sort((a,b) => a[0].localeCompare(b[0]))
    if (!srch) setDisplaySongs(songs);

    const terms = srch.split(' ').map(t => t.trim())
    setDisplaySongs(songs.filter(([s]) => {const sl = s.toLowerCase(); return terms.every(t => sl.includes(t))}))
  }, [genresToShow, srch]);

  return (
    <div className="App">
      <h1>Shitty songlist karaoke dinges.</h1>
      <div>
        <label htmlFor='searchbox'>Search:</label>
        <DebounceInput minLength={3} debounceTimeout={300} onChange={e => setSrch(e.target.value)} value={srch} />
        <button onClick={() => setSrch('')}>Clear</button>
      </div>
      <div>
        <h3>Category filters</h3>
        {Object.entries(inclFilters).map(([g, checked]) =>
          <span key={g}>
            <input id={`filter-${g}`} type="checkbox" checked={checked} onChange={e => toggleInclFilter(g as Genre)} />
            {/* todo: some cute colors for the labels */}
            <label htmlFor={`filter-${g}`}>{g}</label>
          </span>
        )}
      </div>

      <label htmlFor="show-unincluded-songs">Show unincluded songs:</label>
      <input id="show-unincluded-songs" type="checkbox" checked={showBleh} onChange={e => setShowBleh(!showBleh)} />

      <div>
        <h4>Kan je een liedje niet vinden? Voeg hem gerust toe aan <a target="_blank" href="https://open.spotify.com/playlist/5CDdHeDNZv9ZsnicdWV7cd?si=662322638dc848f8&pt=81047987f8f5595d761cf80d9a6d31fd" rel="noreferrer">deze Spotify-playlist</a></h4>
      </div>

      <h2>Song results ({displaySongs.length})</h2>
      <ul>
        {displaySongs.map(([s, g], i) =>
          <li key={`${i}-s`}>
            <span>{s.replace(' : ', ' - ')}</span>
            <span style={{backgroundColor: 'lightpink', padding: '1.5px 5px', marginInlineStart: '10px'}}>{g}</span>
          </li>
        )}
      </ul>

    </div>
  );
}

export default App;
