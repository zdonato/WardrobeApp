let express = require('express'),
    router = express.Router(),
    formidable = require('formidable'),
    authenticate = require('../utilities/authenticate'),
    aws = require('aws-sdk'),
    fs = require('fs'),
    pipefy = require('pipefy'),
    s3 = new aws.S3(),
    AWS_HELPER = require('../utilities/AWSHelper'),
    errors = require('../utilities/errors'),
    spawn = require('child_process').spawn,
    ts = require('timestamp-util');

const AWS_BUCKET = 'pocket-closet-clothing-images';
let awsHelper = new AWS_HELPER();

// Override the putobject method.
let putObject = s3.putObject.bind(s3);

s3.putObject = (opts, cb) => {
    if (!opts.Body) {
        return pipefy(mapBody);
    }

    return putObject(opts, cb);

    function mapBody(buffer) {
        opts.Body = buffer;
        putObject(opts, cb);
    }
}

/**
 * @route('/clothing/add')
 * Handles uploading files.
 * Must set the encoding to be multipart/form-data
*/
router.post('/add', authenticate, (req, res) => {
    
    let form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.log(err);
        }

        // Create the clothing object from the fields.
        let clothingObj = {},
            userId;

        Object.keys(fields).forEach( (key) => {
            if (key !== 'submit') {
                clothingObj[key] = fields[key];
            }
        });

        try {
            userId = parseInt(fields.UserId);
        } catch (e) {
            let error = errors.BAD_REQUEST_ACTION('save a clothing item');
            res.status(error.code).send(error.error)
        }       

        // Add the item to the dynamodb.
        awsHelper.addItem(userId, clothingObj)
            .then( (item) => {
                if (files.fileToUpload) {
                    // Item saved successfully. Save the image to AWS Bucket.
                    let AWS_OPTS = {
                        Bucket: AWS_BUCKET,
                        ServerSideEncryption: 'AES256',
                        Key: item.ID,
                        ContentType: files.fileToUpload.type
                    };

                    fs.createReadStream(files.fileToUpload.path)
                        .pipe(s3.putObject(AWS_OPTS, (err, data) => {
                            if (err) {
                                console.log(err);
                            }

                            res.send('Success');
                        }));
                } else {
                    res.send('Success');
                }
                
            })
            .catch( (err) => {
                console.log(err);
                res.status(err.code).send({ error: err.error});
            });
    });
});

/**
 * @route("/clothing/recommendation/:userId")
 * Handles getting an outfit recommendation for a user.
 */
router.get('/recommendation/:userid', authenticate, (req, res) => {
    // Security check.
    if (req.params.userid != req.user.userId) {
        let error = errors.INVALID_CREDS;
        res.status(error.code).send(error.error);
        return;
    }

    // Run the recommendation algorithm script.
    let command = 'python3';
    let args = ['server/utilities/ReccomendationAlgorithm.py'];
    let proc = spawn(command, args);

    proc.stdout.on('data', (data) => {
        console.log(data.toString());
        let output = data.toString();

        output = output.replace(/'/g, '"');

        try {
            let recJson = JSON.parse(output);
            res.send(recJson);
        } catch (e)
        {
            let error = errors.GENERIC_SERVER;
            res.status(error.code).send(error.error);
        }

        return;
    });

    proc.stderr.on('data', (data) => {
        console.log(data.toString());
    });
});

router.get('/:userid', (req, res) => {
    let userId; 

    try {
        userId = parseInt(req.params.userid);
    } catch (e) {
        let error = errors.BAD_REQUEST_ACTION('save a clothing item');
        res.status(error.code).send(error.error)
    }   

    awsHelper.getWardrobe(userId)
        .then( (data) => {
            res.send(data);
        })
        .catch( (err) => {
            res.status(err.code).send({error: err.error});
        })
});

module.exports = router;