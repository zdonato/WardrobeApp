/**
 * Database helper class to interact with the sql database.
 * @author Zachary Donato
 * 9/27/17
 * 
 * All errors will be returned with user friendly error messages to send.
 */
let mysql = require('mysql'),
    ts = require('timestamp-util'),
    moment = require('moment'),
    crypto = require('crypto'),
    bcrypt = require('bcrypt'),
    _ = require('lodash'),
    config = require('./configs/SQLconfig.js'),
    nodemailer = require('nodemailer'),
    emailConfig = require('./configs/emailConfig'),
    mustache = require('mustache'),
    AWS_HELPER = require('../utilities/AWSHelper');

let awsHelper = new AWS_HELPER();

let transporter = nodemailer.createTransport(emailConfig);

// Email templates.
let EMAIL_RESET_PASS = require('../templates/email_reset_password');

const SALT_ROUNDS = 10;
const CONNECTION_LIMIT = 100;
const ERRORS = require('./errors');
const ACCOUNTS_TABLE = 'Accounts';
const EXPIRE_TIME_PW_HOURS = 24;

const TEMPLATES = {
    EMAIL_RESET_PASS: EMAIL_RESET_PASS
};

let DEFAULT_CLOTHING_OBJ = {
    Accessories: {
        Bag: [],
        Belt: [],
        Collar: [],
        Neck: [],
        Other: [],
        Piercings: [],
        Wrist: []
    },
    Bottoms: [],
    Footwear: [],
    Hat: [],
    OverTops: [],
    Tops: []
};

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
                reject(ERRORS.UNDEFINED_VAL('Email and password'));
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
                        let sql = `INSERT INTO ${ACCOUNTS_TABLE} (\`firstName\`, \`lastName\`, \`email\`, \`password\`, \`dob\`) VALUES (?, ?, ?, ?, ?)`;

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
                                    .then( (result) => { 
                                        // Add the empty clothing object to the user.
                                        awsHelper.addItem(result.userId, DEFAULT_CLOTHING_OBJ, true)
                                            .then( (addResult) => {
                                                resolve(result);
                                            })
                                            .catch( (err) => { reject(err); });
                                    })
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

            const sql = 'SELECT ' + cols.join(", ") + ` FROM ${ACCOUNTS_TABLE} WHERE ${k} = ?`;

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
     * Method to change a user's password.
     * 
     * @param email {String} - The email of the user
     * @param oldPassword {String} - The user's old password
     * @param newPassword {String} - The user's new password
     * 
     * @return Returns a promise that resolves with a success or error message.
     */
    changePassword(email, oldPassword, newPassword) {
        return new Promise( (resolve, reject) => {
            if (_.isUndefined(email) || _.isUndefined(oldPassword) || _.isUndefined(newPassword)) {
                logError('DBHelper.changePassword', 'Email, old password, and new password must be provided', undefined);
                reject(ERRORS.BAD_REQUEST_ACTION('change password'));
                return;
            }

            // Retrieve the user to compare the old password before changing.
            this.getUserByKey('email', email, ['email', 'password'])
                .then( (user) => {
                    bcrypt.compare(oldPassword, user.password, (err, res) => {
                        if (err || !res) {
                            logError('DBHelper.changePassword bcrypt.compare', 'Error comparing passwords', undefined);
                            reject(ERRORS.INVALID_CREDS);
                            return;
                        }

                        // User is validated, change the password now.
                        this._pool.getConnection( (err, connection) => {
                            if (err) {
                                logError('DBHelper.changePassword this._pool.getConnection', 'Error getting connection from pool', err);
                                reject(ERRORS.DB_CONN_ERR);
                                return;
                            }

                            bcrypt.hash(newPassword, SALT_ROUNDS, (err, hash) => {
                                if (err || !res) {
                                    logError('DBHelper.changePassword bcrypt.hash', 'Error hashing passwords', undefined);
                                    reject(ERRORS.GENERIC_SERVER);
                                    return;
                                }

                                let sql = `UPDATE ${ACCOUNTS_TABLE} SET \`password\`=?, reset_code = NULL WHERE \`email\`=?`;
                                
                                ts(`[DBHelper.changePassword] Attempting to change password for user ${email}`);

                                connection.query(sql, [hash, email], (err, result) => {
                                    if (err) {
                                        logError('DBHelper.changePassword connection.query', 'Error changing user password', err);
                                        reject(ERRORS.DB_CONN_ERR);
                                        return;
                                    }
                                    
                                    ts(`[DBHelper.changePassword] Successfully changed password for user ${email}`);

                                    resolve({
                                        message: 'Successfully changed user password'
                                    });
                                });
                            })
                        })
                    })
                })
                .catch( (err) => {
                    reject(err);
                    return;
                })
        });
    }

    /**
     * Method to update the fields on a user.
     * 
     * @param email {String} - The email of the user.
     * @param fields {Array.string} - The fields to update
     * @param values {Array.Any} - The values to update the fields to
     * 
     * @return Returns a promise that resolves or rejects with success or error
     */
    updateUserFields(email, fields, values) {
        return new Promise( (resolve, reject) => {
            if (_.isUndefined(email) || _.isEmpty(fields) || _.isEmpty(values)) {
                logError('DBHelper.updateUserFields', 'Email, fields, and values must be provided', undefined);
                reject(ERRORS.BAD_REQUEST_ACTION('update user fields'));
                return;
            }

            this._pool.getConnection( (err, connection) => {
                if (err) {
                    logError('DBHelper.updateUserFields this._pool.getConnection', 'Error getting connection from pool', err);
                    reject(ERRORS.DB_CONN_ERR);
                    return;
                }

                let sql = generateUpdateStmt(fields, values);

                values.push(email);

                connection.query(sql, values, (err, result) => {
                    if (err) {
                        logError('DBHelper.updateUserFields connection.query', 'Error updating user fields', err);
                        reject(ERRORS.DB_CONN_ERR);
                        return;
                    }

                    ts(`Successfully updated [${fields.join(', ')}] for user ${email}`)
                    resolve({
                        message: 'Successfully updated user fields'
                    });
                });
            })
        });
    }

    /**
     * Method to retrieve the password reset code from the user.
     * 
     * @param email {String} - The email of the user.
     * 
     * @return Returns a promise that resolves with the user id, email, and reset code of the user.
     */
    getResetPassCode(email) {
        return this.getUserByKey('email', email, ['reset_code']);
    }

    /**
     * Method for starting a password reset.
     * 
     * @param email {String} - The email of the user.
     * 
     * @return Returns a promise that resolves with a success message or error.
     */
    generatePasswordReset(email) {
        return new Promise( (resolve, reject) => {
            // Check to ensure email is provided.
            if (_.isUndefined(email)) {
                logError('DBHelper.generatePasswordReset', 
                    'Email must be provided', undefined);
                reject(ERRORS.UNDEFINED_VAL('email'));
                return;
            }

            ts(`Generating password reset code for ${email}`)

            // Generate reset code.
            crypto.randomBytes(32, (err, buf) => {
                if (err) {
                    logError('DBHelper.generatePasswordReset crypto.randomBytes',
                                undefined, err);
                    reject(ERRORS.GENERIC_SERVER);
                    return;
                }

                let code = buf.toString('hex');

                // Create expire time and add to the DB. 
                let expiresAt = moment().add(EXPIRE_TIME_PW_HOURS, 'hours').format();

                this.updateUserFields(email, ['reset_code', 'expires_at'], [code, expiresAt])
                    .then( (result) => {
                        // Send an email to the provided address with a link to reset the password.
                        let data = {
                            link: 'http://localhost:9001/reset-password',
                            code: code,
                            email: email
                        };

                        let opts = generateMailOpts('Wardrobe App - Reset Password', email,
                                                    'EMAIL_RESET_PASS', data);

                        transporter.sendMail(opts, (err, info) => {
                            if (err) {
                                logError('DBHelper.generatePasswordReset transporter.sendMail',
                                         undefined, err);
                                reject(ERRORS.GENERIC_SERVER);
                                return;
                            }

                            ts(`Successfully generated password reset for ${email}`);
                            resolve({
                                message: "success"
                            });
                        });
                    })
                    .catch( (err) => {
                        logError('DBHelper.generatePasswordReset updateUserFields', undefined, err);
                        reject(err);
                        return;
                    });
            });
        });
        
    }
}

function logError(fnName, msg, error) {
    ts(`ERROR: [${fnName}] ${msg}`);

    if (error) console.log(error);
}

function generateUpdateStmt(fields) {
    let sql = `UPDATE ${ACCOUNTS_TABLE} SET `;

    fields.forEach((field, idx) => {
        if (field === 'userId' || field === 'password') {
            return;
        }

        sql += `\`${field}\`=? `;

        if (idx != fields.length - 1) {
            sql += ', ';
        }
    });

    sql += 'WHERE \`email\`=?';

    return sql;
}

/**
 * 
 * @param subject {String} - The subject of the email
 * @param to {String} - The address to send the email to
 * @param template {String} - The template to use for the email
 * @param data {Object} - An object of values to apply in the template
 */
function generateMailOpts(subject, to, template, data) {
    let opts = {
        from: 'Wardrobe App <noreplywardrobeapp@gmail.com',
        to: to,
        subject: subject
    };

    // Look for template.
    if (!TEMPLATES[template]) { return "Must provide template to use."; }

    opts.text = mustache.render(TEMPLATES[template], data);
    return opts;
}

module.exports = DBHelper;