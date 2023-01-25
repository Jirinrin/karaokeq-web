import { ReactNode, useEffect, useMemo, useRef } from "react"
import { useLastNonNull } from "../util/hoox"
import { SongListItem } from "../util/types"
import { getSongArtistTitle, prepForCDNQuery } from "../util/utils"

export const SelectedSongModal = ({selectedSong, ...p}: {selectedSong: string|SongListItem| null, unsetSelectedSong: () => void, children: ReactNode}) => {
  const coverRef = useRef<HTMLImageElement>(null)
  const coverTimeout = useRef<NodeJS.Timeout>()
  const selectedSongItem = useMemo<SongListItem|null>(() => typeof selectedSong === 'string' ? {id: selectedSong} : selectedSong, [selectedSong])
  const sss = useLastNonNull(selectedSongItem) // shownSelectedSong

  const [artist, title] = sss ? getSongArtistTitle(sss.id) : ['','']

  useEffect(() => {
    const img = coverRef.current
    if (!img) return
    img.classList.add('invisible')
    clearTimeout(coverTimeout.current)
    if (selectedSongItem?.id)
      coverTimeout.current = setTimeout(() => img.src = prepForCDNQuery(selectedSongItem.id), 500)
  }, [selectedSongItem?.id])

  return (
    <div className={`selected-song modal-dialog-thing ${selectedSong ? '' : 'invisible'}`}>
      <img className="selected-cover invisible" loading="lazy" alt="" ref={coverRef} onLoad={(e) => e.currentTarget.classList.remove('invisible')} />
      <div className="pane">
        <p>Selected song</p>
        <h2>
          {title}
        </h2>
        <h3>
          {artist}
          {sss?.y && <span className="year-label">{sss.y}</span>}
        </h3>
        {p.children}
        {sss?.l && <span className="lang-label">{sss.l}</span>}
        <button className='link-btn close-btn' onClick={() => p.unsetSelectedSong()}></button>
      </div>
    </div>
  )
}