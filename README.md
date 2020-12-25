# GUC_Staff_Portal
Web portal for GUC staff members


- File to launch the server: index.js


- Port : "PORT" field in .env file in the root directory


- Notes:
    - The current user id is known from the token, not entered in the request body as well as his/her role.
    - Authentication based on the token


- Functionalities:

### Functionality: Reset the database
    - Route: /reset
    - Request type: POST
    - Request body: { "reset": true }
    - Response: Message indicating if the reset was done or not.
    - Example of response: "Reset done successfully."
    - Notes: In order to have initial access to the system this route also saves a default user "hr-1" in the database, with email "user@guc.edu.eg" and the deafult password "123456". It also saves a room
    "C7.305" which is the users's office as it is a required field.

Functionality: Log in to the system
Route: /staff/login
Request type: POST
Request body: { "email": "user@guc.edu.eg", "password": "123456" }
Response: Message indicating if the user entered the correct data and logged in successfully.
Example of response: "Logged in successfully."

Functionality: Log out from the system
Route: /staff/logout
Request type: POST
Response: Message indicating that the user logged out successfully.
Example of response: "Logged out successfully."

Functionality: Change the password of the user
Route: /change-password
Request type: PUT
Request body: { "oldPassword": "123456", "newPassword": "guc" }
Response: Redirect to the login page if the password changed successfully, if not then a message indicating the error that happened.
Notes: This is used to change the user's password in general and also to reset the password on first login.

Functionality: 
Route: /
Request type: 
Parameters: 
Example of how to call the route:
Request body:  
Response: 
Example of response: 
Notes: 
