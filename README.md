# GUC_Staff_Portal
Web portal for GUC staff members

DEPLOYED WEBSITE: https://guc-staff-portal.netlify.app/

To run backend 
run
npm install
npm start

.env file should be added and includes the following:

MONGODB_URI = mongo connection string
AUTH_ACCESS_TOKEN_SECRET = any secret
AUTH_REFRESH_TOKEN_SECRET = any secret
AUTH_ACCESS_TOKEN_AGE = 300
AUTH_REFRESH_TOKEN_AGE = 28800
MAIL_FORMAT = ^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$

- Notes:
    - The current user id is known from the token, not entered in the request body as well as his/her role.
    - Authentication based on the token

- Functionalities:

#### Functionality: Reset the database
    - Route: /reset
    - Request type: POST
    - Request body: { "reset": true }
    - Response: Message indicating if the reset was done or not.
    - Example of response: "Reset done successfully."
    - Notes: In order to have initial access to the system this route also saves a default user "hr-1" in the database, with email "user@guc.edu.eg" and the deafult password "123456". It also saves a room "C7.305" which is the users's office as it is a required field.

#### Functionality: Log in to the system
    - Route: /staff/login
    - Request type: POST
    - Request body: { "email": "user@guc.edu.eg", "password": "123456" }
    - Response: Message indicating if the user entered the correct data and logged in successfully.
    - Example of response: "Logged in successfully."

#### Functionality: Log out from the system
    - Route: /staff/logout
    - Request type: POST
    - Response: Message indicating that the user logged out successfully.
    - Example of response: "Logged out successfully."

#### Functionality: Reset the password of the user
    - Route: /reset-password
    - Request type: PUT
    - Request body: { "oldPassword": "123456", "newPassword": "guc" . "confirmedNewPassword": "guc"}
    - Response: Redirect to the login page if the password changed successfully, if not then a message indicating the error that happened.
    - Notes: This is used to change the user's password in general and also to reset the password on first login.

#### Functionality: Sign in to the campus (entering the campus)
    - Route: /campus/sign-in
    - Request type: POST
    - Request body: {"user":"hr-1"}
    - Response: An object containing the sign in record
    - Example of response: {
        "user": "hr-1",
        "signInTime": "2020-12-11T13:35:41.449Z",
        "signOutTime": null,
    }

#### Functionality: Sign out from the campus (leaving the campus)
    - Route: /campus/sign-out
    - Request type: POST
    - Request body: {"user":"hr-1"}
    - Response: An object containing the sign out record
    - Example of response: {
        "user": "hr-1",
        "signInTime": "2020-12-11T13:35:41.449Z",
        "signOutTime": "2020-12-11T16:45:31.429Z",
    }
#### Functionality: staff members view their profile
    - Route: /staff/view-profile
    - Request type: GET
    - Response: object containing academic member's profile information

#### Functionality: View attendance records
    - Route: /staff/view-attendance-records
    - Request type: GET
    - Request query: "month": 12, "year": 2020
    - Response: An array of the user's records
    - Example of response: [{
        "_id": "5fe5ea9f6e62410e64e6ca7a",
        "user": "hr-1",
        "signInTime": "2020-12-11T13:35:27.563Z",
        "signOutTime": null,
        "__v": 0
    },
    {
        "_id": "5fe5eaad6e62410e64e6ca7c",
        "user": "hr-1",
        "signInTime": null,
        "signOutTime": "2020-12-11T13:35:41.449Z",
        "__v": 0
    }]

#### Functionality: View missing days
    - Route: /staff/view-missing-days
    - Request type: GET
    - Request query: "month": 12, "year": 2020
    - Response: An array of the days that the user missed
    - Example of response: ["2020-12-25T00:00:00.000Z", "2020-12-27T00:00:00.000Z"]

#### Functionality: View missing and extra hours
    - Route: /staff/view-hours
    - Request type: GET
    - Request query: "month": 12, "year": 2020
    - Response: An object containing the missing hours and the extra hours
    - Example of response: {"missingHours":10, "extraHours":0}

