const students = [
  { name: "Alice", age: 20, grade: 85, major: "Computer Science" },
  { name: "Bob", age: 21, grade: 92, major: "Mathematics" },
  { name: "Charlie", age: 19, grade: 78, major: "Computer Science" },
  { name: "Diana", age: 22, grade: 95, major: "Physics" },
  { name: "Eve", age: 20, grade: 88, major: "Computer Science" },
];

// Your code here (hint: use template literals)
//chain filter, toSorted, and map: filter for Computer Science majors,
// sort by grade (lowest first), then format as "<p><strong>NAME:</strong> GRADE (MAJOR)</p>

function filCsMajor(students) {
  return students.major === "Computer Science";
}

const csMajor = students.filter(filCsMajor);

//console.log(csMajor);

const lowHi = csMajor.toSorted((a, b) => a.grade - b.grade);

// console.log(lowHi);

function stuNames(students) {
  return `"<p><strong>${students.name}:</strong> ${students.grade} (${students.major})</p>"`;
}
const names = lowHi.map(stuNames);

console.log(names);
