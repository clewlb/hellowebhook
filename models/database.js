'use strict';

var path = require('path');
var app = require(path.join(__dirname, '../app'));
var constants = require(path.join(__dirname, '../constants'));
var Promise = require('promise');
var logging = require(path.join(__dirname, 'logging'));

var CryptoJS = require("crypto-js");

function decryptData(data) {
    try {
        // console.log('/credentials decryptData data = ', data);
        var key = CryptoJS.SHA256(app.appCfg.product_id).toString();
        // console.log('/credentials decryptData key = ', key);
        var decryptedData = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
        // console.log('/credentials decryptData decryptedData = ', decryptedData);
        if (decryptedData) {
            return decryptedData;
        } else {
            // logging.log(null, logging.TYPE.ERROR, 'credentials decryptData, decrypt error, decryptedData = ', decryptedData);
            return null;
        }
    } catch (err) {
        // logging.log(null, logging.TYPE.ERROR, 'credentials decryptData, try err = ', err);
        return null;
    }
}

// var dbHost = require('nano')(app.appCfg.db.host);
var dbHost = require('nano')('http://' + app.appCfg.db.admin + app.appCfg.db.adminP + '@' + app.appCfg.db.ip + app.appCfg.db.port);
var dbs = {};

function verifyDb(db) {
    return new Promise(function(resolve, reject) {
        if (!dbs[db]) {
            dbs[db] = dbHost.use(db);
            dbs[db].info()
                .then(function() {
                    return Promise.resolve();
                })
                .catch((err) => {
                    if (err.error == 'not_found') {
                        return dbHost.db.create(db);
                    } else {
                        // logging.log(null, logging.TYPE.ERROR, 'database verifyDb ' + db + ' unhandled err', err);
                        return Promise.reject({
                            err: 500,
                            msg: err
                        });
                    }
                })
                .then(function() {
                    resolve({
                        ok: 200
                    });
                })
                .catch(function(err) {
                    // logging.log(null, logging.TYPE.ERROR, 'database verifyDb auto create DB failed', err);
                    if (err.err) {
                        reject(err);
                    } else {
                        reject({
                            err: 500,
                            msg: err
                        });
                    }
                });
        } else {
            resolve({
                ok: 200
            });
        }
    });
}

function insertOrUpdateDD(db, design, view, dd) {
    // console.log('>>>>>>> insertOrUpdateDD design = ', design);
    // console.log('>>>>>>> insertOrUpdateDD view = ', view);
    // console.log('>>>>>>> insertOrUpdateDD dd = ', dd);
    return new Promise(function(resolve, reject) {
        if (design && view && dd) {

            verifyDb(db)
                .then(function() {
                    return Promise.resolve();
                })
                .catch(function(err) {
                    // logging.log(null, logging.TYPE.ERROR, 'database insertOrUpdateDD verifyDb err', err);
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_VERIFY_ERROR
                    });
                })
                .then(function() {
                    return dbs[db].get('_design/' + design);
                })
                .catch(function(err) {
                    return Promise.reject(err);
                })
                .then((body) => {
                    // console.log('>>>>>>> insertOrUpdateDD dbs[db].get body = ', body);
                    var currentDDRev = body._rev;
                    delete body._rev;
                    var a = JSON.stringify(body);
                    // console.log('>>>>>>> insertOrUpdateDD a = ', a);
                    var aSha = CryptoJS.SHA256(a).toString().toUpperCase();
                    // console.log('insertOrUpdateDD aSha = ', aSha);

                    var b = JSON.stringify(dd);
                    // console.log('>>>>>>> insertOrUpdateDD b = ', b);
                    var bSha = CryptoJS.SHA256(b).toString().toUpperCase();
                    // console.log('insertOrUpdateDD bSha = ', bSha);
                    if (aSha == bSha) {
                        // console.log('insertOrUpdateDD MATCHED!!');
                        return Promise.resolve();
                    } else {
                        // console.log('insertOrUpdateDD NOT MATCHED!!');
                        var newDD = JSON.parse(b);
                        newDD._rev = currentDDRev;
                        return Promise.resolve(newDD);
                    }
                })
                .catch(function(err) {
                    if (err.error === 'not_found') {
                        return Promise.resolve(dd);
                    } else {
                        // logging.log(null, logging.TYPE.ERROR, 'database insertOrUpdateDD get DD err', err);
                        return Promise.reject({
                            err: 500,
                            msg: constants.DATABASE_GET_ERROR
                        });
                    }
                })
                .then(function(newDD) {
                    if (newDD) {
                        // logging.log(null, logging.TYPE.INFO, 'database insertOrUpdateDD put New DD', newDD);
                        return dbs[db].insert(newDD);
                    } else {
                        return Promise.resolve();
                    }
                })
                .catch(function(err) {
                    // logging.log(null, logging.TYPE.INFO, 'database insertOrUpdateDD insert DD error', err);
                    if (err.err) {
                        return Promise.reject(err);
                    } else {
                        return Promise.reject({
                            err: 500,
                            msg: constants.DATABASE_PUT_ERROR
                        });
                    }
                })
                .then(function() {
                    resolve({
                        ok: 200
                    });
                })
                .catch(function(err) {
                    reject(err);
                });

        } else {
            // logging.log(null, logging.TYPE.ERROR, 'database insertOrUpdateDD err', constants.INVALID_DATA);
            reject({
                err: 500,
                msg: constants.INVALID_DATA
            });
        }
    });
}

