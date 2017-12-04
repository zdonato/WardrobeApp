const express = require('express');
let router = express.Router();
let passport = require('passport');

router.post('/', 
    passport.authenticate('local'), 
    (req, res) => {
        // User is authenticated.
        if (req.body.NO_REDIRECT) {
            res.send("Authenticated");
        } else {
            res.redirect('/');
        }
    }
);

module.exports = router;