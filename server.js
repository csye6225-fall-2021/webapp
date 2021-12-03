var express    = require("express");
var login = require('./routes/loginroutes');
var bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
var app = express();
const log = require("./logs")
const logger = log.getLogger('logs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
    // res.header("Access-Control-Allow-Origin", "*");
    // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Origin', '*'); //replace localhost with actual host
    res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, PATCH, POST, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');

    next();
});
var router = express.Router();

// test route
router.get('/', function(req, res) {
    res.status(200).send("final test")
    // res.json({ message: 'Test API' });
});

//route to handle user registration
router.post('/user',login.register);
router.get('/user/self', login.checkIsVerified,login.getDetails);
router.put('/user/self',login.checkIsVerified,login.update);
//router.post('/user/self/pic',login.uploadPic);
router.post('/user/self/pic',login.checkIsVerified,login.uploadPic)
router.get('/user/self/pic',login.checkIsVerified,login.viewPic)
router.delete('/user/self/pic', login.checkIsVerified,login.deletePic)

router.get('/verifyUserEmail', login.verifyToken)


app.use('/v1', router);
app.listen(8000);
logger.info("Application running");

module.exports = app