import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import "../styles/Biblioteca.css";

const Biblioteca = () => {
  return (
    <div className="page-bib">
      <TopBar />
      <main className="bib-content">
        <h1>Biblioteca</h1>
      </main>
      <BottomBar />
    </div>
  );
};

export default Biblioteca;


