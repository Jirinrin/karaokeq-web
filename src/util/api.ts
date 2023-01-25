import { useCallback } from "react";
import { useParams } from "react-router-dom";
import req from 'superagent';
import { useAppContext } from "./Context";

export let API_URL = "https://karaokeq.q42.workers.dev";
// API_URL = "http://localhost:8787";

export const sessionToken = localStorage.getItem('session')
  ?? (() => { const s = Math.random().toString(); localStorage.setItem('session', s); return s })()

export function _useApi(domain: string, userName: string, adminToken: string|null) {
  
  return useCallback(async (method: 'get'|'post'|'put'|'patch'|'delete', path: string, body?: any) => {
    let r = req[method](`${API_URL}/${domain}/${path}`)
      .set('Q-Session', sessionToken)
      .set('Q-User-Name', userName)

    if (adminToken)
      r = r.set('Q-Admin-Token', adminToken)

    if (body)
      r = r.send(body)

    const resp = await r
    return resp.text && JSON.parse(resp.text)
  }, [domain, userName, adminToken]);
}

export function useApi() {
  const { domain } = useParams()
  const { userName, adminToken } = useAppContext()
  return _useApi(domain ?? '', userName, adminToken)
}

export function useRefreshQueue() {
  const api = useApi()
  const {setQueue} = useAppContext()
  return useCallback(() => api('get', 'q').then(setQueue), [api, setQueue])
}