function queryWithOptions(options) {
    // console.log('database queryWithOptions, options', options);
    // options = {
    //     db: '',
    //     design: '',
    //     view: '',
    //     autoCreateDD: undefined,
    //     queryOpt: {
    //         startkey: undefined,
    //         limit: 100,
    //         keys: [],
    //         include_docs: true
    //     }
    // }
    return new Promise(function(resolve, reject) {
        if (options) {
            verifyDb(options.db)
                .then(function(status) {
                    return Promise.resolve();
                })
                .catch(function(err) {
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_VERIFY_ERROR
                    });
                })
                .then(function() {
                    if (options.autoCreateDD) {
                        return insertOrUpdateDD(options.db, options.design, options.view, options.autoCreateDD);
                    } else {
                        return Promise.resolve();
                    }
                })
                .catch(function(err) {
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_INSERTUPDATE_ERROR
                    });
                })
                .then(function() {
                    // console.log('database queryWithOptions view', options);
                    return dbs[options.db].view(options.design, options.view, options.queryOpt);
                })
                .catch(function(err) {
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_VIEW_ERROR
                    });
                })
                .then(function(response) {
                    // console.log('database queryWithOptions done, response', response);
                    resolve({
                        ok: 200,
                        data: response
                    });
                })
                .catch(function(err) {
                    reject(err);
                });
        } else {
            reject({
                err: 400,
                msg: constants.INVALID_DATA
            });
        }
    });
}

function insertOrUpdateIndex(db, design, view, dd) {
    // console.log('>>>>>>> insertOrUpdateIndex design = ', design);
    // console.log('>>>>>>> insertOrUpdateIndex view = ', view);
    // console.log('>>>>>>> insertOrUpdateIndex dd = ', dd);
    return new Promise(function(resolve, reject) {
        if (db && design && view && dd) {

            verifyDb(db)
                .then(function() {
                    return Promise.resolve();
                })
                .catch(function(err) {
                    // logging.log(null, logging.TYPE.ERROR, 'database insertOrUpdateIndex verifyDb err', err);
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_VERIFY_ERROR
                    });
                })
                .then(function() {
                    return dbs[db].get('_design/' + design);
                })
                .catch(function(err) {
                    if (err.error === 'not_found') {
                        return Promise.resolve();
                    } else {
                        // logging.log(null, logging.TYPE.ERROR, '/database insertOrUpdateIndex dbs[db].get err', err);
                        return Promise.reject({
                            err: 500,
                            msg: constants.SYSTEM_ERROR
                        });
                    }
                })
                .then(function() {
                    return dbs[db].createIndex(dd);
                })
                .catch(function(err) {
                    // logging.log(null, logging.TYPE.ERROR, '/database insertOrUpdateIndex createIndex err', err);
                    return Promise.reject(err);
                })
                .then(function(response) {
                    if (response.result === "created") {
                        // logging.log(null, logging.TYPE.INFO, '/database insertOrUpdateIndex New DD Updated', dd);
                    }
                    resolve({
                        ok: 200
                    });
                })
                .catch(function(err) {
                    reject(err);
                });

        } else {
            // logging.log(null, logging.TYPE.ERROR, '/database insertOrUpdateIndex', constants.INVALID_DATA);
            reject({
                err: 500,
                msg: constants.INVALID_DATA
            })
        }
    });
}

