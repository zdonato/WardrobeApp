/**
 * An object containing common error messages.
 */

module.exports = {
    DB_CONN_ERR: {
        error: 'Error connecting to the database',
        code: 500
    },
    USER_INFO_ERR: {
        error: 'Error retrieving user information',
        code: 500
    },
    NO_USER_FOUND: {
        error: 'No user was found with this email',
        code: 404
    },
    USER_TAKEN: {
        error: 'A user already exists with this email',
        code: 403
    },
    CREATE_USER_ERR: {
        error: 'Error creating user',
        code: 500
    },
    UNDEFINED_VAL_USER: (val) => {
        return {
            error: `${val} must be defined`,
            code: 400
        };
    },
    INVALID_CREDS: {
        error: 'Invalid credentials',
        code: 401
    }
};