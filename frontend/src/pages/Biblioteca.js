import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import { MusicPlayerProvider } from '../context/MusicPlayerContext';
import { MusicSearchProvider } from '../context/MusicSearchContext';
import "../styles/Biblioteca.css";

const Biblioteca = () => {
  return (
    <MusicPlayerProvider>
      <MusicSearchProvider>
      <div className="page-bib">
        <TopBar />
        <main className="bib-content">
          <h1>Biblioteca</h1>
        </main>
        <BottomBar />
      </div>
      </MusicSearchProvider>
    </MusicPlayerProvider>
  );
};

export default Biblioteca;


