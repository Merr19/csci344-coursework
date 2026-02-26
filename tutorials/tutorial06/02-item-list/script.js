
//array!
const items = ['cat', 'dog', 'bunny', 'fox', 'fish'];
const itemsList = document.querySelector('#itemList');

//functions!
function displayItems()
{
    itemsList.innerHTML = '';

    for (let i = 0; i < items.length; i++)
    {
        itemsList.innerHTML += `<li>${items[i]}</li>`;
    }
}

//call displayItems!
displayItems();