function findWithOptions(options) {
    return new Promise(function(resolve, reject) {
        // options = {
        //     db: app.appCfg.db.userDb,
        //     design: app.appCfg.db.userDb,
        //     view: app.appCfg.db.userDb,
        //     autoCreateDD: null,
        //     partial_filter_selector: {docType:{'$eq':'user'}},
        //     queryOpt: {
        //         use_index: 'index_user_id',
        //         selector: {
        //             timestamp: {
        //                 '$gte': 1546272000000,
        //                 '$lte': 1548864000000
        //             },
        //             amount: {
        //                 '$eq': 1.1
        //             },
        //             reference_ID: {
        //                 '$eq': 'ref123'
        //             },
        //             reference_ID: {
        //                 '$exists': true
        //             },
        //             '$or': []
        //         },
        //         sort: [{
        //             timestamp: 'desc'
        //         }],
        //         limit: 2,
        //         execution_stats: true
        //     }
        // }

        if (options.db && options.queryOpt) {

            // Custom DDoc ---
            var customDDoc;
            var defaultCustomDdoc = 'idx-custom';
            var defaultCustomView = 'view';

            if (!options.autoCreateDD) {

                if (!options.queryOpt.use_index) {
                    options.queryOpt.use_index = defaultCustomDdoc;
                }

                var customDDoc = {
                    index: {
                        partial_filter_selector: {},
                        fields: []
                    },
                    ddoc: options.queryOpt.use_index,
                    type: 'json'
                };
                if (options.partial_filter_selector) {
                    customDDoc.index.partial_filter_selector = options.partial_filter_selector;
                }
                if (options.queryOpt.sort && Array.isArray(options.queryOpt.sort)) {
                    // console.log('/database findWithOptions options.queryOpt.sort = ', options.queryOpt.sort);
                    var customDDocFields = [];
                    var theField;
                    for (var i = 0; i < options.queryOpt.sort.length; i++) {
                        // console.log('/database findWithOptions options.queryOpt.sort[i] = ', options.queryOpt.sort[i]);
                        theField = null;
                        if ((typeof options.queryOpt.sort[i]) == 'object') {
                            // console.log('/database findWithOptions options.queryOpt.sort[i] theField = ', theField);
                            for (var key in options.queryOpt.sort[i]) {
                                // console.log('/database findWithOptions options.queryOpt.sort[i] key = ', options.queryOpt.sort[i], ', key = ', key);
                                if (!theField) {
                                    theField = key;
                                } else {
                                    break;
                                }
                            }
                        } else if ((typeof options.queryOpt.sort[i]) == 'string') {
                            theField = options.queryOpt.sort[i];
                        }
                        if (theField) {
                            customDDocFields.push(theField);
                        }
                    }
                    customDDoc.index.fields = customDDocFields;
                }
                options.autoCreateDD = customDDoc;
                // console.log('/database findWithOptions customDDoc, options.autoCreateDD = ', options.autoCreateDD);
            }
            if (!options.design) {
                options.design = defaultCustomDdoc;
            }
            if (!options.view) {
                options.view = defaultCustomView;
            }
            // ----

            verifyDb(options.db)
                .then(function(status) {
                    return Promise.resolve();
                })
                .catch(function(err) {
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_VERIFY_ERROR
                    });
                })
                .then(function() {
                    if (options.autoCreateDD) {
                        return insertOrUpdateIndex(options.db, options.design, options.view, options.autoCreateDD);
                    } else {
                        return Promise.resolve();
                    }
                })
                .catch(function(err) {
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_INSERTUPDATE_ERROR
                    });
                })
                .then(function() {
                    // console.log('/database findWithOptions options', options);
                    return dbs[options.db].find(options.queryOpt);
                })
                .catch(function(err) {
                    // logging.log(null, logging.TYPE.ERROR, 'database findWithOptions find err = ', err);
                    return Promise.reject({
                        err: 500,
                        msg: constants.DATABASE_FIND_ERROR
                    });
                })
                .then(function(response) {
                    // console.log('database findWithOptions done, response', response);
                    resolve({
                        ok: 200,
                        data: response
                    });
                })
                .catch(function(err) {
                    reject(err);
                })
        } else {
            reject({
                err: 400,
                msg: constants.INVALID_DATA
            });
        }
    });
}


