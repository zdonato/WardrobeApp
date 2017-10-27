/**
 * Database helper class for AWS.
 * 
 * @author Zachary Donato
 * 10/26/17
 */
let AWS = require('aws-sdk'),
    ts = require('timestamp-util'),
    AWS_CONFIG = require('./configs/AWSConfig.js');

AWS.config.update({
    region: 'us-east-1'
});

var dynamodb = new AWS.DynamoDB();
