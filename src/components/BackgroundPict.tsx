import { useEffect, useState } from "react"
import { BG_VIDEOS } from "../util/bgVideos"
import { BgPicture } from "../util/types"

export const BackgroundPict = (p: {pict: BgPicture|null}) => {
  const [bgPict, setBgPict] = useState<BgPicture|null>(p.pict)

  useEffect(() => setBgPict(p.pict), [p.pict])

  const sharedProps = {src: bgPict?.[0], style: {filter: bgPict?.[1]}, onError: () => setBgPict(BG_VIDEOS[0]), className: 'bg-pict fade-in-appear'}

  return <>
    {bgPict && (bgPict[0].match(/jpg|png|webp$/)
      ? <img {...sharedProps} alt='background' />
      : <video {...sharedProps} autoPlay muted loop />
    )}
  </>
}
