Route: /hod

Route: /staff-requests/:reqId/accept
Request: POST
Parameters:	reqId
Body:{ }

Route: /staff-requests/:reqId/reject
Request:	POST
Parameters:	reqId
Body: {HODComment: "Reason for rejection" }

Route: /staff-requests
Request: GET
Parameters:
Body:{ }


Route: /cc

Route: /slot-linking-requests/:reqId/accept
Request: POST
Parameters: reqId
Body:{ }

Route: /slot-linking-requests/:reqId/reject
Request: POST
Parameters: reqId
Body:{ccComment: "Reason for rejection }

Route:/slot-linking-requests
Request:	GET
Parameters:	
Body:{ }


Route: /academicMember

Route:/send-replacement-request
Request: POST
Parameters: 
Body: {day:"11/12/2020", slot:"2",replacementID:"ac-3",reason:"reason" }

Route: /replacement-requests
Request: GET
Parameters: 
Body: { }

Route: /replacement-requests/:id/accept
Request: POST
Parameters: id
Body: { }


Route: /replacement-requests/:id/reject
Request: POST
Parameters: id
Body: {}

Route: /send-slot-linking-request
Request: POST
Parameters:
Body: {day:"Saturday",slot:"3",course:"CSEN 501",room:"c5.202" }

Route: /slot-linking-requests
Request: GET
Parameters:
Body: {}

Route: /change-day-off-request
Request: POST
Parameters:
Body: {dayOff:"Monday",reason: ""}

Route: /send-leave-request
Request: POST
Parameters: 
Body: 
Annual leave:
{type:"annualLeave",id:"6" (incase a replacement request has already been sent to another staff member)
,day:"15/4/2020",reason: ""(incase no replacement request has been sent }
Accidental or compensation leave:
{type:"accidentalLeave"||"compensationLeave",day:"15/1/2020",reason:""}
Sick leave:
{type:"sickLeave",day:"15/01/2020",document:"googledrive.com/uploadedProofDocument",reason:"I had the corona virus"}
Maternity:
{type:"maternityLeave",day:"15/01/2020",document:"googledrive.com/uploadedProofDocument",duration:"70",reason:""}

Route: /all-requests/:filter
Request: GET
Parameters: filter: All, Accepted, Rejected or Pending
Body: {}

Route: /cancel-request/:id
Request: GET
Paramters: id
Body: {}
