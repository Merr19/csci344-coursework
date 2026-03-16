const fruits1 = ["apple", "banana"];
const fruits2 = ["orange", "grape"];

// Use spread operator to combine both arrays into a new array
// Print the result: console.log(allFruits);

const allFruits = [...fruits1, ...fruits2];

console.log(allFruits);

//runs fine with the run button on VS code but it wont work with the node command
