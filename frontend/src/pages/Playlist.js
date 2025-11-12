import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import { MusicPlayerProvider } from '../context/MusicPlayerContext';
import { MusicSearchProvider } from '../context/MusicSearchContext';
import "../styles/Playlist.css";

const Playlist = () => {
  return (
    <MusicPlayerProvider>
      <MusicSearchProvider>
        <div className="page-play">
          <TopBar />
          <main className="play-content">
            <h1>Playlists</h1>
          </main>
          <BottomBar />
        </div>
      </MusicSearchProvider>
    </MusicPlayerProvider>
  );
};

export default Playlist;

