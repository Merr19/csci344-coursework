const basicInfo = { name: "Diana", age: 22 };
const contactInfo = { email: "diana@example.com", phone: "555-1234" };

// Use spread operator to merge both objects into a new object
// Print the result: console.log(merged);

const merged = { ...basicInfo, ...contactInfo };

console.log(merged);

//one line ver
console.log(
  `{ name: '${merged.name}', age: ${merged.age}, email: '${merged.email}', phone: '${merged.phone}' }`,
);
