const express = require('express');
const authenticate = require('../utilities/authenticate');
let router = express.Router();
let DBHelper = require('../utilities/DBHelper');
let _ = require('lodash');
let errors = require('../utilities/errors');

const helper = new DBHelper();

/**
 * @route("/profile")
 * @method("GET")
 * 
 * @return Returns an error that no userId was provided
 */
router.get('/', authenticate, (req, res) => {
    let err = errors.UNDEFINED_VAL('userId');

    res.status(err.code).send(err.error);
});

/**
 * @route('/profile/:userid')
 * @method("GET")
 * 
 * @return Returns a json object containing the user's profile information or an error object
*/
router.get('/:userid', authenticate, (req, res) => {
    let userId = req.params.userid;

    if (_.isUndefined(userId)) {
        let err = errors.UNDEFINED_VAL('userId');
        res.status(err.code).send(err.error);
        return;
    }

    helper.getUserByKey('userId', userId, ['userId', 'lastName', 'firstName', 'email', 'dob'])
        .then( (user) => {
            res.send(user);
        })
        .catch( (err) => {
            res.status(err.code).send({ error: err.error});
        });
});

module.exports = router;