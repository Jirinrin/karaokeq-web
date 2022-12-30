import { useEffect, useRef, useState } from "react";
import { formatSongId } from "../util/utils";

export const SongName = ({ songId }: { songId: string }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [diffWithParent, setDiffWithParent] = useState(0)
  
  useEffect(() => {
    const c = ref.current
    if (c?.parentElement) {
      setDiffWithParent(c.clientWidth - c.parentElement.clientWidth)
    }
  }, [songId])

  return (
    <span className={`song-name ${diffWithParent > 20 ? 'scrolling' : ''}`}>
      <span ref={ref}>{formatSongId(songId)}</span>
      {/* todo: try to get this into a more conventional scroll anim */}
      <span className="anim" style={{animationDuration: `${diffWithParent ? diffWithParent*0.05 : 5}s`}}>{formatSongId(songId)}</span>
    </span>
  )
}
