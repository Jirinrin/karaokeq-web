import { useState } from "react";
import { useAppContext } from "../util/Context";

export default function NameWidget(props: {collapseIfFilled?: boolean}) {
  const {userName, setUserName} = useAppContext()
  const [collapsed, setCollapsed] = useState(!!userName && props.collapseIfFilled)

  return (
    <div className={`input-block pane name-widget ${collapsed ? 'collapsed link-btn' : ''}`} onClick={collapsed ? (() => setCollapsed(false)) : undefined}>
      <div className="expanded-content">
        <label htmlFor="name-field">What's your name?</label>
        <div className="input-wrapper">
          <input id="name-field" placeholder="Your name" value={userName} onChange={e => setUserName(e.target.value)}></input>
          <button className="clear-btn" onClick={() => setUserName('')}>×</button>
        </div>
      </div>
      <div className="collapsed-content">NAME</div>
    </div>
  )
}