#### Functionality: View updated salary
    - Route: /staff/view-salary
    - Request type: GET
    - Request query: "month": 12, "year": 2020
    - Response: An object containing the base salary and the calculated salary
    - Example of response: {"baseSalary":1000, "calculatedSalary":400}

#### Functionality: staff members update their profile
    - Route: /staff/update-profile
    - Request type: PUT
    -Request body: {"email", "office", "facebook", "github", "linkedin"}
    - Response: Message indicaf=ting that the profile was updated successfully

#### Functionality: Get HR members (hr member)
    - Route: /hr/get-hr-members
    - Request type: GET
    - Response: A list of HR members
    - Example of the response:[{ "id": "hr-2", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }]

#### Functionality: Add an HR member (hr member)
    - Route: /hr/add-hr-member
    - Request type: POST
    - Request body: { "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }
    - Response: A message indicating if the hr member entered the data correctly and the hr member was added successfuly.
    - Example of the response: The added member: { "id": "hr-2", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }

#### Functionality: Update an already existing HR member (hr member)
    - Route: /hr/update-hr-member/:id
    - Request type: PUT
    - Request body: {"name": "Ali Elshamy", "email": "mm1@gmail.com", "password": "121212", "office": "C5.101", "salary": 20000 }
    - //The updated info of the member
    - Response: A message indicating if the hr member entered the data correctly and the hr member was updated successfuly.
    - Example of the response: The updated member: { "id": "hr-2", "name": "Ali Elshamy", "email": "mm1@gmail.com", "password": "121212", "office": "C5.101", "salary": 20000 }

#### Functionality: Delete an already existing hr member (hr member)
    - Route: /hr/delete-hr-member/:id
    - Request type: DELETE
    - Response: A message indicating if the hr member entered the data correctly and the hr member was deleted successfuly.
    - Example of the response: The deleted member: { "id": "hr-2", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }

#### Functionality: Get Academic members (hr member)
    - Route: /hr/get-academic-members
    - Request type: GET
    - Response: A list of Academic members
    - Example of the response:[{ "id": "ac-2", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }]

#### Functionality: Add an academic member (hr member)
    - Route: /hr/add-academic-member
    - Request type: POST
    - Request body: { "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000, "role": "Head Of Department", "dayOff": "Monday" }
    - The info for the academic member
    - Response: A message indicating if the hr member entered the data correctly and the academic member was added successfuly.
    - Example of the response: The added member: { "id": "ac-1", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000,
    - "role": "Head Of Department", "dayOff": "Monday" }

#### Functionality: Update an already existing academic member (hr member)
    - Route: /hr/update-academic-member/:id
    - Request type: PUT
    - Request body: {"name": "Omar", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000, "gender": "MALE", "role": "Head Of Department", "dayOff": "Monday" }
    - //The updated info of the member
    - Response: A message indicating if the hr member entered the data correctly and the academic member was updated successfuly.
    - Example of the response: The updated member: { "id": "hr-2", "name": "Omar", "email": "mm1@gmail.com", "password": "121212", "office": "C5.101", "salary": 20000 }

#### Functionality: Delete already existing academic members (hr member)
    - Route: /hr/delete-academic-member/:id
    - Request type: DELETE
    - Response: A message indicating if the hr member entered the data correctly and the academic member was deleted successfuly.
    - Example of the response: The deleted member: { "id": "hr-2", "name": "Omar", "email": "mm1@gmail.com", "password": "121212","gender": "MALE", "office": "C5.101", "salary": 20000 }

#### Functionality: Get Rooms (hr member)
    - Route: /hr/get-rooms
    - Request type: GET
    - Response: A list of rooms
    - Example of the response:[{ "name": "C7.201", "capacity": 25, "type": "Lab" }]

#### Functionality: Add a room (hr member)
    - Route: /hr/add-room.
    - Request type: POST
    - Request body: { "name": "C7.201", "capacity": 25, "type": "Lab" } //The info of the room
    - Response: A message indicating if the hr member entered the data correctly and the room was added successfuly.
    - Example for the response: The saved room: { "name": "C7.201", "capacity": 25, "type": "Lab" }

#### Functionality: Update a room (hr member)
    - Route: /hr/update-room/:room
    - Request type: PUT
    - Request body:  { "name": "C7.201", "capacity": 20, "type": "Tutorial" }
    - // The updated info of the room
    - Response: A message indicating if the hr member entered the data correctly and the room was updated successfuly.
    - Example for the response: The saved room after updating it: { "name": "C7.202", "capacity": 20, "type": "Tutorail" }

#### Functionality: Delete a location (hr member)
    - Route: /hr/delete-room/:room
    - Request type: DELETE
    - Response: A message indicating if the hr member entered the data correctly and the room was deleted successfuly.
    - Example for the response: The deleted room: { "name": "C7.202", "capacity": 20, "type": "Tutorail" }

#### Functionality: Get Faculties (hr member)
    - Route: /hr/get-faculties
    - Request type: GET
    - Response: A list of faculties
    - Example of the response:[{ "name": "Engineering" }, { "name": "Pharmacy" }]

#### Functionality: Add a faculty (hr member)
    - Route: /hr/add-faculty
    - Request type: POST
    - Request body: { "name": "Engineering" }
    - //The name of the faculty
    - Response: A message indicating if the hr member entered the data correctly and the faculty was updated successfuly.
    - Example for the response: The added faculty: { "name": "Engineering" }

#### Functionality: Update a faculty (hr member)
    - Route: /hr/update-faculty/:faculty
    - Request type: PUT
    - Request body: { "name": "ENG" }
    - //The new name of the faculty to be updated
    - Response: A message indicating if the hr member entered the data correctly and the faculty was updated successfuly.
    - Example for the response: The updated faculty: { "name": "ENG" }.

#### Functionality: Delete a faculty (hr member)
    - Route: /hr/delete-faculty/:faculty
    - Request type: DELETE
    - Response: A message indicating if the hr member entered the data correctly and the faculty was deleted successfuly.
    - Example for the response: The deleted faculty: { "name": "ENG" }

#### Functionality: Get Departments (hr member)
    - Route: /hr/get-departments
    - Request type: GET
    - Response: A list of departments
    - Example of the response:[{ "name": "MET", "faculty": "ENG" , "headOfDepartment": "ac-2" }]

#### Functionality: Add a department under a faculty (hr member)
    - Route: /hr/add-department
    - Request type: POST
    - Request body: { "name": "Computer Science", "faculty": "ENG" , "headOfDepartment": "ac-1" }
    - //the info needed. Only the name field is requied.
    - Response: A message indicating if the hr member entered the data correctly and the department was added successfuly.
    - Example of the response: The added department: { "name": "Computer Science", "faculty": "ENG" , "headOfDepartment": "ac-1" }.

#### Functionality: Update a department under a faculty (hr member)
    - Route: /hr/update-department/:department
    - Request type: PUT
    - Request body: { name": "MET", "headOfDepartment": "ac-2" }
    - //the updated info of the department
    - Response: A message indicating if the hr member entered the data correctly and the department was updated successfuly.
    - Example of the response: The updated department: { "name": "MET", "faculty": "ENG" , "headOfDepartment": "ac-2" }.

#### Functionality: Delete a department under a faculty (hr member)
    - Route: /hr/delete-department/department
    - Request type: DELETE
    - Response: A message indicating if the hr member entered the data correctly and the department was deleted successfuly.
    - Example of the response: The deleted department: { "name": "MET", "faculty": "ENG" , "headOfDepartment": "ac-2" }.

#### Functionality: Get Courses (hr member)
    - Route: /hr/get-courses
    - Request type: GET
    - Response: A list of courses
    - Example of the response:[{ "id": "CSEN709", "name": "Advanced Lab", "department": "MET" }]

#### Functionality: Add a course (hr member)
    - Route: /hr/add-course
    - Request type: POST
    - Request body: { "id": "CSEN702", "name": "Advanced Computing Lab", "department": "MET" }
    - //the info for the added course. Only the id and the name fields are required
    - Response: A message indicating if the hr member entered the data correctly and the course was added successfuly.
    - Example of the response: The added course: { "id": "CSEN702", "name": "Advanced Computing Lab", "department": "MET" }

#### Functionality: Update a course (hr member)
    - Route: /hr/update-course/:id
    - Request type: PUT
    - Request body: { "id": "CSEN702", "name": "Advanced Lab", "department": "MET"  }
    - //The updated info of the course
    - Response: A message indicating if the hr member entered the data correctly and the course was updated successfuly.
    - Example of the response: The updated course: { "id": "CSEN702", "name": "Advanced Lab", "department": "MET" }

#### Functionality: Delete a course (hr member)
    - Route: /hr/delete-course/:id
    - Request type: DELETE
    - Response: A message indicating if the hr member entered the data correctly and the course was deletedsuccessfuly.
    - Example of the response: The deleted course: { "id": "CSEN702, "name": "Advanced Lab", "department": "MET" }

#### Functionality: Get user month attendance records (hr member)
    - Route: /hr/get-user-month-attendance-records
    - Request type: GET
    - Request query: "user": "ac-2", "month": "10", "year": "2007"
    - Response: list of attendance records within given month and year
    - Example of the response: List of attendance records: [{ "user": "ac-1, "name": "signInTime": "2020-12-11T13:35:41.449Z", "signOutTime:" "2020-12-11T13:35:41.449Z" }]

#### Functionality: Get user day attendance records (hr member)
    - Route: /hr/get-user-month-attendance-records
    - Request type: GET
    - Request query: "user": "ac-3", "month": "10", "year": "2007"
    - Response: list of attendance records in a given day
    - Example of the response: List of attendance records:[{ "user": "ac-1, "name": "signInTime": "2020-12-11T13:35:41.449Z", "signOutTime:" "2020-12-11T13:35:41.449Z" }]

#### Functionality: Get staff missing days (hr member)
    - Route: /hr/get-staff-missing-days
    - Request type: GET
    - Request query: "month": 12, "year": "2020"
    - Response: An array of the users that have missing days withing given month and the days they have missed
    - Notes:If the month and year are specified, the missing days of this month and year will be retrieved, if none are specified, the missing days of the current month and year will be retrieved, if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing, these timings are in GMT time and so they are two hours behind

#### Functionality: Get staff missing hours (hr member)
    - Route: /hr/get-staff-missing-hours
    - Request type: GET
    - Request query: "month": 12, "year": "2020"
    - Response: An array of the users that have missing hours and how many hours they missed within given month
    - Example of response: {"missingHours":10},{"extraHours":0}
    - Notes:If the month and year are specified, the hours of this month and year will be retrieved, if none are specified, the hours of the current month and year will be retrieved, if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing

#### Functionality: Add missing attendance record (hr member)
    - Route: /hr/add-missing-attendance-record
    - Request type: POST
    - Request body: {"recordType", "recordId", "signInTime", "signOutTime"}
    - Response: An message indicating that the record was added successfully

#### Functionality: Delete attendance record (hr member)
    - Route: /hr/delete-attendance-record/:attendanceRecordId
    - Request type: DELETE
    - Response: An message indicating that the record was deleted successfully

#### Functionality: Get counts report (hr member)
    - Route: /hr/get-counts-report
    - Request type: GET
    - Response: An object with number of : academic members, hr members, faculties, courses, departments
    - Example of response: {academicMembers: 10, hrMembers: 13, faculties: 2, departments: 6, courses: 12}

#### Functionality: Get Room statistics (hr member)
    - Route: /hr/get-rooms-stats
    - Request type: GET
    - Response: An object with number of : lectures, tutorials, labs, offices
    - Example of response: {lecture: 10, tutorials: 13, labs: 2, offices: 6}


#### Functionality: Get Notifications (academic member)
    - Route: /academic/get-notifications
    - Request type: GET
    - Response: An array of notifications
    - Example of response: [{user: ac-1, message: Request accepted, seen: true}, {user: ac-5, message: Request rejected, seen: true}]

#### Functionality: Mark notifications as seen (academic member)
    - Route: /academic/mark-notifications-seen
    - Request type: PUT
    - Response: visual effect that notification was seen

#### Functionality: Get department courses (academic member)
    - Route: /academic/get-department-courses
    - Request type: GET
    - Response: A list of courses in academic's department
    - Example of response: ["CSEN701". "DMET603"]

#### Functionality: Get my courses (academic member)
    - Route: /academic/get-my-courses
    - Request type: GET
    - Response: A list of courses academic is assigned to
    - Example of response: ["CSEN701". "DMET603"]

#### Functionality: Get department staff (academic member)
    - Route: /academic/get-department-staff
    - Request type: GET
    - Response: An object containing a list of course istructors and a list of teaching assistants in academic's department
    - Example of response: {"courseInstructors":[] "teachingAssistants":[]}

#### Functionality: Get staff in course (academic member)
    - Route: /academic/get-staff/:course
    - Request type: GET
    - Request parameters: course
    - Response: A list containing all staff that are assigned to the course
    - Example of response: [{TA1},{TA2},{CI1}]

#### Functionality: Send a replacement request (academic member)
    - Route: /academic/send-replacement-request
    - Request: POST
    - Body: {"day":"2020-12-26","replacementID":"ac-2","slot":"3"}
    - Example of response: Request sent

#### Functionality: View replacement requests (academic member)
    - Route: /academic/replacement-requests
    - Request: GET
    - Example of response: [
        {
            requestedBy: 'ac-2',
            slot: {
                slotNo: 2,
                day: Saturday ,
                course: csen501
            },
            status:'Waiting for reply'
        }
    ]

#### Functionality: Accept replacement request (academic member)
    - Route: /academic/replacement-requests/:id/accept
    - Request: PUT
    - Parameters: Request id
    - Example of response: Request accepted

#### Functionality: Reject a replacement request (academic member)
    - Route: /academic/replacement-requests/:id/reject
    - Request: POST
    - Parameters: Request id
    - Example of response: Request rejected

#### Functionality: Send a slot linking request (academic member)
    - Route: /academic/send-slot-linking-request
    - Request: POST
    - Body: {"day":"Saturday","slot":"3","room":"C5.103" }
    - Example of response: 'Request sent'

#### Functionality: View slot linking requests (academic member)
    - Route: /academic/slot-linking-requests
    - Request: GET
    - Parameters:
    - Body: { }
    - Example of response: [
        {
            id:2,
            slot:{
                day:Saturday,
                slotNo:3,
                Course: csen501
            }
        }
    ]

#### Functionality: Send a leave request (academic member)
    - Route: /academic/send-leave-request
    - Request: POST
    - Body:
    - Annual leave:
    - {type:"annualLeave",day:"2020-04-22",reason: ""}
    - Accidental leave:
    - {type:"accidentalLeave",day:"2020-04-22",reason:""}
    - Compensation leave:
    - {type:"compensationLeave",day:"2020-04-22",reason:"", compensationDay:"2020-04-25"}
    - Sick leave:
    - {type:"sickLeave",day:"2020-04-22",document:"googledrive.com/uploadedProofDocument",reason:"I had the corona virus"}
    - Maternity:
    - {type:"maternityLeave",day:"2020-04-22",document:"googledrive.com/uploadedProofDocument",duration:"70",reason:""}
    - Example of response: Request submitted

#### Functionality: Send a request to change day off (academic member)
    - Route: /academic/change-day-off-request
    - Request: POST
    - Body: {dayOff:"Monday",reason: ""}
    - Example of response: Request sent

#### Functionality: View requests (academic member)
    - Route: /academic/all-requests/:filter
    - Request: GET
    - Parameters: filter: All, Accepted, Rejected or Pending
    - Example of response: [
        {
            id:3,
            type: annualLeave,
            day:11-02-2020,
            status: 'Pending
        },
        {
            id:5,
            type:sickLeave,
            day:11-03-2020,
            document: url,
            status: Accepted
        }
    ]

#### Functionality: Cancel a request (academic member)
    - Route: /academic/cancel-request/:id
    - Request: DELETE
    - Parameters: Request id
    - Example of response: Request cancelled

#### Functionality: View schedule (academic member)
    - Route: /academic/schedule
    - Request: GET
    - Example of response:
    [{
        slotNo: 2,
        day: Saturday,
        Course: csen501,
        staffMember: ac-1
    },
    {
        slotNo: 3,
        day: Saturday,
        Course: csen501,
        staffMember: ac-1
    },
    {
        slotNo: 2,
        day: Saturday,
        Course: csen501,
        staffMember: ac-4  (In case they are replacing someone)
    }
    ]

#### Functionality: Get slots in a course (academic member)
    - Route: /academic/get-slots/:course
    - Request: GET
    - Parameters: course id
    - Response: A list of slots in course
    - Example of response: [{Slot 1},{Slot 2}]

#### Functionality: Get slots stats (academic member)
    - Route: /academic/get-slots-stats
    - Request: GET
    - Response: An object containing the number of unassigned slots and assigned slots
    - Example of response: [{assignedSlots: 14, unassignedSlots: 16}]

#### Functionality: Get counts report (academic member)
    - Route: /academic/get-count-report
    - Request: GET
    - Response: An object containing the number of assigned courses,pending requests, recieved requests, missing days, missing hours
    - Example of response: {courses: 3, pendingRequests: 10, recievedRequests: 0, missingDays:13, missingHours: 150}

#### Functionality: View the coverage of each course he is assigned to (course instructor)
    - Route: /ci/get-my-courses-coverage
    - Request type: GET
    - Response: An object containing a list of courses and a list of coverage
    - Example of response: {["CSEN701", "CSEN302"],[50, 80]}

#### Functionality: Assign teaching assistant to course (course instructor)
    - Route: /ci/assign-teaching-assistant
    - Request type: POST
    - Request body: {academicId: "ac-1", courseId: "CSEN302"}
    - Example of response: TA assigned to course successfully

#### Functionality: Unassign teaching assistant from course (course instructor)
    - Route: /ci/unassign-teaching-assistant/:academicId/:courseId
    - Request type: PUT
    - Request parameters: academicId, courseId
    - Example of response: TA unassigned from course successfully

#### Functionality: Assign a course coordinator to a course in his department (course instructor)
    - Route: /ci/assign-course-coordinator
    - Request type: POST
    - Request body:{"academicId": "ac-56", "courseId": "CSEN702"}
    - Example of response: "Course coordinator assigned to course"

#### Functionality: Unassign course coordinator from a course in his department (course instructor)
    - Route: /ci//unassign-course-coordinator/:academicId/:courseId
    - Request type: PUT
    - Request body:{"academicId": "ac-56", "courseId": "CSEN702"}
    - Example of response: "Course coordinator unassigned from course successfully"

#### Functionality: Assign an academic member to an unassigned slot in course(s) he/she is assigned to (course instructor)
    - Route: /ci/assign-academic-member-to-slot
    - Request type: PUT
    - Request body: { "id" : "ac-6", "room": "5f223d77l", "day": "Monday", "slotNumber": "3" }
    - Example of response: The saved slot after assigning the academic member. { "day": "Monday", "slotNumber": 3, "room": (room._id) "5f223d77l", "course": (course._id) "435263g628h", "staffMember": "ac-4", "type": "Lab"}

#### Functionality: View the coverage of each course in his/her department (head of department)
    - Route: hod/get-department-courses-coverage
    - Request type: GET
    - Response: An object containing a list of courses and a list of coverage
    - Example of response: {["CSEN701", "CSEN302"],[50, 80]}

#### Functionality: Assign a course instructor for a course in his department (head of department)
    - Route: /hod/assign-course-instructor
    - Request type: POST
    - Request paramaters:{"academicId":"ac-56","courseId":"CSEN401"}
    - Example of response: "Instructor assigned to course successfully"

#### Functionality: Unassign a course instructor from a course in his department (head of department)
    - Route: /hod/unassign-course-instructor/:academicId/:courseId
    - Request type: PUT
    - Request paramaters:academicId, courseId
    - Example of response: "Course instructor unassigned from course successfully"

#### Functionality: HOD gets all requests from staff in his department (head of department)
    - Route: /hod/staff-requests
    - Request: GET
    - Response: A list of requests sent to hod from academic members in his/her department
    - Example of response : [{
        RequestedBy: 'ac-2',
        id: 20,
        status:'Accepted',
        type:'MaternityLeave',
        duration: 80,
        document: 'drive.google.com/document'},
        {
        RequestedBy: 'ac-4',
        id: 20,
        status:'Accepted',
        type:'sickLeave',
        duration: 80,
        document: 'drive.google.com/document'}
    ]

#### Functionality: Accept a request from an academic member in his departmment (head of department)
    - Route: /hod/staff-requests/:reqId/accept
    - Request: PUT
    - Parameters:	request Id
    - Response: The accepted response
    - Example of response :
    {
        RequestedBy: 'ac-2',
        id: 20,
        status:'Accepted',
        type:'MaternityLeave',
        duration: 80,
        document: 'drive.google.com/document'
    }

#### Functionality: Reject a request from an academic member in his departmment (head of department)
    - Route: /hod/staff-requests/:reqId/reject
    - Request: PUT
    - Parameters:	request Id
    - Body: {HODComment: "Reason for rejection" }
    - Response: The rejected response
    - Example of response :
    {
        RequestedBy: 'ac-2',
        id: 20,
        status:'Rejected',
        HODComment: 'Shortage of staff',
        type:'annualLeave',
        day: 10-09-2021,
        document: 'drive.google.com/document'
    }

#### Functionality: Get courses that are assigned to course coordinator (course coordinator)
    - Route: /cc/get-course-coordinator-courses
    - Request: GET
    - Response: A list of courses
    - Example of response : [{Course 1},{Course 2}]

#### Functionality: Add course slot(s) in his/her course (course coordinator)
    - Route: /cc/add-course-slot
    - Request type: POST
    - Request body: { "day": "Saturday", "slotNumber": 4, "course": "CSEN704", "room": "C5.201", "type": "Tutorial" }
    - Example of the response: "Slot added successfully"

#### Functionality: Update course slot(s) in his/her course (course coordinator)
    - Route: /cc/update-course-slot/:slotId
    - Request type: PUT
    - Request body: { "day": "Saturday", "slotNumber": 4, "room": "C5.201", "updatedDay": "Saturday", "updatedSlotNumber": 2, "updatedRoom": "C5.301", "updatedType": "Lab" }
    - Request paramaters: slotId
    - Example of the response: "Slot updated successfully"

#### Functionality: Delete course slot from his/her course (course coordinator)
    - Route: /cc/delete-course-slot/:slotId
    - Request type: DELETE
    - Request paramaters: slotId
    - Example of the response: "Slot deleted successfully"

#### Functionality: View all slot linking requests sent by staff in his/her courses (course coordinator)
    - Route: /cc/slot-linking-requests
    - Request:	GET
    - Response: A list of requests sent
    - Example of response:
    [
      {
          id: 18,
          requestedBy: 'ac-3',
          slot: *slot id*,
          status:'Pending
      }
    ]

#### Functionality: Accept a slot linking request
    - Route: /cc/slot-linking-requests/:reqId/accept
    - Request: PUT
    - Request paramaters: request Id
    - Response: The accepted request
    - Example of response: {
          id: 18,
          requestedBy: 'ac-3',
          slot: *slot id*,
          status:'Accepted'
      }

#### Functionality: Reject a slot linking request
    - Route: /cc/slot-linking-requests/:reqId/reject
    - Request paramaters: request Id
    - Request body: {ccComment: "Reason for rejection }
    - Response: The rejected request
    - Example of response: {
          id: 18,
          requestedBy: 'ac-3',
          slot: *slot id*,
          status:'Rejected
      }
