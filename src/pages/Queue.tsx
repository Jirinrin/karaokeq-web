import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlipMove from 'react-flip-move';
import { Link, useParams } from "react-router-dom";
import { useWindowSize } from "usehooks-ts";
import { errorAlert } from "../components/AlertModal";
import NameWidget from "../components/NameWidget";
import { SelectedSongModal } from "../components/SelectedSongModal";
import { SongName } from "../components/SongName";
import { useAppContext } from "../util/Context";
import { sessionToken, useApi, useRefreshQueue } from "../util/api";
import { useLastNonNull } from "../util/hoox";
import { Config, QItem } from "../util/types";

export default function Queue() {
  const {queue, setQueue, setAlert, adminToken} = useAppContext()
  const api = useApi()
  const refreshQueue = useRefreshQueue()
  const {domain} = useParams()
  const [config, setConfig] = useState<Config|null>(null)
  const isAdmin = useMemo(() => !!adminToken, [adminToken])
  const [selectedSong, setSelectedSong] = useState<string|null>(null)

  const {width: windowWidth} = useWindowSize()

  const selectedQItemIndex = queue?.findIndex(s => s.id === selectedSong) ?? -1
  const shownSelectedQItemIndex = useLastNonNull(selectedQItemIndex === -1 ? null : selectedQItemIndex) ?? -1
  const selectedQItem = queue?.[shownSelectedQItemIndex]

  const refreshInterval = useRef<NodeJS.Timer>()

  const vote = useCallback((songId: string) => api('post', 'vote', {songId}).then(setQueue).catch(e => setAlert(errorAlert(e.response.text))), [api, setAlert, setQueue])

  useEffect(() => {
    if (refreshInterval.current) clearInterval(refreshInterval.current)
    refreshQueue()
    refreshInterval.current = setInterval(refreshQueue, 10000)
    return () => clearInterval(refreshInterval.current)
  }, [refreshQueue])

  const refreshConfig = useCallback(() => api('get', 'config').then(c => setConfig(c)), [api])
  const setConfigPartial = useCallback(async (c: Partial<Config>) => {
    await api('patch', 'config', c)
    setConfig(cc => cc && ({...cc, ...c}))
    setTimeout(refreshConfig, 30000)
  }, [api, refreshConfig])

  useEffect(() => { isAdmin && refreshConfig() }, [isAdmin, refreshConfig])

  function openAdminMenu() {
    const btns: [string, () => void][] = [
      ['Reset Q', () => {setAlert({type: 'confirm', title: 'Really reset the entire queue?', onConfirm: () => api('post', 'reset').then(setQueue)})}],
      [`Set rate limit (current: ${config?.requestRateLimitMins} mins)`, () => {const mins = prompt('How many minutes?'); mins && setConfigPartial({requestRateLimitMins: Number(mins)})}],
      [`Set waiting vote bonus (current: ${config?.waitingVoteBonus})`, () => {const v = prompt('How many votes?'); v && setConfigPartial({waitingVoteBonus: Number(v)})}]
      // todo: change admin key
      // todo: DELETE ENTIRE QUEUE
    ]
    setAlert({title: 'Admin menu', type: 'menu', btns})
  }
  return (
    <div className="Queue page">
      <div className="page-body">
        <SelectedSongModal selectedSong={selectedSong} setSelectedSong={setSelectedSong}>
          <div style={{display: 'flex', gap: 8}}>
          <button
            className="link-btn"
            disabled={shownSelectedQItemIndex < 2 || !selectedQItem || (!isAdmin && !!selectedQItem.votes.find(v => v.includes(sessionToken))) }
            onClick={(e) => {e.stopPropagation(); selectedQItem && vote(selectedQItem.id); setSelectedSong(null)}}
          >
            {!selectedQItem || shownSelectedQItemIndex < 2 ? 'VOTING DISABLED'
              : selectedQItem.votes.find(v => v.includes(sessionToken))
                ? `ALREADY VOTED (${votesNo(selectedQItem, isAdmin)})`
                : `VOTE (${votesNo(selectedQItem, isAdmin)})`
            }
          </button>

          {isAdmin && selectedQItem && <>
            <button className='link-btn' onClick={() => {const v = prompt(`How many votes? (${selectedQItem.votes.length})`); v && api('post', 'setvotes', {songId: selectedQItem.id, votes: parseInt(v)}).then(setQueue)}}>
              V
            </button>
            <button className='link-btn' onClick={() => {setAlert({type: 'confirm', title: 'Really remove this song?', onConfirm: () => api('post', 'remove', {songId: selectedQItem.id}).then(setQueue)})}}>
              R
            </button>
          </>}
          </div>
        </SelectedSongModal>

        <div className="input-block-flekz">
          <NameWidget />
        </div>
        <Link to={`/${domain}/songlist`} className="link-btn sticky-link-btn">REQUEST A SONG</Link>
        <h1 onClick={isAdmin ? openAdminMenu : undefined}>Queue</h1>

        <FlipMove typeName="ul" appearAnimation="fade">
          {queue?.map((s, i) => renderItem(s, i))}
        </FlipMove>
      </div>
    </div>
  )


  function renderItem(s: QItem, i: number) {
    return (
      <li className={`song-item ${i === 0 ? 'first-item' : i === 1 ? 'second-item' : ''}`} key={s.id}>
        <p className="q-item-label">{i === 0 ? 'Now playing' : i === 1 ? 'Next up' : `${i}.`} <em>(requested by {s.votes[0]?.match(/[^_]*/)?.[0] || 'anonymous'})</em></p>
        <div className="q-item-flex">
          <SongName
            songId={s.id}
            windowWidth={windowWidth}
            displayMode='list'
            onClick={() => setSelectedSong(selectedSong === s.id ? null : s.id)}
            className={s.id === selectedSong ? 'selected' : ''}
          />
          <div>
            <button
              className={`votes-count vote-btn ${i<2 ? 'locked' : ''}`}
              disabled={i < 2 || (!isAdmin && !!s.votes.find(v => v.includes(sessionToken))) }
              onClick={(e) => {e.stopPropagation(); vote(s.id)}}
            >
              {i < 2
                ? `${votesTxt(s, isAdmin)} ■`
                : s.votes.find(v => v.includes(sessionToken))
                  ? `${votesTxt(s, isAdmin)} ❤`
                  : `Vote (${votesNo(s, isAdmin)})`
              }
            </button>
          </div>
        </div>
      </li>
    )
  }
}

function votesNo(s: QItem, isAdmin: boolean) { return `${s.votes.length}${isAdmin ? `+${Math.floor(s.waitingVotes*10)/10}` : ''}` }
function votesTxt(s: QItem, isAdmin: boolean) { return `${votesNo(s, isAdmin)} vote${isAdmin || s.votes.length !== 1 ? 's' : ''}` }
