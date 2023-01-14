export type Alert = {
  title: string
  superTitle?: string
  class?: string
} & ({type: 'notify'} | {type: 'confirm'; confirmLabel?: string; onConfirm: () => void} | {type: 'menu', btns: [string, () => void][]});

export const errorAlert = (err: string): Alert => ({type: 'notify', class: 'error-modal', title: err, superTitle: 'Encountered error'})

export function AlertModal({alert, ...p}: {visible: boolean; alert?: Alert | null; hide: () => void}) {
  const invClass = p.visible ? '' : 'invisible';
  return (
    <>
      <div className={`backdrop-glass-pane ${invClass}`} onClick={p.hide} aria-hidden={!p.visible}></div>
      <div className={`pane modal-dialog-thing alert-modal ${alert?.class ?? ''} ${invClass}`}>
        {alert ? (<>
          {alert.superTitle && <p>{alert.superTitle}</p>}
          <h2>{alert.title}</h2>
          {btns(alert)}
        </>) : <div></div>}
      </div>
    </>
  );

  function btns(a: Alert) {
    switch (a.type) {

      case 'notify':
        return <button className='link-btn' onClick={p.hide}>CLOSE</button>
  
      case 'confirm':
        return (
          <>
            <button className="link-btn" onClick={p.hide}>
              Annuleren
            </button>
            <button className="link-btn" onClick={() => {a.onConfirm(); p.hide()}}>
              {a.confirmLabel ?? 'OK'}
            </button>
          </>
        );
      
      case 'menu':
        return (
          <>
            <div className="menu-btns">
              {a.btns.map(([label, cb],i) => <button key={i} onClick={() => {cb(); p.hide()}}>{label}</button>)}
            </div>
            <button className='link-btn close-btn' onClick={p.hide}>CLOSE</button>
          </>
        )
        
    }
  }
}