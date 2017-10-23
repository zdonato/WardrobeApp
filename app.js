/**
 * Express application server file. 
 * @author Zachary Donato
 * 9/27/17
 */
let express = require('express'),
    http = require('http'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    helmet = require('helmet'),
    path = require('path'),
    timestamp = require('timestamp-util');
    PORT = 9001;

/* Route imports */
let index = require('./server/routes/index');

const app = express();

/* App configuration */
app.set('port', PORT);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser('WardrobeApp'));

// Set up routes.
app.use('/', index);
app.use('/public', express.static(path.join(__dirname, 'public/')));

/* Redirect 404's to homepage */
app.use((req, res, next) => {
    res.redirect('/');
});

const server = http.createServer(app);
server.listen(PORT);

timestamp(`Server listening on port ${PORT}...`);

let DBHelper = require('./server/utilities/DBHelper');

let helper = new DBHelper();

helper.getUserByEmail('zacharyadonato@gmail.com')
    .then( (res) => {
        console.log(res);
    })
    .catch( (err) => {
        console.log(err);
    });