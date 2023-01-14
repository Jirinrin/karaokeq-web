import { ReactNode, useEffect, useRef } from "react"
import { useLastNonNull } from "../util/hoox"
import { getSongArtistTitle, prepForCDNQuery } from "../util/utils"

export const SelectedSongModal = ({selectedSong, ...p}: {selectedSong: string|null, setSelectedSong: (to: string|null) => void, children: ReactNode}) => {
  const coverRef = useRef<HTMLImageElement>(null)
  const coverTimeout = useRef<NodeJS.Timeout>()
  const shownSelectedSong = useLastNonNull(selectedSong)

  const [artist, title] = shownSelectedSong ? getSongArtistTitle(shownSelectedSong) : ['','']

  useEffect(() => {
    const img = coverRef.current
    if (!img) return
    img.classList.add('invisible')
    clearTimeout(coverTimeout.current)
    if (selectedSong)
      coverTimeout.current = setTimeout(() => img.src = prepForCDNQuery(selectedSong), 500)
  }, [selectedSong])

  return (
    <div className={`selected-song modal-dialog-thing ${selectedSong ? '' : 'invisible'}`}>
      <img className="selected-cover invisible" loading="lazy" alt="" ref={coverRef} onLoad={(e) => e.currentTarget.classList.remove('invisible')} />
      <div className="pane">
        <p>Selected song</p>
        <h2>{title}</h2>
        <h3>{artist}</h3>
        {p.children}
        <button className='link-btn close-btn' onClick={() => p.setSelectedSong(null)}></button>
      </div>
    </div>
  )
}