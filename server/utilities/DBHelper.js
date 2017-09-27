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

class DBHelper {

    /**
     * Constructor.
     *
     */
    constructor () {
        this._pool = mysql.createPool(config);
    }

}
