const express = require('express');
let router = express.Router();
let _ = require('lodash');
let errors = require('../utilities/errors');
let DBHelper = require('../utilities/DBHelper');
let ts = require('timestamp-util');

const helper = new DBHelper();

/**
 * @route("/password/reset")
 * @method("POST")
 * 
 * @return Returns an error or success message.
 */
router.post('/reset', (req, res) => {
    var body = req.body;

    // Ensure all the fields are present.
    if (_.isUndefined(body) || _.isUndefined(body.oldPassword)
        || _.isUndefined(body.newPassword) || _.isUndefined(body.code) 
        || _.isUndefined(body.email)) {

        let err = errors.BAD_REQUEST_ACTION('reset a password');
        res.status(err.code).send({ error: err.error });
        return;
    }

    // Retrieve code for resetting the password stored on the user object
    // in the DB.
    helper.getResetPassCode(body.email)
        .then( (result) => {
            // Check if code matches the one provided or that there is a reset_code.
            if (result.reset_code === null || result.reset_code !== body.code) {
                let err = errors.INVALID_CREDS;
                res.status(err.code).send({ error: err.error });
                return;
            }

            return helper.changePassword(body.email, body.oldPassword, 
                                            body.newPassword);
        })
        .then( (result) => {
            // Handle result for chaning password.
            res.send(result);
        })
        .catch( (err) => {
            res.status(err.code || 500).send({ error: err.error });
        });
});

/**
 * @route("/password/forgot")
 * @method("POST")
 * 
 * @return Returns an error or success message.
 */
router.post('/forgot', (req, res) => {

    // Request must have an email address.
    if (_.isUndefined(req.body) || _.isUndefined(req.body.email)) {
        let err = errors.BAD_REQUEST_ACTION('start a password reset');
        res.status(err.code).send({ error: err.error });
        return;
    }

    // Start the password reset process.
    helper.generatePasswordReset(req.body.email)
        .then( (result) => {
            res.send(result);
        })
        .catch( (err) => {
            res.status(err.code || 500).send(err);
        });
});

module.exports = router;