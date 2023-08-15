import { ReactNode, useCallback, useEffect, useState } from "react";

export type Alert = {
  title: string
  superTitle?: string
  body?: ReactNode
  class?: string
} & ({type: 'notify'} | {type: 'confirm'; confirmLabel?: string; onConfirm: () => void} | {type: 'menu', btns: [string, () => void][]} | {type: 'selector', btns: [string, () => void][]});

export const errorAlert = (err: string): Alert => ({type: 'notify', class: 'error-modal', title: err, superTitle: 'Encountered error'})

export function AlertModal({alert, hide, visible}: {visible: boolean; alert?: Alert | null; hide: () => void}) {
  // todo: use visibility lib thingy
  const [gone, setGone] = useState(true);

  const doHide = useCallback(() => {
    setGone(false)
    hide()
    setTimeout(() => setGone(true), 300)
  }, [hide])

  useEffect(() => {
    if (!visible && gone) setGone(false)
  }, [gone, visible])

  if (!visible && gone)
    return null

  const invClass = visible && !gone ? '' : 'invisible';
  return (
    <>
      <div className={`backdrop-glass-pane ${invClass}`} onClick={doHide} aria-hidden={!visible}></div>
      <div className={`pane modal-dialog-thing alert-modal ${alert?.class ?? ''} type-${alert?.type} ${invClass}`}>
        {alert ? (<>
          {alert.superTitle && <p>{alert.superTitle}</p>}
          <h2>{alert.title}</h2>
          {alert.body}
          {btns(alert)}
        </>) : <div></div>}
      </div>
    </>
  );

  function btns(a: Alert) {
    switch (a.type) {

      case 'notify':
        return <button className='link-btn' onClick={doHide}>CLOSE</button>
  
      case 'confirm':
        return (
          <div className="flex-row">
            <button className="link-btn secondary" onClick={doHide}>
              CANCEL
            </button>
            <button className="link-btn" onClick={() => {a.onConfirm(); doHide()}}>
              {a.confirmLabel ?? 'OK'}
            </button>
          </div>
        );
      
      case 'menu':
        return (
          <>
            <div className="menu-btns">
              {a.btns.map(([label, cb],i) => <button key={i} onClick={() => {doHide(); cb()}}>{label}</button>)}
            </div>
            <button className='link-btn close-btn' onClick={doHide}>CLOSE</button>
          </>
        )

      case 'selector':
        return (
          <>
            <div className="menu-btns">
              {a.btns.map(([label, cb],i) => <button key={i} onClick={() => {doHide(); cb()}}>{label}</button>)}
            </div>
            <button className='link-btn close-btn' onClick={doHide}>CANCEL</button>
          </>
        )
        
    }
  }
}