import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import { MusicPlayerProvider } from '../context/MusicPlayerContext';
import { MusicSearchProvider } from '../context/MusicSearchContext';
import "../styles/Album.css";

const Album = () => {
  return (
    <MusicPlayerProvider>
      <MusicSearchProvider>
        <div className="page-album">
          <TopBar />
          <main className="album-content">
            <h1>Álbumes</h1>
          </main>
          <BottomBar />
        </div>
      </MusicSearchProvider>
    </MusicPlayerProvider>
  );
};

export default Album;

