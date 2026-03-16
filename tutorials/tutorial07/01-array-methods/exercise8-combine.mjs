const students = [
    { name: "Alice", age: 20, grade: 85, major: "Computer Science" },
    { name: "Bob", age: 21, grade: 92, major: "Mathematics" },
    { name: "Charlie", age: 19, grade: 78, major: "Computer Science" },
    { name: "Diana", age: 22, grade: 95, major: "Physics" },
    { name: "Eve", age: 20, grade: 88, major: "Computer Science" }
];

// Your code here
//only want CS students w/ grade greater= 85 using both map and filter

function csStudent(students)
{
    if (students.grade >= 85 && students.major === 'Computer Science')
    {
        return students.name;
    }
}

const csStus = students.filter(csStudent);

function stuNames(students)
{
    return students.name;
}
const theStus = csStus.map(stuNames);

console.log(theStus);


