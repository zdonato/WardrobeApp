/**
 * Database helper class to interact with the sql database.
 * @author Zachary Donato
 * 9/27/17
 */
let mysql = require('mysql'),
    ts = require('timestamp-util'),
    moment = require('moment'),
    crypto = require('crypto'),
    bcrypt = require('bcrypt'),
    _ = require('lodash'),
    config = require('./config');


const SALT_ROUNDS = 10;
const CONNECTION_LIMIT = 100;
const ERRORS = require('./errors');

/**
 * DBHelper class.
 */
class DBHelper {

    /**
     * Constructor.
     *
     */
    constructor () {
        this._pool = mysql.createPool(config);
    }

    /**
     * Method to add a new user to the database.
     * @param fname {String} - The first name of the user
     * @param lname {String} - The last name of the user
     * @param email {String} - The user's email, also functions as their username
     * @param password {String} - The user's password
     * @param dob {String} - A string of the user's date of a birth
     * 
     * @return Returns a promise that resolves with the created user's id or error.
     */
    createUser(fname, lname, email, password, dob) {
        return new Promise( (resolve, reject) => {
            // Check for undefined required vars.
            if (_.isUndefined(email) || _.isUndefined(password)) {
                logError('DBHelper.createUser', 'Email and password must be defined', undefined);
                reject(ERRORS.UNDEFINED_VAL_USER);
                return;
            }

            ts(`[DBHelper.createUser] Adding user ${email}`);
            this._pool.getConnection( (err, connection) => {
                if (err) {
                    logError('DBHelper.createUser', 'Error getting connection from pool', err);
                    reject(ERRORS.DB_CONN_ERR);
                    return;
                }

                // First check if the user with this email already exists.
                this.getUserByEmail(email)
                    .then( (result) => {
                        // User was found, reject the attempt to create a new one.
                        logError('DBHelper.createUser this.getUserByEmail', `User already exists with email ${email}`);
                        reject(ERRORS.USER_TAKEN);
                        return;
                    })
                    .catch( (err) => {
                        // No user exists, create the new account.
                        let sql = 'INSERT INTO `Accounts` (`firstName`, `lastName`, `email`, `password`, `dob`) VALUES (?, ?, ?, ?, ?)';

                        bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
                            if (err) {
                                logError('DBHelper.createUser bcrypt.hash', 'Error generating hash', err);
                                reject(ERRORS.CREATE_USER_ERR);
                                return;
                            }

                            connection.query(sql, [fname, lname, email, hash, dob], (err, result) => {
                                // Release connection.
                                connection.release();

                                if (err) {
                                    logError('DBHelper.createUser connection.query', 'Error adding user to database', err);
                                    reject(ERRORS.CREATE_USER_ERR);
                                    return;
                                }

                                // User created successfully. Return the user object.
                                this.getUserByEmail(email)
                                    .then( (result) => { resolve(result); })
                                    .catch( (err) => { reject(err); });
                            });
                        });
                    });
            });
        })
    }

    /**
     * Method to retrieve a user's information by email.
     * @param email {String} - The user's email
     * 
     * @return Returns a promise that resolves with the a user object
     */
    getUserByEmail(email) {
        return new Promise( (resolve, reject) => {
            const sql = 'SELECT UserId, email, firstName, lastName, dob FROM Accounts WHERE email = ?';
            ts(`[DBHelper.getUserByEmail] getting user ${email}`);
            
            this._pool.getConnection( (err, connection) => {
                if (err) {
                    logError('DBHelper.getUserByEmail this._pool.getConnection', 'Error getting connection from pool', err);
                    reject(ERRORS.DB_CONN_ERR);
                    return;
                }

                // Query for the user.
                connection.query(sql, email, (err, result) => {
                    // Release connection.
                    connection.release();

                    if (err) {
                        logError('DBHelper.getUserByEmail connection.query', 'Error retrieving user information', err);
                        reject(ERRORS.USER_INFO_ERR);
                        return;
                    }

                    if (_.isEmpty(result)) {
                        reject(ERRORS.NO_USER_FOUND);
                        return;
                    }

                    resolve(result[0]);
                });
            });
        });
    }
}

function logError(fnName, msg, error) {
    ts(`ERROR: [${fnName}] ${msg}`);

    if (error) console.log(error);
}

module.exports = DBHelper;