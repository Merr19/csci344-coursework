import React, { useState, useEffect } from "react";
import Carousel from "./Carousel";
import "./App.css";
import Galleries from "./Galleries";

export default function App() {

    let [activeIndex, setActiveIndex] = useState(0);

    let [photos, setPhotos] = useState([]);

    async function getFlickrPhotos() {
        //extract the correct endpoint (cats, birds) using the activeindex
        const url = galleries[activeIndex].endpoint;

        //then ge to the internet and get the http response
        const response = await fetch(url);

        //get json data from http reponse
        const arrOfObjects = await response.json();
        const arrOfStrings = arrOfObjects.map(obj => obj.img_url);
        console.log(arrOfStrings);
        setPhotos(arrOfStrings);
    }

    //wrap the any funcs that have side effects in a useEffect hook
    useEffect(() => {
        getFlickrPhotos();
    }, [activeIndex]); //in the array (second argument, list variables that when chnaged should re-trigger the side effects function)

    const galleries = [
    {
        name: "Cats",
        endpoint: "https://www.apitutor.org/flickr/simple/?tags=cat"
    },
    {
        name: "Dogs",
        endpoint: "https://www.apitutor.org/flickr/simple/?tags=dog"
    },
    {
        name: "Birds",
        endpoint: "https://www.apitutor.org/flickr/simple/?tags=bird"
    },
    {
        name: "Lillies",
        endpoint: "https://www.apitutor.org/flickr/simple/?tags=lillies"
    },
    {
        name: "Bears",
        endpoint: "https://www.apitutor.org/flickr/simple/?tags=bear"
    }
    ];

    return (
        <div>
            <h1>This is a Gallery of Photos</h1>
            <Galleries 
                galleries={galleries} 
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
            />

            < Carousel photos={photos} />

        </div>
    );
}
