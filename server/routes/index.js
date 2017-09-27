let express = require('express'),
    router = express.Router();

/**
 * @route('/')
 * Homepage route.
 */
router.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public/' });
});

module.exports = router;