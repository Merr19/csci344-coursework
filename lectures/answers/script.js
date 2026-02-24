// Exercise 1: Function Declaration
function createTodoItemHTML(text) {
    return `<li>${text}</li>`;
}

// Exercise 2: Arrow Function
// Option 1: With curly braces
const createTodoItemHTML2 = (text) => {
    return `<li>${text}</li>`;
};

// Option 2: Implicit return (shorter)
const createTodoItemHTML3 = (text) => `<li>${text}</li>`;

// Exercise 3: Function That Returns a Value
function cleanTodoText(text) {
    const cleaned = text.trim();
    if (cleaned === '') {
        return '';
    }
    return cleaned;
}

// Exercise 4: Functions That Call Other Functions
function addTodo(text) {
    const cleaned = cleanTodoText(text);
    if (cleaned === '') {
        return false;
    }
    
    const html = createTodoItemHTML(cleaned);
    const todoList = document.querySelector('#todoList');
    todoList.insertAdjacentHTML('beforeend', html);
    return true;
}

// Exercise 5: Default Parameters
function createTodoItemHTML(text, className = 'todo-item') {
    return `<li class="${className}">${text}</li>`;
}

// Exercise 6: Function Scope
let todoCount = 0;

function addTodoWithCount(text) {
    addTodo(text);

    // Update the counter and display:
    todoCount++;
    const counterElement = document.querySelector('#todoCount');
    counterElement.textContent = `Todos: ${todoCount}`;
    console.log("Todo count:", todoCount);
}

// Exercise 7: Event Handlers as Functions
function handleAddClick() {
    const input = document.querySelector('#todoInput');
    const text = input.value;
    addTodoWithCount(text);
    // Clear the input field:
    input.value = '';
}

// Attach event handler
const addButton = document.querySelector('#addBtn');
addButton.addEventListener('click', handleAddClick);

// Test functions (commented out - uncomment to test)
// Exercise 1 & 2 tests:
// const todoList = document.querySelector('#todoList');
// const html1 = createTodoItemHTML("Buy groceries");
// todoList.insertAdjacentHTML('beforeend', html1);
// const html2 = createTodoItemHTML("Finish homework");
// todoList.insertAdjacentHTML('beforeend', html2);
// const html3 = createTodoItemHTML("Call mom");
// todoList.insertAdjacentHTML('beforeend', html3);

// Exercise 3 tests:
// console.log(cleanTodoText("  Buy groceries  "));  // Should return "Buy groceries"
// console.log(cleanTodoText(""));                   // Should return ""
// console.log(cleanTodoText("Finish homework"));    // Should return "Finish homework"

// Exercise 4 tests:
// addTodo("  Buy groceries  ");  // Should add "Buy groceries"
// addTodo("");                    // Should not add anything
// addTodo("Finish homework");     // Should add "Finish homework"

// Exercise 5 tests:
// const todoList = document.querySelector('#todoList');
// const html1 = createTodoItemHTML("Buy groceries");                    // Uses default 'todo-item'
// const html2 = createTodoItemHTML("Important task", "todo-item-urgent"); // Uses custom class
// todoList.insertAdjacentHTML('beforeend', html1);
// todoList.insertAdjacentHTML('beforeend', html2);

// Exercise 6 tests:
// addTodoWithCount("Buy groceries");
// addTodoWithCount("Finish homework");
// addTodoWithCount("Call mom");
// console.log("Total todos:", todoCount);  // Should print 3
