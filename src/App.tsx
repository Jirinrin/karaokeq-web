import "./App.scss";
import SongList from "./pages/Songlist";
import { Navigate, Route, Routes } from "react-router-dom";
import Queue from "./pages/Queue";

/*
Structure: (karaoke.jirinrin.com)
- root - redirects to /songlist
- /songlist - shows general songlist without request btn etc.
- /:domain - redirects to /:domain/q
  - (/:domain part has sticky thing on top of screen with 2 tabs for queue<>request username)
- /:domain/q - shows queue (bottom of queue also btn to go to 'request' (songlist) tab)
- /:domain/songlist - shows songlist where you _can_ click on songs to request them
*/

function App() {
  return (
    <div className="App">
      <video
        poster="https://performous.org/bgs/GoldenDust.jpg"
        autoPlay
        muted
        loop
        src="https://performous.org/bgs/GoldenDust.webm"
        className="bg-video"
      ></video>
      <Routes>
        <Route path="/" element={<Navigate to="/songlist" replace />} />
        <Route path="/songlist" element={<SongList />} />
        <Route path="/:domain">
          <Route path="" element={<Queue />} />
          <Route path="songlist" element={<SongList qAccess />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
