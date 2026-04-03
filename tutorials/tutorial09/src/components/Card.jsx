import React from "react";
import "./Card.css";

export default function Card({ name, image_url, description }) {
  return (
    <section className="card">
      <img src={image_url} alt={name} className="card-image" />
      <h2 className="card-title">{name}</h2>
      <p className="card-description">{description}</p>
    </section>
  );
}