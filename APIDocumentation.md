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
