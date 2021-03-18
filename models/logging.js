'use strict';

var path = require('path');
var app = require(path.join(__dirname, '../app'));
var useragent = require('useragent');
var requestIp = require('request-ip');
var moment = require('moment-timezone');
var constants = require(path.join(__dirname, '../constants'));
const uuid4 = require('uuid4');

function getServerIP() {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var output;

    Object.keys(ifaces).forEach(function(ifname) {
        ifaces[ifname].forEach(function(iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            } else {
                output = iface.address;
                return;
            }
        });
        if (output) {
            return;
        }
    });

    return output;
}

module.exports.getServerIP = getServerIP;

function getServerMacAddress() {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var output;

    Object.keys(ifaces).forEach(function(ifname) {
        ifaces[ifname].forEach(function(iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            } else {
                output = iface.mac;
                return;
            }
        });
        if (output) {
            return;
        }
    });

    return output;
}

module.exports.getServerMacAddress = getServerMacAddress;

function getLocalDate() {
    var d = new Date(new Date() + ' UTC');
    return d.toString();
}

var TYPE = {
    "INFO": "INFO",
    "ERROR": "ERROR",
    "INVALID": "INVALID"
};

module.exports.TYPE = TYPE;

function log(req, type, path, message) {
    if (req) {
        var agent = useragent.lookup(req.headers['user-agent']).toJSON();;
        console.log(getLocalDate(), '|', getServerIP(), '|', type, '|', path, '|', message, '|', JSON.stringify(agent), '|', requestIp.getClientIp(req));
    } else {
        console.log(getLocalDate(), '|', getServerIP(), '|', type, '|', path, '|', message, '|', null, '|', null);
    }
}

module.exports.log = log;

function requestId() {
    return +new Date() + String(uuid4()).substring(0, 6);
}

module.exports.requestId = requestId;

module.exports.httplogIn = function(logger) {
    app.use(logger(function(tokens, req, res) {
        var _reqOutput = moment(req._startTime).tz('Asia/Kuala_Lumpur').format('DD/MM/YYYY,h:mm:ssa') + "|" + tokens['response-time'](req, res) + "ms|IN|" + req.method + "|" + req._remoteAddress + "|" + req.originalUrl + "|" + JSON.stringify(req.headers) + "|" + JSON.stringify(req.params) + "|" + JSON.stringify(req.query) + "|" + JSON.stringify(req.body);
        if (req.sessionID) {
            _reqOutput = _reqOutput + '|' + req.sessionID;
        } else {
            _reqOutput = _reqOutput + '|' + 'NoSessionID';
        }
        if (req.account && req.account._id) {
            _reqOutput = _reqOutput + '|' + req.account._id;
        } else {
            _reqOutput = _reqOutput + '|' + 'NoAccountID';
        }

        return [
            _reqOutput, '\n'
        ].join(' ');
    }));

    return function(req, res, next) {
        next();
    };
};

module.exports.httplogOut = function() {
    return function(req, res, next) {
        var _temp = res.send;
        res.send = function(payload) {
            // console.log("module.exports.httplogOut res.send this = ", this);
            try {
                var responseTimeStart = moment(req._startTime).format('x');
                var responseTimeEnd = moment().format('x');
                var totalResponseTime = responseTimeEnd - responseTimeStart;

                var _reqOutput = moment(req._startTime).tz('Asia/Kuala_Lumpur').format('DD/MM/YYYY,h:mm:ssa') + "|" + totalResponseTime + "ms|OUT|" + req.method + "|" + req._remoteAddress + "|" + req.originalUrl + "|" + JSON.stringify(req.headers) + "|" + JSON.stringify(req.params) + "|" + JSON.stringify(req.query);
                _reqOutput = _reqOutput + '|RES|' + res.statusCode;
                if (payload && (typeof payload == 'object')) {
                    _reqOutput = _reqOutput + '|' + JSON.stringify(payload);
                    console.log(_reqOutput);
                } else {
                    _reqOutput = _reqOutput + '|' + 'HTMLContent';
                }
            } catch (err) {
                log(null, TYPE.ERROR, 'module.exports.httplogOut try err', err);
            }
            _temp.apply(this, arguments);
        }
        next();
    };
};

module.exports.oops = function() {
    return function(req, res, next) {
        var _temp = res.send;
        res.send = function(payload) {
            // console.log("module.exports.oops res.send payload = ", payload);
            // console.log("module.exports.oops req.session = ", req.session);
            if (((req && req.body && !req.body.api_key) || (req && !req.body)) && payload && payload.err && payload.msg) {

                try {
                    var renderObj = {
                        version: app.appCfg.info.version,
                        info: app.appCfg.info,
                        api_level: app.appCfg.api_level,
                        fullDomainUrl: app.appCfg.fullDomainUrl,
                        constants: constants,
                        account: null,
                        err: payload.err,
                        msg: payload.msg,
                        dev_err: payload.dev_err,
                        data: {
                            page: 'oops',
                            submenu: 'oops'
                        }
                    }

                    if (req.query.confirmation) {
                        var title = constants[req.query.confirmation];
                        if (!title) {
                            title = req.query.confirmation;
                        }
                        var message = constants[req.query.confirmation + '_MSG'];
                        if (!message) {
                            message = req.query.confirmation;
                        }
                        renderObj.confirmation = [title, message];
                    }

                } catch (err) {
                    console.log("module.exports.oops renderObj try err = ", err);
                }

                console.log("module.exports.oops renderObj = ", renderObj);

                res.render('views/oops', renderObj);
            } else {
                _temp.apply(this, arguments);
            }
        }
        next();
    };
};