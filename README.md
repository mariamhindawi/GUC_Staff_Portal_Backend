# GUC_Staff_Portal
Web portal for GUC staff members


- File to launch the server: index.js


- Port : "PORT" field in .env file in the root directory


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
    - Notes: In order to have initial access to the system this route also saves a default user "hr-1" in the database, with email "user@guc.edu.eg" and the deafult password "123456". It also saves a room
    "C7.305" which is the users's office as it is a required field.

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

#### Functionality: Change the password of the user
    - Route: /change-password
    - Request type: PUT
    - Request body: { "oldPassword": "123456", "newPassword": "guc" }
    - Response: Redirect to the login page if the password changed successfully, if not then a message indicating the error that happened.
    - Notes: This is used to change the user's password in general and also to reset the password on first login.

#### Functionality: Add a location (hr member).
    - Route: /hr/add-room.
    - Request type: POST
    - Request body: { "name": "C7.201", "capacity": 25, "type": "Lab" } //The info of the room
    - Response: A message indicating if the hr member enterred the data correctly and the room was added successfuly.
    - Example for the response: The saved room: { "name": "C7.201", "capacity": 25, "type": "Lab" }

#### Functionality: Update a location (hr member).
    - Route: /hr/update-room
    - Request type: PUT
    - Request body:  { "name": "C7.201", "newName": "C7.202", "capacity": 20, "type": "Tutorial" } // The name of the required room to update and then the updated info
    - Response: A message indicating if the hr member enterred the data correctly and the room was updated successfuly.
    - Example for the response: The saved room after updating it: { "name": "C7.202", "capacity": 20, "type": "Tutorail" }

#### Functionality: Delete a location (hr member).
    - Route: /hr/delete-room
    - Request type: DELETE 
    - Request body: { "name": "C7.202" } 
    - //The name of the room to be deleted
    - Response: A message indicating if the hr member enterred the data correctly and the room was deleted successfuly.
    - Example for the response: The deleted room: { "name": "C7.202", "capacity": 20, "type": "Tutorail" }

#### Functionality: Add a faculty(hr member). 
    - Route: /hr/add-faculty
    - Request type: POST
    - Request body: { "name": "Engineering" } 
    - //The name of the faculty
    - Response: A message indicating if the hr member enterred the data correctly and the faculty was updated successfuly.
    - Example for the response: The added faculty: { "name": "Engineering" }

#### Functionality: Update a faculty(hr member).
    - Route: /hr/update-faculty
    - Request type: PUT
    - Request body: { "name": "Engineering", "newName": "ENG" } 
    - //The name of the faculty to be updated and the new name
    - Response: A message indicating if the hr member enterred the data correctly and the faculty was updated successfuly.
    - Example for the response: The updated faculty: { "name": "ENG" }.

#### Functionality: Delete a faculty(hr member).
    - Route: /hr/delete-faculty
    - Request type: DELETE
    - Request body: { "name": "ENG" }
    - Response: A message indicating if the hr member enterred the data correctly and the faculty was deleted successfuly.
    - Example for the response: The deleted faculty: { "name": "ENG" }

#### Functionality: Add a department under a faculty(hr member).
    - Route: /hr/add-department
    - Request type: POST
    - Request body: { "name": "Computer Science", "faculty": "ENG" , "headOfDepartment": "ac-1" }
    - //the info needed. Only the name field is requied.
    - Response: A message indicating if the hr member enterred the data correctly and the department was added successfuly.
    - Example of the response: The added department: { "name": "Computer Science", "faculty": "ENG" , "headOfDepartment": "ac-1" }.

#### Functionality: Update a department under a faculty(hr member).
    - Route: /hr/update-department
    - Request type: PUT
    - Request body: { "name": "Computer Science", "newName": "MET", "headOfDepartment": "ac-2" }
    - //the name of the department to be updated and the updated info 
    - Response: A message indicating if the hr member enterred the data correctly and the department was updated successfuly.
    - Example of the response: The updated department: { "name": "MET", "faculty": "ENG" , "headOfDepartment": "ac-2" }.