module.exports = {
    findWithOptions: findWithOptions,
    queryWithOptions: queryWithOptions,
    putDocsWithDbAndDDocs: function(db, docs, ddocs) {
        return new Promise(function(resolve, reject) {
            try {
                for (var i = 0; i < docs.length; i++) {
                    if (docs[i]._id && docs[i]._id.substring(0, 1) != '_') {
                        docs[i].lastUpdated = +new Date();
                    }
                }

                verifyDb(db)
                    .then(function(status) {
                        return dbs[db].bulk({
                            docs: docs
                        });
                    })
                    .catch(function(err) {
                        // logging.log(null, logging.TYPE.ERROR, 'database putDocsWithDbAndDDocs verifyDb err', err);
                        return Promise.reject({
                            err: 500,
                            msg: constants.DATABASE_ERROR
                        });
                    })
                    .then(function(status) {
                        // console.log('database putDocsWithDbAndDDocs, status = ', status);
                        return Promise.resolve(status);
                    })
                    .catch(function(err) {
                        // logging.log(null, logging.TYPE.ERROR, 'database putDocsWithDbAndDDocs bulk error', err);
                        return Promise.reject({
                            err: 500,
                            msg: constants.DATABASE_PUT_ERROR
                        });
                    })
                    .then(function(status) {
                        if (ddocs) {
                            var promises = [];
                            for (var i = 0; i < ddocs.length; i++) {
                                var ddOpt = ddocs[i];
                                promises.push(insertOrUpdateDD(db, ddOpt.design, ddOpt.view, ddOpt.dd));
                            }
                            return Promise.all(promises);
                        } else {
                            return Promise.resolve(status);
                        }
                    })
                    .catch(function(err) {
                        // logging.log(null, logging.TYPE.ERROR, 'database putDocsWithDbAndDDocs promises insertOrUpdateDD err', err);
                        if (err.err) {
                            return Promise.reject(err);
                        } else {
                            return Promise.reject({
                                err: 500,
                                msg: constants.DATABASE_PUT_ERROR
                            });
                        }
                    })
                    .then(function(status) {
                        resolve({
                            ok: 200,
                            data: status
                        });
                    })
                    .catch(function(err) {
                        reject(err);
                    });

            } catch (err) {
                // logging.log(null, logging.TYPE.ERROR, 'database putDocsWithDbAndDDocs, try err = ', err);
                reject({
                    err: 500,
                    msg: constants.SYSTEM_ERROR
                });
            }
        });
    },
    getDocWithDbAndDocId: function(db, docId) {
        return new Promise(function(resolve, reject) {
            try {

                verifyDb(db)
                    .then(function(status) {
                        return Promise.resolve();
                    })
                    .catch(function(err) {
                        // logging.log(null, logging.TYPE.ERROR, 'database getDocWithDbAndDocId verifyDb err', err);
                        return Promise.reject({
                            err: 500,
                            msg: constants.DATABASE_ERROR
                        });
                    })
                    .then(function() {
                        return dbs[db].get(docId);
                    })
                    .catch(function(err) {
                        // logging.log(null, logging.TYPE.ERROR, 'database getDocWithDbAndDocId get error', err);
                        return Promise.reject({
                            err: 400,
                            msg: constants.NOT_FOUND
                        });
                    })
                    .then(function(doc) {
                        if (doc) {
                            resolve({
                                ok: 200,
                                data: doc
                            });
                        } else {
                            return Promise.reject({
                                err: 400,
                                msg: constants.NOT_FOUND
                            });
                        }
                    })
                    .catch(function(err) {
                        reject(err);
                    });

            } catch (err) {
                // logging.log(null, logging.TYPE.ERROR, 'database getDocWithDbAndDocId, try err = ', err);
                reject({
                    err: 500,
                    msg: constants.SYSTEM_ERROR
                });
            }
        });
    }
};