
//global variables!
let count = 0
const counterDis = document.querySelector('#counter')
const incBtn = document.querySelector('#incrementBtn')
const decBtn = document.querySelector('#decrementBtn')
const resetBtn = document.querySelector('#resetBtn')

//functions!
function increment()
{
    count++;
    updateDisplay();
}

function decrement()
{
    count--;
    updateDisplay();
}

function reset()
{
    count = 0;
    updateDisplay();
}

function updateDisplay()
{
    counterDis.textContent = count;

    if (count > 0)
    {
        counterDis.style.color = '#4CAF50';
    }

    else if (count < 0)
    {
        counterDis.style.color = '#f44336';
    }

    else if(count === 0)
    {
        counterDis.style.color = '#666';
    }

}

//event listeners!
incBtn.addEventListener('click', increment);
decBtn.addEventListener('click', decrement);
resetBtn.addEventListener('click', reset);

//call updateDisplay!
updateDisplay();