#### Functionality: Delete a department under a faculty(hr member).
    - Route: /hr/delete-department
    - Request type: DELETE
    - Request body: { "name": "MET" }.
    - //the name of the department to be deleted
    - Response: A message indicating if the hr member enterred the data correctly and the department was deleted successfuly.
    - Example of the response: The deleted department: { "name": "MET", "faculty": "ENG" , "headOfDepartment": "ac-2" }.

#### Functionality: Add a course under a department(hr member).
    - Route: /hr/add-course
    - Request type: POST
    - Request body: { "id": "CSEN702", "name": "Advanced Computing Lab", "department": "MET" }
    - //the info for the added course. Only the id and the name field are requied
    - Response: A message indicating if the hr member enterred the data correctly and the course was added successfuly.
    - Example of the response: The added course: { "id": "CSEN702", "name": "Advanced Computing Lab", "department": "MET" }

#### Functionality: Update a course under a department(hr member).
    - Route: /hr/update-course
    - Request type: PUT
    - Request body: { "id": "CSEN702", "newId": "CSEN709", "name": "Advanced Lab" }
    - // the id of the course to be updated and the info of the updated data
    - Response: A message indicating if the hr member enterred the data correctly and the course was updated successfuly.
    - Example of the response: The updated course: { "id": "CSEN709", "name": "Advanced Lab", "department": "MET" }

#### Functionality: Delete a course under a department(hr member).
    - Route: /hr/delete-course
    - Request type: DELETE
    - Request body: { "id": "CSEN709" } //The id of the course to be deleted
    - Response: A message indicating if the hr member enterred the data correctly and the course was deletedsuccessfuly.
    - Example of the response: The deleted course: { "id": "CSEN709", "name": "Advanced Lab", "department": "MET" }

