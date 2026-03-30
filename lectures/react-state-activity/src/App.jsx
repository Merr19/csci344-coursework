import React, {useState} from "react";
import Carousel from "./Carousel";
import "./App.css";
import "./Galleries";

export default function App() {
    const photos = [
        {
            name: "Nature",
            photos: [
                "https://picsum.photos/id/164/600/430",
                "https://picsum.photos/id/116/600/430",
                "https://picsum.photos/id/182/600/430"
        ]
        },
        {
            name:"City",
            photos: [
                "https://picsum.photos/id/127/600/430",
                "https://picsum.photos/id/140/600/430",
                "https://picsum.photos/id/141/600/430"
            ]
        },
        {
            name:"Animals",
            photos: [
                "https://picsum.photos/id/122/600/430",
                "https://picsum.photos/id/176/600/430",
                "https://picsum.photos/id/196/600/430",
                "https://picsum.photos/id/190/600/430"
            ]
        }
    ];

    return (
        <div>
            <h1>This is a Gallery of Photos</h1>
            <Galleries
            <Carousel photos={photos} />
        </div>
    );
}
