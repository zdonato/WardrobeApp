/**
 * Database helper class for AWS.
 * 
 * @author Zachary Donato
 * 10/26/17
 */
let AWS = require('aws-sdk'),
    ts = require('timestamp-util'),
    AWS_CONFIG = require('./configs/AWSConfig.js'),
    _ = require('lodash'),
    ERRORS = require('./errors')
    uuid = require('uuid/v1');

const TABLE_NAME = 'User_Clothing';

AWS.config.update({
    region: 'us-east-1'
});


/**
 * AWS database helper class.
 */
class AWSHelper {

    /**
     * Constructor.
     * 
     */
    constructor () {
        this._documentClient = new AWS.DynamoDB.DocumentClient();
    }

    /**
     * Method to add a new item to the table.
     * @param userID {String} - The id of the user
     * @param clothingObj {Object} - An object that identifies the piece of clothing via its properties
     * 
     * @return Returns a promise that resolves with the created item or rejects with an error
     */
    addItem(userId, clothingObj) {
        return new Promise((resolve, reject) => {
            // Check for undefined.
            if (_.isUndefined(userId) || _.isUndefined(clothingObj)) {
                logError('AWSHelper.addItem', 'UserId and clothingObj must be provided');
                reject(ERRORS.UNDEFINED_VAL('UserId and clothingObj'));
                return;
            }

            ts('Adding item for user ' + userId);

            // Grab the user's existing info to update.
            this.getWardrobe(userId)
                .then( (data) => {
                    // Add a unique id to the clothing object.
                    clothingObj.ID = uuid();
                    
                    let params = {
                        TableName: TABLE_NAME,
                        Item: {
                            User_Id: userId,
                            Wardrobe: data && data.Wardrobe ? data.Wardrobe.concat([clothingObj]) : [clothingObj]
                        }
                    };
        
                    this._documentClient.put(params, (err, data) => {
                        if (err) {
                            logError('AWSHelper.addItem this._documentClient.put', 'Error adding item to database', err);
                            reject(ERRORS.ADD_CLOTHING_ITEM);
                            return;
                        }
        
                        resolve(clothingObj);
                    });
                })
                .catch( (err) => {
                    reject(err);
                })
        });
    }

    /**
     * Method to get all clothing objects for a user
     * @param userId {Number} - The id of the user
     * 
     * @return Returns a promise that resolves with all items belonging to the user or rejects with an error
     */
    getWardrobe(userId) {
        return new Promise( (resolve, reject) => {
            // Check for undefined.
            if (_.isUndefined(userId)) {
                logError('AWSHelper.getWardrobe', 'UserId must be provided');
                reject(ERRORS.UNDEFINED_VAL('UserId'));
                return;
            }

            let params = {
                TableName: TABLE_NAME,
                Key: {
                    User_Id: userId
                }
            };

            this._documentClient.get(params, (err, data) => {
                if (err) {
                    logError('AWSHelper.getWardrobe this._documentClient.get', 'Error retrieving users items', err);
                    reject(ERRORS.GET_CLOTHING_ITEMS);
                    return;
                }

                resolve(data.Item || { error: 'There are no items in this wardrobe.'});
            });
        });
    }

    /**
     * Method to update a clothing object in the user's wardrobe.
     * @param userId {Number} - The id of the user
     * @param clothingId {String} - The id of the article of clothing to update.
     * @param updates {Object} - An object with the keys and values to be updated
     * 
     * @return Returns a promise that resolves with the updated clothing object or an error
     */
    updateItem(userId, clothingId, updates) {
        return new Promise( (resolve, reject) => {
            // Check for undefined.
            if (_.isUndefined(userId) || _.isUndefined(clothingId) || _.isUndefined(updates) || _.isEmpty(updates)) {
                logError('AWSHelper.updateItem', 'UserId, clothingId, and updates must be provided');
                reject(ERRORS.UNDEFINED_VAL('UserId, clothingId, and updates'));
                return;
            }

            // Retrieve the user's wardrobe.
            this.getWardrobe(userId)
                .then( (data) => {
                    // Find the index of the clothing item to update.
                    let idx = findClothingItem(clothingId, data.Wardrobe);

                    if (idx === -1) {
                        logError('AWSHelper.updateItem findClothingItem', 'Clothing item with this id does not exist');
                        reject(ERRORS.NO_CLOTHING_ITEM_FOUND);
                        return;
                    }

                    let params = generateUpdateParams(idx, userId, updates);

                    this._documentClient.update(params, (err, data) => {
                        if (err) {
                            logError('AWSHelper.updateItem this._documentClient.update', 'Error updating item', err);
                            reject(ERRORS.UPDATE_CLOTHING_ITEM);
                            return;
                        }

                        resolve(data);
                    });
                })
                .catch( (err) => {
                    reject(err);
                })
        });
    }

    /**
     * Method to delete an item of clothing.
     * @param userId {Number} - The id of the user
     * @param clothingId {String} - The id of the item of clothing
     * 
     * @return Returns a promise that resolves with the deleted item or rejects with an error.
     */
    deleteItem(userId, clothingId) {
        return new Promise( (resolve, reject) => {
            // Check for undefined.
            if (_.isUndefined(userId) || _.isUndefined(clothingId) ) {
                logError('AWSHelper.deleteItem', 'UserId and clothingId must be provided');
                reject(ERRORS.UNDEFINED_VAL('UserId and clothingId'));
                return;
            }

            // Retrieve the user's wardrobe.
            this.getWardrobe(userId)
                .then( (data) => {
                    // Find the index of the clothing item to update.
                    let idx = findClothingItem(clothingId, data.Wardrobe);

                    if (idx === -1) {
                        logError('AWSHelper.deleteItem findClothingItem', 'Clothing item with this id does not exist');
                        reject(ERRORS.NO_CLOTHING_ITEM_FOUND);
                        return;
                    }

                    let params = {
                        TableName: TABLE_NAME,
                        Key: {
                            User_Id: userId
                        }, 
                        UpdateExpression: `REMOVE Wardrobe[${idx}]`,
                        ReturnValues: 'ALL_OLD'
                    }

                    this._documentClient.update(params, (err, data) => {
                        if (err) {
                            logError('AWSHelper.deleteItem this._documentClient.update', 'Error deleting item', err);
                            reject(ERRORS.DELETE_CLOTHING_ITEM);
                            return;
                        }

                        resolve(data.Attributes.Wardrobe[idx]);
                    });
                })
                .catch( (err) => {
                    reject(err);
                })
        });
    }
}

function generateUpdateParams(idx, userId, updates) {
    let ret = {
        TableName: TABLE_NAME,
        Key: {
            User_Id: userId
        }, 
        UpdateExpression: 'set ',
        ExpressionAttributeValues: {},
        ReturnValues: 'ALL_NEW'
    };

    let keys = Object.keys(updates);
    
    keys.forEach( (k, index) => {
        ret.UpdateExpression += `Wardrobe[${idx}].${k} = :${index}`;
        ret.ExpressionAttributeValues[`:${index}`] = updates[k];

        if (index !== keys.length - 1) {
            ret.UpdateExpression += ', '
        } 
    });

    return ret;
}

function findClothingItem(id, wardrobe) {
    let idx = -1;

    wardrobe.some( (clothing, index) => {
        if (clothing.ID === id) {
            idx = index;
            return true;
        }
    });

    return idx;
}

function logError(fnName, msg, error) {
    ts(`ERROR: [${fnName}] ${msg}`);

    if (error) console.log(error);
}

module.exports = AWSHelper;
