# REST API Documentation

## Errors
All requests will send errors with an appropriate HTTP error code and a json object of the form unless otherwise specified:
```
{
    error: "Some error message"
}
```
_____

## Homepage (Website)

Route | Method(s)
:---: | ---
*/* | GET
#### Return
Returns ```index.html```, the root of the site.


____

## Login

Route | Method(s)
:---: | ---
*/login* | POST
#### Body
```
{
    "username": "email@domain.com",
    "password": "password",
    "NO_REDIRECT": true if you only want a text response on whether the user is authenticated or not
}
```

#### Return
On success redirects to */*

On error returns a Unauthorized 401 Code

___

## User Profile

Route | Method(s)
:---: | ---
*/profile/:userid* | GET

#### Return
```
{
    userId: Number
    firstName: String
    lastName: String
    email: String
    dob: String
}
```

_____

## User Registration
Route | Method(s)
:---: | ---
*/register* | POST

#### Body
```
{
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    dob: String
}
```

#### Return
```
{
    userId: Number
    firstName: String,
    lastName: String,
    email: String,
    dob: String
}
```
_____

## Reset Password
Route | Method(s)
:---: | ---
*/password/reset* | POST

#### Body
```
{
    oldPassword: String,
    newPassword: String,
    email: String
    code: String
}
```

#### Return
```
{
    success: Boolean
}
```

_____

## Forgot Password
Route | Method(s)
:---: | ---
*/password/forgot* | POST

This route will generate a reset code for the user and send an email to the address provided with a link to reset their password. The link will have reset_code and email in the query params for the front end to use.

#### Body
```
{
    email: String
}
```

#### Return
Message will be success if completed successfully.
```
{
    message: String
}
```

_____

## Reccomendation Engine
Route | Method(s)
:---: | ---
*/clothing/recommendation/:userid* | GET
This route will generate an outfit recommendation for the user given by userid.