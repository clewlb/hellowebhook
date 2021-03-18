var path = require('path');
var app = require(path.join(__dirname, '../app'));
var Promise = require('promise');
var logging = require(path.join(__dirname, 'logging'));

var database = require(path.join(__dirname, '../models/database'));
var DD = require(path.join(__dirname, '../models/designDocs'));
var CryptoJS = require("crypto-js");
const uuid4 = require('uuid4');
const axios = require('axios');

var x = {};

function getSignatureFromApiKeyAndMessage(apiKey, msgs) {
    var api_token = uuid4().toUpperCase();
    var output = {
        api_token: api_token,
        api_secret: CryptoJS.SHA256(apiKey + api_token + msgs.toString()).toString()
    }
    return output;
}

function verifySubscribeData(data) {
    return new Promise(function(resolve, reject) {
        resolve({
            ok: 200,
            data: data
        });
    });
}

function verifyEndPoint(data) {
    return new Promise(function(resolve, reject) {

        var token = uuid4().toUpperCase();
        var message = "Test Endpoint";
        var secret = CryptoJS.SHA256(data.api_key + token + message).toString();

        var httpBody = {
            api_token: token,
            api_secret: secret,
            message: message
        };

        const config = {
            method: 'post',
            url: data.notification_url,
            data: httpBody
        };
        axios(config)
            .then(function(results) {
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                reject({
                    err: 400,
                    msg: constants.COMMUNICATION_ERROR,
                    data: err
                });

            });

    });
}

function putSubscribeData(data) {
    return new Promise(function(resolve, reject) {
        var localizedId = 'profile-' + data.mid;
        var profileDoc;
        database.getDocWithDbAndDocId(app.appCfg.db.ntfDB, localizedId)
            .then(function(status) {
                // console.log('putData, getDocWithDbAndDocId, status = ', status);
                profileDoc = status.data;
                profileDoc.notification_url = data.notification_url;
                return verifyEndPoint(profileDoc);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                return database.putDocsWithDbAndDDocs(app.appCfg.db.ntfDB, [profileDoc]);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                // console.log('putData, err = ', err);
                reject(err);
            });
    });
}

x.subscribe = function(data) {
    return new Promise(function(resolve, reject) {
        verifySubscribeData(data)
            .then(function(status) {
                return putSubscribeData(data);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                // console.log("x.subscribe, status = ", status);
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                console.log("x.subscribe, err = ", err);
                reject(err);
            });
    });
}

function verifyInitData(data) {
    return new Promise(function(resolve, reject) {
        resolve({
            ok: 200,
            data: data
        });
    });
}

function verifyEndPoint(data) {
    return new Promise(function(resolve, reject) {
        var httpBody = getSignatureFromApiKeyAndMessage(data.api_key, ["Test Endpoint"]);
        httpBody.payload = {
            message: "Test Endpoint"
        };
        const config = {
            method: 'post',
            url: data.notification_url,
            data: httpBody
        };
        axios(config)
            .then(function(results) {
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                reject({
                    err: 400,
                    msg: constants.COMMUNICATION_ERROR,
                    data: err
                });
            });
    });
}

function updateMsgDoc(msgDoc, result) {
    console.log('updateMsgDoc result = ', result);
    if (msgDoc && msgDoc.results) {
        if (result.data) {
            msgDoc.results.push(result.data);
        } else {
        	msgDoc.results.push(result);
        }

        if (result.status == 200) {
            msgDoc.status = "success";
        }
        if (msgDoc.results.length >= 5 && msgDoc.status == "pending") {
            msgDoc.status = "failed";
        }
    }
    console.log('updateMsgDoc msgDoc = ', msgDoc)
    return database.putDocsWithDbAndDDocs(app.appCfg.db.ntfDB, [msgDoc]);
}

