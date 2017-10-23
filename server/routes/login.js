const express = require('express');
let router = express.Router();
let passport = require('passport');

router.post('/', 
    passport.authenticate('local'), 
    (req, res) => {
        // User is authenticated.
        res.redirect('/');
    }
);

module.exports = router;