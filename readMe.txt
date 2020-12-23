Route: /hod

Route: /staff-requests/:reqId/accept
Request: PUT
Parameters:	request Id
Body:{ }

Route: /staff-requests/:reqId/reject
Request: PUT
Parameters:	request Id
Body: {HODComment: "Reason for rejection" }

Route: /staff-requests
Request: GET
Parameters:
Body:{ }


Route: /cc

Route: /slot-linking-requests/:reqId/accept
Request: PUT
Parameters: request Id
Body:{ }

Route: /slot-linking-requests/:reqId/reject
Request: PUT
Parameters: request Id
Body:{ccComment: "Reason for rejection }

Route:/slot-linking-requests
Request:	GET
Parameters:	
Body:{ }


Route: /academicMember

Route:/schedule
Request: GET
Parameters:
Body: { }

Route:/send-replacement-request
Request: POST
Parameters: 
Body: {"day":"2020-12-26","replacementID":"ac-2","slot":"3"}

Route: /replacement-requests
Request: GET
Parameters: 
Body: { }

Route: /replacement-requests/:id/accept
Request: PUT
Parameters: Request id
Body: { }


Route: /replacement-requests/:id/reject
Request: POST
Parameters: Request id
Body: { }

Route: /send-slot-linking-request
Request: POST
Parameters:
Body: {"day":"Saturday","slot":"3","room":"C5.103" }

Route: /slot-linking-requests
Request: GET
Parameters:
Body: { }

Route: /change-day-off-request
Request: POST
Parameters:
Body: {dayOff:"Monday",reason: ""}

Route: /send-leave-request
Request: POST
Parameters: 
Body: 
Annual leave:
{type:"annualLeave",day:"2020-04-22",reason: ""}
Accidental leave:
{type:"accidentalLeave",day:"2020-04-22",reason:""}
Compensation leave:
{type:"compensationLeave",day:"2020-04-22",reason:""}
Sick leave:
{type:"sickLeave",day:"2020-04-22",document:"googledrive.com/uploadedProofDocument",reason:"I had the corona virus"}
Maternity:
{type:"maternityLeave",day:"2020-04-22",document:"googledrive.com/uploadedProofDocument",duration:"70",reason:""}

Route: /all-requests/:filter
Request: GET
Parameters: filter: All, Accepted, Rejected or Pending
Body: {}

Route: /cancel-request/:id
Request: DELETE
Paramters: Request id
Body: {}
