import { Navigate, Route, Routes } from "react-router-dom";
import "./App.scss";
import { BackgroundPict } from "./components/BackgroundPict";
import { Admin } from "./pages/Admin";
import Queue from "./pages/Queue";
import SongList from "./pages/Songlist";
import { useAppContext } from "./util/Context";
import { BG_VIDEOS } from "./util/bgVideos";

/*
Structure: (karaoke.jirinrin.com)
- root - redirects to /songlist
- /songlist - shows general songlist without request btn etc.
- /:domain - shows queue (bottom of queue also btn to go to 'request' (songlist) tab)
- /:domain/songlist - shows songlist where you _can_ click on songs to request them
*/

export default function App() {
  const {config} = useAppContext()

  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div className={`App ${isSafari ? 'browser-safari' : ''}`}>
      <BackgroundPict pict={config ? config.bgPict ?? BG_VIDEOS[0] : null} />
      <Routes>
        <Route path="/" element={<Navigate to="/songlist" replace />} />
        <Route path="/songlist" element={<SongList />} />
        <Route path="/:domain">
          <Route path="" element={<Queue />} />
          <Route path="songlist" element={<SongList qAccess />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </div>
  );
}