function sendNotification(msgDoc) {
    // console.log('sendNotification, msgDoc = ', msgDoc);
    return new Promise(function(resolve, reject) {
        database.getDocWithDbAndDocId(app.appCfg.db.ntfDB, 'profile-' + msgDoc.mid)
            .then(function(status) {
                // console.log('sendNotification, getDocWithDbAndDocId, status = ', status);


                var httpBody = getSignatureFromApiKeyAndMessage(status.data.api_key, [msgDoc._id, "John", 30, "New York"]);
                httpBody.payload = {
                    idempotency_id: msgDoc._id,
                    name: "John",
                    age: 30,
                    city: "New York"
                };

                const config = {
                    method: 'post',
                    url: status.data.notification_url,
                    data: httpBody
                };

                console.log('sendNotification, config = ', config);
                return axios(config);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(result) {
                resolve({
                    ok: 200,
                    data: result
                });
            })
            .catch(function(err) {
                // console.log('sendNotification, err.code = ', err.code);
                // reject({
                //     err: 400,
                //     msg: constants.COMMUNICATION_ERROR,
                //     data: err
                // });
                resolve({
                    ok: 400,
                    data: err.code
                });
            });
    });
}

function putInitData(data) {
    return new Promise(function(resolve, reject) {
        var profileDoc;
        var msgDoc;
        database.getDocWithDbAndDocId(app.appCfg.db.ntfDB, 'profile-' + data.mid)
            .then(function(status) {
                // console.log('putInitData, getDocWithDbAndDocId, status = ', status);
                profileDoc = status.data;
                msgDoc = {
                    _id: "msg_" + data.mid + "_" + +new Date() + "_" + uuid4().toUpperCase(),
                    docType: "msg",
                    mid: data.mid,
                    payload: data.payload,
                    results: [],
                    status: 'pending'
                };
                return sendNotification(msgDoc);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                return updateMsgDoc(msgDoc, status.data);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                // console.log('putData, err = ', err);
                reject(err);
            });
    });
}

x.init = function(data) {
    return new Promise(function(resolve, reject) {
        verifyInitData(data)
            .then(function(status) {
                return putInitData(data);
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                // console.log("x.init, status = ", status);
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                console.log("x.init, err = ", err);
                reject(err);
            });
    });
}

function processResendAndUpdate(msgDoc) {
    return new Promise(function(resolve, reject) {
        sendNotification(msgDoc)
            .then(function(status) {
            	return updateMsgDoc(msgDoc, status.data);
            })
            .catch(function(err) {
            	return Promise.reject(err);
            })
            .then(function(status) {
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                reject(err);
            });
    });
}

function resendNotification() {
    return new Promise(function(resolve, reject) {
        var queryOpt = {
            // keys: [value],
            // startkey: '',
            // endkey: '\ufff0',
            include_docs: true
        };

        database.queryWithOptions({
                db: app.appCfg.db.ntfDB,
                design: DD.ALL_PENDING_MSG_BY_TIMESTAMP.design,
                view: DD.ALL_PENDING_MSG_BY_TIMESTAMP.view,
                autoCreateDD: DD.ALL_PENDING_MSG_BY_TIMESTAMP.dd,
                queryOpt: queryOpt
            })
            .then(function(status) {
                console.log('ntf sendNotification, queryWithOptions, status = ', status);
                if (status && status.data.rows && status.data.rows.length > 0) {
                    var promises = [];
                    for (var i = status.data.rows.length - 1; i >= 0; i--) {
                        promises.push(processResendAndUpdate(status.data.rows[i].doc));
                    }
                    return Promise.all(promises);

                } else {
                    return Promise.resolve({
                        ok: 200
                    });
                }
                // resolve({
                //     ok: 200
                // });
            })
            .catch(function(err) {
                return Promise.reject(err);
            })
            .then(function(status) {
                resolve({
                    ok: 200
                });
            })
            .catch(function(err) {
                logging.log(null, logging.TYPE.INFO, 'ntf sendNotification, err = ', err);
                reject(err);
            });
    });
}

x.resendNotification = function() {
    return resendNotification();
}

module.exports = x;