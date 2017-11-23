let express = require('express'),
    router = express.Router(),
    DBHelper = require('../utilities/DBHelper'),
    errors = require('../utilities/errors'),
    _ = require('lodash');

const helper = new DBHelper();

/**
 * @route('/register')
 * Handles registering a user.
 */
router.post('/', (req, res) => {
    let fname = req.body.firstName,
        lname = req.body.lastName,
        email = req.body.email,
        password = req.body.password,
        dob = req.body.dob;

    // Only email and password are required.
    if (_.isUndefined(email) || _.isUndefined(password)) {
        let err = errors.BAD_REQUEST_ACTION('register a user');

        res.status(err.code).send(err.error);
        return;
    }

    helper.createUser(fname, lname, email, password, dob)
        .then( (result) => {
            res.send(result);
        })
        .catch( (err) => {
            res.status(err.code).send(err.error);
        });
});

module.exports = router;