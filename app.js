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
    timestamp = require('timestamp-util'),
    passport = require('passport'),
    session = require('express-session'),
    LocalStrategy = require('passport-local').Strategy,
    DBHelper = require('./server/utilities/DBHelper'),
    bcrypt = require('bcrypt'),
    errors = require('./server/utilities/errors'),
    PORT = 9001;

/* Route imports */
let index = require('./server/routes/index');
let login = require('./server/routes/login');

const app = express();
const helper = new DBHelper();

/* App configuration */
app.set('port', PORT);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser('WardrobeApp'));
app.use(session({ secret: 'WardrobeApp', saveUninitialized: true, resave: false}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser( (email, done) => {
    helper.getUserByKey('email', email, ['email'])
        .then( (result) => {
            done(null, result);
        })
        .catch( (err) => {
            done(err, null);
        });
});

// Use the local strategy for passport.
passport.use(new LocalStrategy({
    passReqToCallback: true
    },
    (req, email, password, done) => {
        helper.getUserByKey('email', email, ['email', 'password'])
            .then( (user) => {
                bcrypt.compare(password, user.password, (err, res) => {
                    if (err || !res) {
                        timestamp('Invalid credentials for user ' + email);
                        return done(null, false, errors.INVALID_CREDS);
                    }

                    delete user.password;
                    timestamp('User ' + email + ' has been logged in');
                    return done(null, user);
                }); 
            })
            .catch( (err) => {
                console.log(err);
                return done(null, false, err);
            });
    }
));

// Set up routes.
app.use('/', index);
app.use('/public', express.static(path.join(__dirname, 'public/')));
app.use('/login', login);

/* Redirect 404's to homepage */
app.use((req, res, next) => {
    res.redirect('/');
});

const server = http.createServer(app);
server.listen(PORT);

timestamp(`Server listening on port ${PORT}...`);