import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlipMove from 'react-flip-move';
import { Link, useParams } from "react-router-dom";
import { sessionToken, useApi, useRefreshQueue } from "../util/api";
import { useAppContext } from "../util/Context";
import NameWidget from "./NameWidget";

export default function Queue() {
  const {queue, setQueue, setError, adminToken} = useAppContext()
  const api = useApi()
  const refreshQueue = useRefreshQueue()
  const {domain} = useParams()
  const [ratelimit, setRatelimit] = useState(0)
  const isAdmin = useMemo(() => !!adminToken, [adminToken])

  const refreshInterval = useRef<NodeJS.Timer>()

  const vote = useCallback((songId: string) => api('post', 'vote', {songId}).then(setQueue).catch(e => setError(e.response.text)), [api, setError, setQueue])

  useEffect(() => {
    if (refreshInterval.current) clearInterval(refreshInterval.current)
    refreshQueue()
    refreshInterval.current = setInterval(refreshQueue, 10000)
    return () => clearInterval(refreshInterval.current)
  }, [refreshQueue])

  const refreshRateLimit = useCallback(() => api('get', 'req-rate-limit').then(r => setRatelimit(r)), [api])
  useEffect(() => { isAdmin && refreshRateLimit() }, [isAdmin, refreshRateLimit])

  // annoying issue that disallows me from using this for now: https://github.com/joshwcomeau/react-flip-move/issues/273
  const FM = FlipMove as any

  return (
    <div className="Queue">
      <div className="input-block-flekz">
        <NameWidget />
      </div>
      {isAdmin && adminButtons()}
      <Link to={`/${domain}/songlist`} className="link-btn sticky-link-btn">REQUEST A SONG</Link>
      <h1>Queue</h1>

      <FM typeName="ul" appearAnimation="fade">
        {queue?.map((s, i) =>
          <li className='song-item' key={s.id}>
            {/* <span className="queue-entry-place">{i}</span> */}
            <p className="q-item-label">{i === 0 ? 'Now playing' : i === 1 ? 'Next up' : `${i}.`} <em>(requested by {s.votes[0]?.match(/[^_]*/)?.[0] || 'anonymous'})</em></p>
            <div className="q-item-flex">
              <span className="song-name">
                {s.id.replace(' : ', ' - ')}
                {isAdmin && <>
                <button onClick={() => {const v = prompt('How many votes?'); v && api('post', 'setvotes', {songId: s.id, votes: parseInt(v)}).then(setQueue)}}>v</button>
                <button onClick={() => {const はい = window.confirm('Really remove this song?'); はい && api('post', 'remove', {songId: s.id}).then(setQueue)}}>r</button>
                </>}
              </span>
              <button className={`votes-count vote-btn ${i<2 ? 'locked' : ''}`} disabled={i < 2 || (!isAdmin && !!s.votes.find(v => v.includes(sessionToken))) } onClick={() => vote(s.id)}>
                {i < 2
                  ? `${votesTxt(s.votes.length)} ■`
                  : s.votes.find(v => v.includes(sessionToken))
                    ? `${votesTxt(s.votes.length)} ❤`
                    : `Vote (${s.votes.length})`
                }
              </button>
            </div>
          </li>
        )}
      </FM>
    </div>
  )

  function adminButtons() {
    return (
      <div className="admin-buttons">
        <button onClick={() => api('post', 'reset').then(setQueue)}>Reset Q</button>
        <button
          onClick={async () => {const mins = prompt('How many minutes?'); mins && await api('put', 'req-rate-limit', {minutes: parseInt(mins) && setRatelimit(parseInt(mins))}) && setTimeout(refreshRateLimit, 30000)}}
        >
          Set rate limit (current: {ratelimit} mins)
        </button>
        {/* <p>todo: change admin key</p> */}
        {/* <p>todo: DELETE ENTIRE QUEUE</p> */}
      </div>
    )
  }
}

function votesTxt(count: number) { return `${count} vote${count===1 ? '' : 's'}` }
