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
  
  // const animationDuration = diffWithParent ? diffWithParent*0.14 : 5
  const animationDuration = 8

  return (
    <span className={`song-name ${diffWithParent > -10 ? 'scrolling' : ''}`}>
      <span ref={ref}>{formatSongId(songId)}</span>
      {/* todo: try to get this into a more conventional scroll anim */}
      <span className="anim" style={{animationDuration: `${animationDuration}s`}}>{formatSongId(songId)}</span>
    </span>
  )
}
