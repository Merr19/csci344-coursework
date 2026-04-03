import React, { useState } from "react";

export default function Galleries({ galleries }){
    console.log(galleries);
    let [activeIndex, setActiveIndex] = useState(0);

    function switchGallery(idx){
        setActiveIndex(idx);
    }

    return (
        <>
            {
                //function that takes a single array object and returns some kind of data value
                galleries.map(function(gallery, idx){
                    return(
                        <button 
                            onClick={() => {
                            switchGallery(idx);
                         }}
                        >
                            {gallery.name} - {idx === activeIndex ? "active" : ""}
                            </button>
                    );
                })
            }
        </>
    );
}


