import { Link, useParams } from "react-router-dom";
import { useAppContext } from "../util/Context";

export function Admin() {
  const {setAdminToken} = useAppContext()
  const {domain} = useParams()

  const authorize = () => {
    setAdminToken(prompt('Please specify admin token'))
  }
  
  return (
    <div className="Admin page">
      <div className="page-body">
        <h1>Admin</h1>
        <button onClick={authorize}>Authorize</button>
        <Link to={`/${domain}`} className="link-btn back-to-queue-btn">BACK TO QUEUE</Link>
      </div>
    </div>
  )
}