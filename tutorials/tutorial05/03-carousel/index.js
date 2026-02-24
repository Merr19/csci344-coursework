let currentPosition = 0; //keeps track of pic is visable
let gap = 10; //space between the pics
const slideWidth = 400; //width of the pics

function moveCarousel(direction) { //moving forward or backwards!
    const items = document.querySelectorAll(".carousel-item"); //element selection

//moving forward? move the two slides left, return false STOP when u reach the end!, and currentpostition++ increment 1
    if (direction == "forward") { 
        // minus 2 b/c first 2 slides already showing
        if (currentPosition >= items.length - 2) {
            return false;
        }
        currentPosition++;

//Move backwards! currentPos are we at the 1st slide?, return false = stop cant move any futher, currentpos-- move back 1
    } else {
        if (currentPosition == 0) {
            return false;
        }
        currentPosition--;
    }

//variables for width and gaps between pics, horizontal offset!
    const offset = (slideWidth + gap) * currentPosition;

//loops thru the pics, move each slide horizontally!
    for (const item of items) {
        item.style.transform = `translateX(-${offset}px)`;
    }
}
