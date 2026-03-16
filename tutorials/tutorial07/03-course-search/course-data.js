// https://meteor.unca.edu/registrar/class-schedules/api/v1/courses/2025/fall/
const courseList = [
    {
    "CRN": 10320,
    "Code": "CSCI 183.001",
    "Department": "CSCI",
    "Title": "Intro to Programming: Data Science",
    "Instructors": [
        {
        "Username": "msarris",
        "Name": "Sarris, Michael"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T13:30:00Z",
    "EndTime": "2019-05-07T14:45:00Z",
    "Location": {
        "FullLocation": "ZEI 201",
        "Building": "ZEI",
        "Room": "201"
    },
    "EnrollmentCurrent": 8,
    "EnrollmentMax": 22,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10313,
    "Code": "CSCI 185.001",
    "Department": "CSCI",
    "Title": "Intro to Programming: Web Development",
    "Instructors": [
        {
        "Username": "frashid",
        "Name": "Rashid, Farzana"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T15:00:00Z",
    "EndTime": "2019-05-07T16:15:00Z",
    "Location": {
        "FullLocation": "ZEI 201",
        "Building": "ZEI",
        "Room": "201"
    },
    "EnrollmentCurrent": 20,
    "EnrollmentMax": 22,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10322,
    "Code": "CSCI 201.001",
    "Department": "CSCI",
    "Title": "Intro to Object-Oriented Programming",
    "Instructors": [
        {
        "Username": "arashid",
        "Name": "Rashid, Zubayr"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T16:30:00Z",
    "EndTime": "2019-05-07T17:45:00Z",
    "Location": {
        "FullLocation": "ZEI 201",
        "Building": "ZEI",
        "Room": "201"
    },
    "EnrollmentCurrent": 12,
    "EnrollmentMax": 22,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10410,
    "Code": "CSCI 201.002",
    "Department": "CSCI",
    "Title": "Intro to Object-Oriented Programming",
    "Instructors": [
        {
        "Username": "arashid",
        "Name": "Rashid, Zubayr"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T18:00:00Z",
    "EndTime": "2019-05-07T19:15:00Z",
    "Location": {
        "FullLocation": "ZEI 201",
        "Building": "ZEI",
        "Room": "201"
    },
    "EnrollmentCurrent": 13,
    "EnrollmentMax": 22,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10132,
    "Code": "CSCI 202.001",
    "Department": "CSCI",
    "Title": "Intro to Data Structures",
    "Instructors": [
        {
        "Username": "awhitley",
        "Name": "Whitley, Adam"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T13:30:00Z",
    "EndTime": "2019-05-07T14:45:00Z",
    "Location": {
        "FullLocation": "ZEI 203",
        "Building": "ZEI",
        "Room": "203"
    },
    "EnrollmentCurrent": 23,
    "EnrollmentMax": 30,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10323,
    "Code": "CSCI 235.001",
    "Department": "CSCI",
    "Title": "Systems I",
    "Instructors": [
        {
        "Username": "msarris",
        "Name": "Sarris, Michael"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T15:00:00Z",
    "EndTime": "2019-05-07T16:15:00Z",
    "Location": {
        "FullLocation": "WHI 008",
        "Building": "WHI",
        "Room": "008"
    },
    "EnrollmentCurrent": 24,
    "EnrollmentMax": 30,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11072,
    "Code": "CSCI 273.001",
    "Department": "CSCI",
    "Title": "ST: Python Programming",
    "Instructors": [
        {
        "Username": "ksanft",
        "Name": "Sanft, Kevin"
        }
    ],
    "Hours": 3,
    "Days": "TR",
    "StartTime": "2019-05-07T19:15:00Z",
    "EndTime": "2019-05-07T20:55:00Z",
    "Location": {
        "FullLocation": "ZEI 203",
        "Building": "ZEI",
        "Room": "203"
    },
    "EnrollmentCurrent": 12,
    "EnrollmentMax": 15,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11131,
    "Code": "CSCI 273.H01",
    "Department": "CSCI",
    "Title": "HONORS: ST: Python Programming",
    "Instructors": [
        {
        "Username": "ksanft",
        "Name": "Sanft, Kevin"
        }
    ],
    "Hours": 3,
    "Days": "TR",
    "StartTime": "2019-05-07T19:15:00Z",
    "EndTime": "2019-05-07T20:55:00Z",
    "Location": {
        "FullLocation": "ZEI 203",
        "Building": "ZEI",
        "Room": "203"
    },
    "EnrollmentCurrent": 3,
    "EnrollmentMax": 15,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": true,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10321,
    "Code": "CSCI 280.001",
    "Department": "CSCI",
    "Title": "Computer Science Seminar",
    "Instructors": [
        {
        "Username": "kbogert",
        "Name": "Bogert, Kenneth"
        }
    ],
    "Hours": 1,
    "Days": "M",
    "StartTime": "2019-05-07T13:30:00Z",
    "EndTime": "2019-05-07T14:45:00Z",
    "Location": {
        "FullLocation": "RRO 217",
        "Building": "RRO",
        "Room": "217"
    },
    "EnrollmentCurrent": 17,
    "EnrollmentMax": 25,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10339,
    "Code": "CSCI 313.001",
    "Department": "CSCI",
    "Title": "Virtual Reality",
    "Instructors": [
        {
        "Username": "kbogert",
        "Name": "Bogert, Kenneth"
        }
    ],
    "Hours": 4,
    "Days": "TR",
    "StartTime": "2019-05-07T17:20:00Z",
    "EndTime": "2019-05-07T19:00:00Z",
    "Location": {
        "FullLocation": "KAR 037",
        "Building": "KAR",
        "Room": "037"
    },
    "EnrollmentCurrent": 10,
    "EnrollmentMax": 10,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11024,
    "Code": "CSCI 329.001",
    "Department": "CSCI",
    "Title": "Big Data Analytics",
    "Instructors": [
        {
        "Username": "brahimia",
        "Name": "Rahimi Ardabili, Babak"
        }
    ],
    "Hours": 3,
    "Days": "MW",
    "StartTime": "2019-05-07T19:30:00Z",
    "EndTime": "2019-05-07T20:45:00Z",
    "Location": {
        "FullLocation": "ONLINE ONLINE",
        "Building": null,
        "Room": null
    },
    "EnrollmentCurrent": 16,
    "EnrollmentMax": 17,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "Online - Synchronous",
    "Async": false
    },
    {
    "CRN": 10525,
    "Code": "CSCI 333.001",
    "Department": "CSCI",
    "Title": "Algorithms",
    "Instructors": [
        {
        "Username": "awhitley",
        "Name": "Whitley, Adam"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T15:00:00Z",
    "EndTime": "2019-05-07T16:15:00Z",
    "Location": {
        "FullLocation": "ZEI 203",
        "Building": "ZEI",
        "Room": "203"
    },
    "EnrollmentCurrent": 16,
    "EnrollmentMax": 22,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10324,
    "Code": "CSCI 338.001",
    "Department": "CSCI",
    "Title": "Software Engineering",
    "Instructors": [
        {
        "Username": "frashid",
        "Name": "Rashid, Farzana"
        }
    ],
    "Hours": 3,
    "Days": "TR",
    "StartTime": "2019-05-07T13:55:00Z",
    "EndTime": "2019-05-07T15:35:00Z",
    "Location": {
        "FullLocation": "RRO 217",
        "Building": "RRO",
        "Room": "217"
    },
    "EnrollmentCurrent": 13,
    "EnrollmentMax": 25,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11074,
    "Code": "CSCI 339.001",
    "Department": "CSCI",
    "Title": "Topics in AI/Machine Learning: Artificial Intelligence",
    "Instructors": [
        {
        "Username": "mcameron",
        "Name": "Cameron, Marietta"
        }
    ],
    "Hours": 3,
    "Days": "TR",
    "StartTime": "2019-05-07T12:00:00Z",
    "EndTime": "2019-05-07T13:40:00Z",
    "Location": {
        "FullLocation": "ONLINE ONLINE",
        "Building": null,
        "Room": null
    },
    "EnrollmentCurrent": 17,
    "EnrollmentMax": 20,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "Online - Synchronous",
    "Async": false
    },
    {
    "CRN": 10265,
    "Code": "CSCI 344.001",
    "Department": "CSCI",
    "Title": "Advanced Web Technology",
    "Instructors": [
        {
        "Username": "svanwart",
        "Name": "Van Wart, Sarah"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T18:00:00Z",
    "EndTime": "2019-05-07T19:15:00Z",
    "Location": {
        "FullLocation": "WHI 008",
        "Building": "WHI",
        "Room": "008"
    },
    "EnrollmentCurrent": 16,
    "EnrollmentMax": 25,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10467,
    "Code": "CSCI 364.001",
    "Department": "CSCI",
    "Title": "Cybersecurity",
    "Instructors": [
        {
        "Username": "msarris",
        "Name": "Sarris, Michael"
        }
    ],
    "Hours": 3,
    "Days": "TR",
    "StartTime": "2019-05-07T17:20:00Z",
    "EndTime": "2019-05-07T19:00:00Z",
    "Location": {
        "FullLocation": "RRO 223",
        "Building": "RRO",
        "Room": "223"
    },
    "EnrollmentCurrent": 15,
    "EnrollmentMax": 18,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11075,
    "Code": "CSCI 373.001",
    "Department": "CSCI",
    "Title": "ST in CSCI: Industry Team Project",
    "Instructors": [
        {
        "Username": "svanwart",
        "Name": "Van Wart, Sarah"
        },
        {
        "Username": "ksanft",
        "Name": "Sanft, Kevin"
        }
    ],
    "Hours": 3,
    "Days": "TR",
    "StartTime": "2019-05-07T13:55:00Z",
    "EndTime": "2019-05-07T15:35:00Z",
    "Location": {
        "FullLocation": "WHI 117",
        "Building": "WHI",
        "Room": "117"
    },
    "EnrollmentCurrent": 9,
    "EnrollmentMax": 15,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11077,
    "Code": "CSCI 373.003",
    "Department": "CSCI",
    "Title": "ST: Community Digital Literacy and Tech Support",
    "Instructors": [
        {
        "Username": "ksanft",
        "Name": "Sanft, Kevin"
        }
    ],
    "Hours": 3,
    "Days": "W",
    "StartTime": "2019-05-07T13:30:00Z",
    "EndTime": "2019-05-07T16:15:00Z",
    "Location": {
        "FullLocation": "BUNC ",
        "Building": null,
        "Room": null
    },
    "EnrollmentCurrent": 6,
    "EnrollmentMax": 12,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "Off-Campus",
    "Async": false
    },
    {
    "CRN": 10319,
    "Code": "CSCI 431.001",
    "Department": "CSCI",
    "Title": "Org of Programming Languages",
    "Instructors": [
        {
        "Username": "frashid",
        "Name": "Rashid, Farzana"
        }
    ],
    "Hours": 3,
    "Days": "MWF",
    "StartTime": "2019-05-07T18:00:00Z",
    "EndTime": "2019-05-07T19:15:00Z",
    "Location": {
        "FullLocation": "ZEI 203",
        "Building": "ZEI",
        "Room": "203"
    },
    "EnrollmentCurrent": 17,
    "EnrollmentMax": 20,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11025,
    "Code": "CSCI 441.001",
    "Department": "CSCI",
    "Title": "Numerical Analysis",
    "Instructors": [
        {
        "Username": "kyang2",
        "Name": "Yang, Kitty"
        }
    ],
    "Hours": 3,
    "Days": "MW",
    "StartTime": "2019-05-07T15:00:00Z",
    "EndTime": "2019-05-07T16:15:00Z",
    "Location": {
        "FullLocation": "RRO 211",
        "Building": "RRO",
        "Room": "211"
    },
    "EnrollmentCurrent": 4,
    "EnrollmentMax": 10,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10330,
    "Code": "CSCI 480.001",
    "Department": "CSCI",
    "Title": "Capstone I",
    "Instructors": [
        {
        "Username": "kbogert",
        "Name": "Bogert, Kenneth"
        }
    ],
    "Hours": 2,
    "Days": "WF",
    "StartTime": "2019-05-07T13:30:00Z",
    "EndTime": "2019-05-07T14:45:00Z",
    "Location": {
        "FullLocation": "RRO 217",
        "Building": "RRO",
        "Room": "217"
    },
    "EnrollmentCurrent": 15,
    "EnrollmentMax": 20,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10340,
    "Code": "CSCI 481.001",
    "Department": "CSCI",
    "Title": "Capstone II",
    "Instructors": [
        {
        "Username": "kbogert",
        "Name": "Bogert, Kenneth"
        }
    ],
    "Hours": 2,
    "Days": "MF",
    "StartTime": "2019-05-07T16:30:00Z",
    "EndTime": "2019-05-07T17:45:00Z",
    "Location": {
        "FullLocation": "RRO 217",
        "Building": "RRO",
        "Room": "217"
    },
    "EnrollmentCurrent": 19,
    "EnrollmentMax": 20,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 10442,
    "Code": "CSCI 481.002",
    "Department": "CSCI",
    "Title": "Capstone II",
    "Instructors": [
        {
        "Username": "kbogert",
        "Name": "Bogert, Kenneth"
        }
    ],
    "Hours": 2,
    "Days": "WF",
    "StartTime": "2019-05-07T16:30:00Z",
    "EndTime": "2019-05-07T17:45:00Z",
    "Location": {
        "FullLocation": "RRO 217",
        "Building": "RRO",
        "Room": "217"
    },
    "EnrollmentCurrent": 11,
    "EnrollmentMax": 20,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": true
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11196,
    "Code": "CSCI 499.001",
    "Department": "CSCI",
    "Title": "UGR in CSCI: Data Analytics *Permission of Instructor",
    "Instructors": [
        {
        "Username": "ksanft",
        "Name": "Sanft, Kevin"
        }
    ],
    "Hours": 3,
    "Days": null,
    "StartTime": null,
    "EndTime": null,
    "Location": {
        "FullLocation": null,
        "Building": null,
        "Room": null
    },
    "EnrollmentCurrent": 1,
    "EnrollmentMax": 5,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    },
    {
    "CRN": 11198,
    "Code": "CSCI 499.003",
    "Department": "CSCI",
    "Title": "UGR in CSCI: Generative AI *Permission of Instructor",
    "Instructors": [
        {
        "Username": "awhitley",
        "Name": "Whitley, Adam"
        }
    ],
    "Hours": 2,
    "Days": null,
    "StartTime": null,
    "EndTime": null,
    "Location": {
        "FullLocation": null,
        "Building": null,
        "Room": null
    },
    "EnrollmentCurrent": 1,
    "EnrollmentMax": 5,
    "WaitlistMax": 0,
    "WaitlistAvailable": 0,
    "TermPart": "1",
    "StartDate": "2026-01-12T05:00:00Z",
    "EndDate": "2026-05-06T04:00:00Z",
    "Classification": {
        "AmericanDemocracy": false,
        "DiversityIntensive": false,
        "DiversityIntensiveR": false,
        "DistanceLearning": false,
        "FirstYearSeminar": false,
        "Graduate": false,
        "Honors": false,
        "Arts": false,
        "ServiceLearning": false,
        "Open": false
    },
    "AdditionalMeetings": [],
    "InstructionalMethod": "In-Person",
    "Async": false
    }
];