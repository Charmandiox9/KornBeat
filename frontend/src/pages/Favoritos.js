import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import { MusicPlayerProvider } from '../context/MusicPlayerContext';
import { MusicSearchProvider } from '../context/MusicSearchContext';
import "../styles/Favoritos.css";

const Favoritos = () => {
  return (
    <MusicPlayerProvider>
      <MusicSearchProvider>
        <div className="page-fav">
          <TopBar />
          <main className="fav-content">
            <h1>Favoritos</h1>
          </main>
          <BottomBar />
        </div>
      </MusicSearchProvider>
    </MusicPlayerProvider>
  );
};

export default Favoritos;


