import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackgroundPict } from "../components/BackgroundPict";
import { useAppContext } from "../util/Context";
import { BG_VIDEOS } from "../util/bgVideos";

export function Admin() {
  const {setAdminToken, config, setConfig, postSonglist} = useAppContext()
  const {domain} = useParams()

  const authorize = () => {
    setAdminToken(prompt('Please specify admin token'))
  }

  const [slFile, setSlFile] = useState('')

  const [bgPictIndex, setBgPictIndex] = useState(0)
  const [customBgPictUrl, setCustomBgPictUrl] = useState('')
  const [customBgPictFilter, setCustomBgPictFilter] = useState('brightness(1) contrast(1)')

  useEffect(() => {
    BG_VIDEOS.forEach(v => console.log(JSON.stringify(v)))
    setBgPictIndex(config?.bgPict ? BG_VIDEOS.findIndex(v => JSON.stringify(v) === JSON.stringify(config.bgPict)) : 0)
    setCustomBgPictUrl(config?.bgPict?.[0] ?? '')
    setCustomBgPictFilter(config?.bgPict?.[1] ?? 'brightness(1) contrast(1)')
  }, [config])

  const currentBgPict = BG_VIDEOS[bgPictIndex] ?? [customBgPictUrl, customBgPictFilter] ?? null

  // todo: actually grab this songlist from an uploaded json
  const submitSonglist = () => postSonglist(JSON.parse(slFile))

  const submitBgPict = () => setConfig({bgPict: currentBgPict})
  
  return (
    <div className="admin page">
      <div className="page-body">
        <Link to={`/${domain}`} className="link-btn back-to-queue-btn">BACK TO QUEUE</Link>
        <h1>Admin <button onClick={authorize}>Authorize</button></h1>
        
        <div className="flex-col">
          <h3>Songlist</h3>
          <div className="flex-row wrap">
            {/* todo: open modal with a little stepbystep tutorial */}
            <p>How to do this?</p>
            <label htmlFor="songlist-file">Upload your generated songlist.json here</label>
            <input type='file' value={customBgPictUrl} placeholder="songlist.json" onChange={e => setSlFile(e.currentTarget.value)} id="songlist-file" />
          </div>
          <button onClick={submitBgPict}>UPLOAD</button>
        </div>
        <div className="flex-col">
          <h3>Background picture</h3>
          <div className="flex-row wrap">
            <select name="abc" id="background-pict-select" value={bgPictIndex} onChange={e => setBgPictIndex(parseInt(e.currentTarget.value))}>
              {BG_VIDEOS.map(([url, filter], i) =>
                <option key={i} value={i}>{url.match(/[^/]+$/)}</option>
              )}
              <option value={-1}>Custom URL</option>
            </select>
            {bgPictIndex === -1 && <>
              <input type='text' value={customBgPictUrl} placeholder="URL" onChange={e => setCustomBgPictUrl(e.currentTarget.value)} />
              <input type='text' value={customBgPictFilter} placeholder="Filter" onChange={e => setCustomBgPictFilter(e.currentTarget.value)} />
            </>}
          </div>
          <button onClick={submitBgPict}>SUBMIT</button>
        </div>
      </div>
      <BackgroundPict pict={currentBgPict} />
    </div>
  )
}
