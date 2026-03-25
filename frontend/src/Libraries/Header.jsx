import React from "react";
import "../Stylesheets/Header.css";
import logo from "../assets/logo.png"; // change name if needed

const Header = () => {
  return (
    <header className="header">
      <div className="header__container">
        <img src={logo} alt="Logo" className="header__logo" />
        <h1 className="header__title">AI Audio Detector</h1>
      </div>
    </header>
  );
};

export default Header;