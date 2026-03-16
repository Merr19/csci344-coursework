let searchTerm = "";
let openOnly = false;

console.log(courseList);

courseList.forEach(course => console.log(getInstructorString(course)));

function getInstructorString(course)
{
    return course.Instructors.map((instructor) => instructor.Name,).join (", ");
}

function isClassFull(course) {
    // Return true if course.Classification.Open === false
    return !course.Classification.Open;
}

function doesTermMatch(course) {
    // If searchTerm is empty, return true (show all courses)
    // Convert searchTerm to lowercase
    // Check if searchTerm appears in (all converted to lowercase):
    //   - course.Code
    //   - course.Title
    //   - course.CRN (convert to string first)
    //   - course.Instructors[].Name (use map to get all names, then join)
    // Use includes() for case-insensitive matching
    // Return true if searchTerm matches any of these fields
    if(searchTerm === "")
    {
        return true;
    }

    let instructorMatch = false;
    let titleMatch = false;
    let crnMatch = false;
    let codeMatch = false;

    searchTerm = searchTerm.toLowerCase();

    instructorMatch = getInstructorString(course).toLowerCase().includes(searchTerm);
    titleMatch = course.Title.toLowerCase().includes(searchTerm);
    crnMatch = course.CRN == searchTerm;
    codeMatch = course.Code.toLowerCase().includes(searchTerm);

    return (instructorMatch || titleMatch || crnMatch || codeMatch);
}

function dataToHTML(course) {
    // should return a formatted HTML card with the relevant course info
    // (using template literals). 
    return `
        <section class="course-card">
            <h2>${course.Code}: ${course.Title}</h2>
            <p class="status open">
                <i class="fa-solid fa-circle-check"></i>
                Open &bull; 10320 &bull; Seats Available: 14
            </p>
            <p>
                ${course.Days} &bull; ${course.Location.FullLocation} &bull; ${course.Hours} credit hour(s)
            </p>
            <p>
                <strong>${getInstructorString(course)}</strong>
            </p>
        </section>
    `;
}

function getOpenClosedHTML(course)
{
    if(isClassFull(course))
    {
        return`<p class="status Closed">
                <i class="fa-solid fa-circle-xmark"></i>
                Closed &bull; 10320 &bull; Num on Waitlist: ${course.WaitlistAvailable}
                </p>`;
    } 
    else
    {
        return`<p class="status open">
                <i class="fa-solid fa-circle-check"></i>
                Open &bull; 10320 &bull; Seats Available: ${course.EnrollmentMax - course.EnrollmentCurrent}
                </p>`;
    }
}

function showMatchingCourses() {
    // 1. Get the .courses container element
    // 2. Clear it
    // 3. Start with courseList (from course-data.js)
    // 4. Apply the filters and store the matched courses in a variable
    // 5. If no courses match, display "No courses match your search." and return
    // 6. Output each course to the .courses container (forEach + insertAdjacentHTML)
    const containerEl = document.querySelector('.courses');

    containerEl.innerHTML = "";

    let matchingCourses = courseList.filter(doesTermMatch);
    if(openOnly)
    {
        matchingCourses = matchingCourses.filter(course => !isClassFull(course));
    }

    if(matchingCourses.length === 0)
    {
        containerEl.innerHTML = "No courses match your search.";
        return;
    }

    matchingCourses.forEach(course =>
    {
        const htmlSnippet = dataToHTML(course);
        containerEl.insertAdjacentHTML("beforeend", htmlSnippet);
    });
}

function filterCourses() {
    // Update global variables (searchTerm and openOnly) by
    // reaching into the DOM and retrieving their values
    // Invoke the showMatchingCourses() function
    searchTerm = document.querySelector('#search_term').value;
    openOnly = document.querySelector('#is_open').checked;

    showMatchingCourses()
}

// show all courses initially:
showMatchingCourses();