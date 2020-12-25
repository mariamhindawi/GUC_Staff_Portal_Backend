Functionality: View attendance records
Route: /staff/view-attendance-records
Request type: GET
Request body: { "month": 12, "year": 2020 } or {}
Response: An array of the user's records
Example of response: [{
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
Notes:If the month and year are specified, the records of this month and year will be retrieved, if none are specified, all the records of this user will be retrieved,
if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing, these timings are in GMT time and so they are two hours behind

Functionality: View missing days
Route: /staff/view-missing-days
Request type: GET
Request body: { "month": 12, "year": 2020 } or {}
Response: An array of the days that the user missed
Example of response: ["2020-12-25T10:00:00.000Z", "2020-12-27T10:00:00.000Z"]
Notes:If the month and year are specified, the missing days of this month and year will be retrieved, if none are specified, the missing days of the current month and year will be retrieved,
if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing, these timings are in GMT time and so they are two hours behind

Functionality: View missing and extra hours
Route: /staff/view-hours
Request type: GET
Request body: { "month": 12, "year": 2020 } or {}
Response: An object containing the missing hours and the extra hours
Example of response: {"missingHours":10},{"extraHours":0}
Notes:If the month and year are specified, the hours of this month and year will be retrieved, if none are specified, the hours of the current month and year will be retrieved,
if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing

Functionality: View any staff's attendance records
Route: /hr/view-staff-attendance-records
Request type: GET
Request body: {"id":"hr-1" "month": 12, "year": 2020 } or {"id":"hr-1"}
Response: An array containing all the attendance records of this staff member
Example of response: Example of response: [{
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
Notes:If the month and year are specified, the records of this month and year will be retrieved, if none are specified, the all the records will be retrieved,
if only the month or only the year is specified, the response will be a message indicating that some of the fields are missing

Functionality: Add missing record
Route: /hr/add-missing-record
Request type: POST
Request body: {"missingRecordType":signIn,"signInYear":2020, "signInMonth":12, "signInDay":25, "signInHour":15, "signInMinute":20,
"signOutYear:2020", "signOutMonth:12", "signOutDay:25", "signOutHour:17", "signOutMinute:35" }
Response: The record after adding the missing information
Example of response:  {
        "_id": "5fe5eacc6e62410e64e6ca80",
        "user": "hr-1",
        "signInTime": "2020-12-25T15:20:00.000Z",
        "signOutTime": "2020-12-25T17:35:16.489Z",
        "__v": 0
    }
Notes: missingRecordType is the record that is missing and is currently null

Functionality: View staff with missing days 
Route: /hr/view-staff-missing-days
Request type: GET
Request body: {"user":"hr-1","month":12,"year":2020} or {"user":"hr-1"}
Response: get array of objects of staffs with their missing days
Example of response:  {
        "id": "hr-1",
        "missingDays": [
            "2020-12-12T22:00:00.000Z",
            "2020-12-13T22:00:00.000Z"
}

Functionality: View staff with missing hours 
Route: /hr/view-staff-missing-hours
Request type: GET
Request body: {"user":"hr-1","month":12,"year":2020,} or{"user":"hr-1"}
Response: get array of objects of staffs with their missing hours
Example of response:  {
        "id": "hr-1",
        "missingHours": 176.4
    }

