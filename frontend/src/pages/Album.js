import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import "../styles/Album.css";

const Album = () => {
  return (
    <div className="page-album">
      <TopBar />
      <main className="album-content">
        <h1>Álbumes</h1>
      </main>
      <BottomBar />
    </div>
  );
};

export default Album;

