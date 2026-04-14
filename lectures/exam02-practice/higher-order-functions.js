const fruitList = [
        {
            name: "apple",
            color: "RED"
        },
        {
            name: "banana",
            color: "yellow"
        },
        {
            name: "orange",
            color: "orange"
        },
        {
            name: "grape",
            color: "purple"
        },
        {
            name: "watermelon",
            color: "red"
        }
];

console.log(fruitList);

//callback function
function doSomethingToEveryItem(item){
    console.log(`${item.name} - ${item.color}`);
}

// const result = fruitList.forEach(doSomethingToEveryItem);
// console.log(result);

function goodMapCallBackFunction(item){
    return ` <section style="background:${item.color}>
                ${item.name}
            </section>`
}

// const result = fruitList.map(goodMapCallBackFunction);
// console.log(result);

//write some code that filters the original array that only return fruit objs that are red

// function redOnly(item){
//     return item.color.toLowerCase() === "red";
// }

//rewrite as an arrow func
const redOnly = item => item.color.toLowerCase() === "red";

const redFruitHTML = fruitList.filter(redOnly).map(toHTML);
console.log(redFruitHTML);