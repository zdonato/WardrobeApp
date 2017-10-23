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
                reject(ERRORS.UNDEFINED_VAL_USER('Email and password'));
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
                this.getUserByKey('email', email, ['email'])
                    .then( (result) => {
                        // User was found, reject the attempt to create a new one.
                        logError('DBHelper.createUser this.getUserByKey', `User already exists with email ${email}`);
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
                                this.getUserByKey('email', email, ['userId', 'email', 'firstName', 'lastName', 'dob'])
                                    .then( (result) => { resolve(result); })
                                    .catch( (err) => { reject(err); });
                            });
                        });
                    });
            });
        })
    }

    /**
     * Method to retrieve a user's information by a key.
     * @param k {String} - The key (column) to retrieve the user by
     * @param v {String|Number} - The value to match the key to 
     * @param cols {Array.String} - The columns to return from the query
     * 
     * @return Returns a promise that resolves with the user object
     */
    getUserByKey(k, v, cols) {
        return new Promise( (resolve, reject) => {
            if (_.isUndefined(k) || _.isUndefined(v)) {
                logError('DBHelper.getUserByKey', 'Key and value must be defined', undefined);
                reject(ERRORS.USER_INFO_ERR);
                return;
            }

            if (!Array.isArray(cols) || _.isEmpty(cols) || _.isUndefined(cols)) {
                logError('DBHelper.getUserByKey', 'Columns must be an array of columns to return', undefined);
                reject(ERRORS.USER_INFO_ERR);
                return;
            }

            const sql = 'SELECT ' + cols.join(", ") + ` FROM Accounts WHERE ${k} = ?`;

            ts(`[DBHelper.getUserByKey] getting user ${v}`);
            
            this._pool.getConnection( (err, connection) => {
                if (err) {
                    logError('DBHelper.getUserByKey this._pool.getConnection', 'Error getting connection from pool', err);
                    reject(ERRORS.DB_CONN_ERR);
                    return;
                }

                // Query for the user.
                connection.query(sql, v, (err, result) => {
                    // Release connection.
                    connection.release();

                    if (err) {
                        logError('DBHelper.getUserByKey connection.query', 'Error retrieving user information', err);
                        reject(ERRORS.USER_INFO_ERR);
                        return;
                    }

                    if (_.isEmpty(result)) {
                        logError('DBHelper.getUserByKey connection.query', 'No user exists for this email', undefined);
                        reject(ERRORS.NO_USER_FOUND);
                        return;
                    }

                    resolve(result[0]);
                });
            });
        });
    }

    /**
     * Method to log a user in.
     * @param email {String} - The user's email
     * @param token {String} - The user's authentication token
     * 
     * @return Returns a promise that resolves with the user's email and authentication token.
     */
    setUserToken(email) {

    }
}

function logError(fnName, msg, error) {
    ts(`ERROR: [${fnName}] ${msg}`);

    if (error) console.log(error);
}

module.exports = DBHelper;