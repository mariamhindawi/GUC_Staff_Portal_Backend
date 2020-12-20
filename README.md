# GUC_Staff_Portal
Web portal for GUC staff members

Functionality: staff members view their profile
Route: /general_staff_routes/view-profile
Request type: GET
Response:object containing academic member
Example of how to call the route: /general_staff_routes/view-profile

Functionality: staff members reset their password
Route: /general_staff_routes/reset-password
Request type: POST
Body:{"password":"123456", "newpassword":"123456789"}
Response:success or failure message

Functionality: HOD assign a course instructor for each course in his department.
Route: /hod/assign-course-instructor
Request type: POST
Body:{"instructor":ac-56}
Response:success or failure message

Functionality: HOD delete a course instructor for each course in his department.
Route: /hod/delete-course-instructor
Request type: POST
Body:{"instructor":ac-56}
Response:success or failure message

Functionality: HOD update a course instructor for each course in his department.
Route: /hod/update-course-instructor
Request type: POST
Body:{"instructordelete":ac-56,"instructorupdate":ac-6}
Response:success or failure message

Functionality: HOD view staff of his department.
Route: /hod/view-all-staff
Request type: GET
Response:object containing academic members

Functionality: HOD view one of the staff's day off.
Route: /hod/view-one-staff-dayoff
Request type: POST
Body:{"id":"ac-2"}
Response:object containing academic members's day off

Functionality: HOD view all staff's day off.
Route: /hod/view-all-staff-dayoff
Request type: GET
Response:object containing academic members's dayoff

Functionality: Course instructor delete an academic member for each course in his department.
Route: /ci/delete-academic-member
Request type: POST
Body:{"instructor":"ac-56","ta":"ac-3"}
Response:success or failure message


Functionality: Course instructor assign a course coordinator for each course in his department.
Route: /ci/assign-course-coordinator
Request type: POST
Body:{"ta":ac-56}
Response:success or failure message