#### Functionality: HR can add a new hr member to the system(hr member).
    - Route: /hr/add-hr-member
    - Request type: POST
    - Request body: { "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }
    - Response: A message indicating if the hr member enterred the data correctly and the hr member was added successfuly.
    - Example of the response: The added member: { "id": "hr-2", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }

#### Functionality: HR can add a new academic member to the system(hr member).
    - Route: /hr/add-hr-member
    - Request type: POST
    - Request body: { "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000, "role": "Head Of Department", "dayOff": "Monday" }
    - The info for the academic member
    - Response: A message indicating if the hr member enterred the data correctly and the academic member was added successfuly.
    - Example of the response: The added member: { "id": "ac-1", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000, 
    - "role": "Head Of Department", "dayOff": "Monday" }

#### Functionality: Update already existing hr members(hr member).
    - Route: /hr/update-hr-member 
    - Request type: PUT
    - Request body: { "id": "hr-2", "name": "Ali Elshamy", "email": "mm1@gmail.com", "password": "121212", "office": "C5.101", "salary": 20000 }
    - //the id of the hr member needs to be updated and the info for update
    - Response: A message indicating if the hr member enterred the data correctly and the hr member was updated successfuly.
    - Example of the response: The updated member: { "id": "hr-2", "name": "Ali Elshamy", "email": "mm1@gmail.com", "password": "121212", "office": "C5.101", "salary": 20000 }

#### Functionality: Update already existing academic members(hr member).
    - Route: /hr/update-academic-member 
    - Request type: PUT
    - Request body: {"id": "ac-1", "name": "Omar", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000, "gender": "MALE", "role": "Head Of Department", "dayOff": "Monday" }
    - //the id of the academic member to be uodated and the other info for update
    - Response: A message indicating if the hr member enterred the data correctly and the academic member was updated successfuly.
    - Example of the response: The updated member: { "id": "hr-2", "name": "Omar", "email": "mm1@gmail.com", "password": "121212", "office": "C5.101", "salary": 20000 }

#### Functionality: Delete already existing hr members(hr member).
    - Route: /hr/delete-hr-member 
    - Request type: DELETE
    - Request body: { "id": "hr-2" } // the id of the hr member to be deleted
    - Response: A message indicating if the hr member entered the data correctly and the hr member was deleted successfuly.
    - Example of the response: The deleted member: { "id": "hr-2", "name": "Ali", "email": "mm@gmail.com", "gender": "MALE", "office": "C7.303", "salary": 10000 }

#### Functionality: Delete already existing academic members(hr member).
    - Route: /hr/delete-academic-member 
    - Request type: DELETE
    - Request body: { "id": "ac-1" } // the id of the academic member to be deleted
    - Response: A message indicating if the hr member entered the data correctly and the academic member was deleted successfuly.
    - Example of the response: The deleted member: { "id": "hr-2", "name": "Omar", "email": "mm1@gmail.com", "password": "121212","gender": "MALE", "office": "C5.101", "salary": 20000 }

#### Functionality: View the coverage of each course in his/her department(Head of Department).
    - Route: hod/view-coverage
    - Request type: /GET
    - Response: The coverage of each course in his department. Example of a single HOD: { Advanced Lab Course's coverage = 70& }

#### Functionality: View teaching assignments (which staff members teach which slots) of course offered by his department(Head of Department).
    - Route: /hod/view-teaching-assignments
    - Request type: GET
    - Request body: { "course" : "CSEN704" } // The id of a course in his department
    - Response:A message indicating if the hod enterred the course correctly and shows the array of slots. An array of slots of this specific course with details including the staff member. Example: { "day": "Sunday", "slotNumber": 2, "room": (room._id) "5f223d77l", "course": (course._id) "435263g628h", "staffMember": "ac-4", "type": "Lab"}

#### Functionality: View the coverage of each course he is assigned to(Course Instructor).
    - Route: /ci/view-coverage
    - Request type: GET
    - Response: The coverage of each course he is assigned to. Example of a single course : { Advanced Lab Course's coverage = 70& }

#### Functionality: View the slots' assignment of course(s) he/she is assigned to(Course Instructor).
    - Route: /ci/view-teaching-assignments
    - Request type: GET
    - Request body: { "course" : "CSEN704" } // The id of a course he is assigned to.
    - Response: A message indicating if the course instructor enterred the course correctly and shows the array of slots. 
    An array of slots of this specific course with details including the staff member. Example: { "day": "Sunday", "slotNumber": 2, "room": (room._id) "5f223d77l", "course": (course._id) "435263g628h", "staffMember": "ac-4", "type": "Lab"}.

#### Functionality: Assign an academic member to an unassigned slots in course(s) he/she is assigned to(Course Instructor).
    - Route: /ci/assign-academic-member-to-slot
    - Request type: PUT
    - Request body: { "id" : "ac-6" } //The id of the academic he wants to assign the slot to.
    - Response: A message indicating if the course instructor enterred the data of the academic member correctly. Example of the response: The saved slot after assigning the academic member. { "day": "Sunday", "slotNumber": 2, "room": (room._id) "5f223d77l", "course": (course._id) "435263g628h", "staffMember": "ac-4", "type": "Lab"}

#### Functionality: Update assignment of academic member in course(s) he/she is assigned to(Course Instructor).
    - Route: /ci//update-academic-member-to-slot
    - Request type: PUT
    - Request body: { "id" : "ac-6" } //The id of the academic he wants to assign the slot to.
    - Response: A message indicating if the course instructor enterred the data of the academic member correctly. Example of the response: The saved slot after assigning the academic member. 
    - { "day": "Sunday", "slotNumber": 2, "room": (room._id) "5f223d77l", "course": (course._id) "435263g628h", "staffMember": "ac-4", "type": "Lab"}

#### Functionality: Delete assignment of academic member in course(s) he/she is assigned to(Course Instructor).
    - Route: /ci/delete-academic-member-to-slot
    - Request type: DELETE 
    - Request body: { "id" : "ac-6" } //The id of the academic he wants to delete the assignment of the slot to.
    - Response:  A message indicating if the course instructor enterred the data of the academic member correctly. Example of the response: The saved slot after deleting the academic member. { "day": "Sunday", "slotNumber": 2, "room": (room._id) "5f223d77l", "course": (course._id) "435263g628h", "staffMember": "UNASSIGNED", "type": "Lab"}

#### Functionality: Add course slot(s) in his/her course(Course Coordinator).
    - Route: /cc/add-course-slot
    - Request type: POST
    - Request body: { "day": "Saturday", "slotNumber": 4, "course": "CSEN704", "room": "C5.201", "type": "Tutorial" } 
    - //The needed info for the slot
    - Response: A message indicating if the course coordinator enterred the data of the slot correctly. Example of the response:
    - The saved slot after adding it: { "day": "Saturday", "slotNumber": 4, "course": "CSEN704", "room": "C5.201", "type": "Tutorial", "staffMember": "UNASSIGNED" }

#### Functionality: Update course slot(s) in his/her course(Course Coordinator).
    - Route: /cc/update-course-slot
    - Request type: PUT
    - Request body: { "day": "Saturday", "slotNumber": 4, "room": "C5.201", "updatedDay": "Saturday", "updatedSlotNumber": 2, "updatedRoom": "C5.301", "updatedType": "Lab" } 
     - //The needed info for the slot(day,slotNumber,room-->All required) and the new info that needs to be updated(Its not required to fill all the updated fields. Just fill the info that needs to be updated)
    - Response:  A message indicating if the course coordinator enterred the data of the slot correctly. Example of the response:
    - The saved slot after updating it: 
    - { "day": "Saturday", "slotNumber": 4, "course": "CSEN704", "room": "C5.201", "type": "Tutorial", "staffMember": "UNASSIGNED" }

#### Functionality: Delete course slot(s) in his/her course(Course Coordinator).
    - Route: /cc/delete-course-slot
    - Request type: DELETE
    - Request body: { "day": "Saturday", "slotNumber": 4, "room": "C5.201" } // The needed info for the slot (These three are enough for a slot to be unique)
    - Response: A message indicating if the course coordinator enterred the data of the slot correctly. Example of the response: The saved slot after deleted it: { "day": "Saturday", "slotNumber": 4, "course": "CSEN704", "room": "C5.201", "type": "Tutorial", "staffMember": "UNASSIGNED" }

#### Functionality: View attendance records
    - Route: /staff/view-attendance-records
    - Request type: GET
    - Request body: { "month": 12, "year": 2020 } or {}
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
    - Notes:If the month and year are specified, the records of this month and year will be retrieved, if none are specified, all the records of this user will be retrieved, if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing, these timings are in GMT time and so they are two hours behind

#### Functionality: View missing days
    - Route: /staff/view-missing-days
    - Request type: GET
    - Request body: { "month": 12, "year": 2020 } or {}
    - Response: An array of the days that the user missed
    - Example of response: ["2020-12-25T10:00:00.000Z", "2020-12-27T10:00:00.000Z"]
    - Notes:If the month and year are specified, the missing days of this month and year will be retrieved, if none are specified, the missing days of the current month and year will be retrieved, if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing, these timings are in GMT time and so they are two hours behind

#### Functionality: View missing and extra hours
    - Route: /staff/view-hours
    - Request type: GET
    - Request body: { "month": 12, "year": 2020 } or {}
    - Response: An object containing the missing hours and the extra hours
    - Example of response: {"missingHours":10},{"extraHours":0}
    - Notes:If the month and year are specified, the hours of this month and year will be retrieved, if none are specified, the hours of the current month and year will be retrieved, if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing

#### Functionality: View any staff's attendance records
    - Route: /hr/view-staff-attendance-records
    - Request type: GET
    - Request body: {"id":"hr-1" "month": 12, "year": 2020 } or {"id":"hr-1"}
    - Response: An array containing all the attendance records of this staff member
    - Example of response: Example of response: [{
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
    - Notes:If the month and year are specified, the records of this month and year will be retrieved, if none are specified, the all the records will be retrieved, if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing

#### Functionality: Add missing record
    - Route: /hr/add-missing-record
    - Request type: POST
    - Request body: {"missingRecordType":signIn,"signInYear":2020, "signInMonth":12, "signInDay":25, "signInHour":15, "signInMinute":20, "signOutYear:2020", "signOutMonth:12", "signOutDay:25", "signOutHour:17", "signOutMinute:35" }
    - Response: The record after adding the missing information
    - Example of response:  {
        "_id": "5fe5eacc6e62410e64e6ca80",
        "user": "hr-1",
        "signInTime": "2020-12-25T15:20:00.000Z",
        "signOutTime": "2020-12-25T17:35:16.489Z",
        "__v": 0
    }
    - Notes: missingRecordType is the record that is missing and is currently null

#### Functionality: View staff with missing days 
    - Route: /hr/view-staff-missing-days
    - Request type: GET
    - Request body: {"user":"hr-1","month":12,"year":2020} or {"user":"hr-1"}
    - Response: get array of objects of staffs with their missing days

#### Functionality: View staff with missing hours 
    - Route: /hr/view-staff-missing-hours
    - Request type: GET
    - Request body: {"user":"hr-1","month":12,"year":2020,} or{"user":"hr-1"}
    - Response: get array of objects of staffs with their missing hours

#### Functionality: staff members view their profile
    - Route: /general_staff_routes/view-profile
    - Request type: GET
    - Response:object containing academic member
    - Example of response:{ }

#### Functionality: staff members reset their password
    - Route: /staff/change-password
    - Request type: POST
    - Body:{"oldPassword":"123456", "newPassword":"123456789"}
    - Response:success or failure message
    - Example of response:{
    - "Wrong password." }


#### Functionality: HOD assign a course instructor for each course in his department.
    - Route: /hod/assign-course-instructor
    - Request type: POST
    - Body:{"id":"ac-56","course":"CSEN401"}
    - Response:success or failure message
    - Example of response:{
        "Instructor assigned to course"}


#### Functionality: HOD delete a course instructor for each course in his department.
    - Route: /hod/delete-course-instructor
    - Request type: POST
    - Body:{"id":"ac-56","course":"CSEN401"}
    - Response:success or failure message
    - Example of response:{
        "Instructor deleted from course" }

#### Functionality: HOD update a course instructor for each course in his department.
    - Route: /hod/update-course-instructor
    - Request type: POST
    - Body:{"idUpdate":"ac-56","idDelete":"ac-3",course":"CSEN401"}
    - Response:success or failure message
    - Example of response:{
        "Instructor updated"
        }


#### Functionality: HOD view all staff of his department.
    - Route: /hod/view-all-staff
    - Request type: GET
    - Response:array of objects containing academic members
    - Example of response:{[
        "name": "Ahmed", 
        "email": "Ahmed@gmail.com", 
        "role": "Teaching Assistant",
        "faculty": "MET",
        "department": "Physics", 
        "office": "C7.201",
        "salary": "2000"
        ]
        }

#### Functionality: HOD view staff of his department per course.
    - Route: /hod/view-all-staff-per-course
    - Request type: POST
    - Body:{"course":"CSEN401"}
    - Response:array of objects containing academic members
    - Example of response:{[
        "name": "Ahmed", 
        "email": "Ahmed@gmail.com", 
        "role": "Teaching Assistant",
        "faculty": "MET",
        "department": "Physics", 
        "office": "C7.201",
        "salary": "2000"
        ]
        }

#### Functionality: HOD view one of the staff's day off.
    - Route: /hod/view-one-staff-dayoff
    - Request type: POST
    - Body:{"id":"ac-2"}
    - Response:object containing academic member's day off
    - Example of response:{
        "dayOff":"Saturday"
        }



#### Functionality: HOD view all staff's day off.
    - Route: /hod/view-all-staff-dayoff
    - Request type: GET
    - Response:array of objects containing academic members's dayoff
    - Example of response:{
        "dayOff":"Saturday",
        "dayOff":"Sunday"
        }

#### Functionality: Course instructor delete an academic member for each course in his department.
    - Route: /ci/delete-academic-member
    - Request type: POST
    - Body:{"id":"ac-3"}
    - Response:success or failure message
    - Example of response:{
        "Academic member deleted"
        }

#### Functionality: Course instructor assign an academic member for each course in his department.
    - Route: /ci/assign-academic-member
    - Request type: POST
    - Body:{"id":"ac-3"}
    - Response:success or failure message
    - Example of response:{
        "Academic member added"
        }

#### Functionality: Course instructor assign a course coordinator for each course in his department.
    - Route: /ci/assign-course-coordinator
    - Request type: POST
    - Body:{"id":ac-56}
    - Response:success or failure message
    - Example of response:{
        "Course coordinator assigned to course"
        }

#### Functionality:: HOD accepts a request from an academic member in his departmment
    - Route: /hod/staff-requests/:reqId/accept
    - Request: PUT
    - Parameters:	request Id
    - Body:{ }

#### Functionality: HOD rejects a request from an academic member in his departmment
    - Route: /hod/staff-requests/:reqId/reject
    - Request: PUT
    - Parameters:	request Id
    - Body: {HODComment: "Reason for rejection" }

Fcuntionality: HOD gets all requests from staff in his department
    - Route: /hod/staff-requests
    - Request: GET
    - Parameters:
    - Body:{ }

#### Functionality: Course coordinator accepts a slot linking request
    - Route: /cc/slot-linking-requests/:reqId/accept
    - Request: PUT
    - Parameters: request Id
    - Body:{ }

#### Functionality: Course coordinator rejects a slot linking request
    - Route: /cc/slot-linking-requests/:reqId/reject
    - Request: PUT
    - Parameters: request Id
    - Body:{ccComment: "Reason for rejection }

#### Functionality: Coordinator views all slot linking requests from staff in courses linked to him
    - Route: /cc/slot-linking-requests
    - Request:	GET
    - Parameters:	
    - Body:{ }

#### Functionality: Academic member views his schedule
    - Route: /academicMember/schedule
    - Request: GET
    - Parameters:
    - Body: { }

#### Functionality: Academic members= sends a replacement request
    - Route: /academicMember/send-replacement-request
    - Request: POST
    - Parameters: 
    - Body: {"day":"2020-12-26","replacementID":"ac-2","slot":"3"}

#### Functionality: Academic member view replacement requests
    - Route: /academicMember/replacement-requests
    - Request: GET
    - Parameters: 
    - Body: { }

#### Functionality: Academic member accepts replacement request
    - Route: /academicMember/replacement-requests/:id/accept
    - Request: PUT
    - Parameters: Request id
    - Body: { }


#### Functionality:Academic member rejects a replacement request
    - Route: /academicMember/replacement-requests/:id/reject
    - Request: POST
    - Parameters: Request id
    - Body: { }

#### Functionality:Academic member sends a slot linking request
    - Route: /academicMember/send-slot-linking-request
    - Request: POST
    - Parameters:
    - Body: {"day":"Saturday","slot":"3","room":"C5.103" }

#### Functionality: Academic member views slot linking requests
    - Route: /academicMember/slot-linking-requests
    - Request: GET
    - Parameters:
    - Body: { }

#### Functionality: Acdemic member sends a request to change his day off
    - Route: /academicMember/change-day-off-request
    - Request: POST
    - Parameters:
    - Body: {dayOff:"Monday",reason: ""}

#### Functionality:Academic member sends a leave request
    - Route: /academicMember/send-leave-request
    - Request: POST
    - Parameters: 
    - Body: 
    - Annual leave:
    - {type:"annualLeave",day:"2020-04-22",reason: ""}
    - Accidental leave:
    - {type:"accidentalLeave",day:"2020-04-22",reason:""}
    - Compensation leave:
    - {type:"compensationLeave",day:"2020-04-22",reason:""}
    - Sick leave:
    - {type:"sickLeave",day:"2020-04-22",document:"googledrive.com/uploadedProofDocument",reason:"I had the corona virus"}
    - Maternity:
    - {type:"maternityLeave",day:"2020-04-22",document:"googledrive.com/uploadedProofDocument",duration:"70",reason:""}

#### Functionality:Academic member views requests
    - Route: /academicMember/all-requests/:filter
    - Request: GET
    - Parameters: filter: All, Accepted, Rejected or Pending
    - Body: {}

#### Functionality:Academic member cancels a request
    - Route: /academicMember/cancel-request/:id
    - Request: DELETE
    - Parameters: Request id
    - Body: {}
