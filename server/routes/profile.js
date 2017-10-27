const express = require('express');
const authenticate = require('../utilities/authenticate');
let router = express.Router();

router.get('/', authenticate, (req, res) => {
    
});

module.exports = router;