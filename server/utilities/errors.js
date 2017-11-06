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
    UNDEFINED_VAL: (val) => {
        return {
            error: `${val} must be defined`,
            code: 400
        };
    },
    INVALID_CREDS: {
        error: 'Invalid credentials',
        code: 401
    },
    BAD_REQUEST_ACTION: (action) => {
        return {
            error: `The request to ${action} does not contain all of the information it needs`,
            code: 400
        }
    },
    GENERIC_SERVER: {
        error: 'There was an error processing this request',
        code: 500
    },
    ADD_CLOTHING_ITEM: {
        error: 'There was an error adding this item of clothing to the database',
        code: 500
    },
    GET_CLOTHING_ITEMS: {
        error: 'There was an error retrieving the items for this user',
        code: 404
    },
    UPDATE_CLOTHING_ITEM: {
        error: 'There was an error updating this item',
        code: 500
    },
    DELETE_CLOTHING_ITEM: {
        error: 'There was an error deleting this item',
        code: 500
    },
    NO_CLOTHING_ITEM_FOUND: {
        error: 'Clothing item with this id does not exist',
        code: 404
    }
};