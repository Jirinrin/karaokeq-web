import req from 'superagent'
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./Context";

export let API_URL = "https://karaokeq.jirinrin.workers.dev";
// API_URL = "http://localhost:8787";

export const sessionToken = localStorage.getItem('session')
  ?? (() => { const s = Math.random().toString(); localStorage.setItem('session', s); return s })()

export function useApi() {
  const { domain } = useParams()
  const { userName } = useAppContext()

  return useCallback(async (method: 'get'|'post'|'put'|'delete', path: string, body?: any) => {
    let r = req[method](`${API_URL}/${domain}/${path}`)
      .set('Q-Session', sessionToken)
      .set('Q-User-Name', userName)

    if (body)
      r = r.send(body)

    const resp = await r
    return resp.text && JSON.parse(resp.text)
  }, [domain, userName]);
}

export function useRefreshQueue() {
  const api = useApi()
  const {setQueue} = useAppContext()
  return useCallback(() => api('get', 'q').then(setQueue), [api, setQueue])
}