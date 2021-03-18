var express = require('express');
var router = express.Router();
var path = require('path');
var app = require(path.join(__dirname, '../app'));
var Promise = require('promise');

var ntf = require(path.join(__dirname, '../models/ntf'));

router.get('/', function(req, res, next) {
    res.status(200).send({
        hello: "ntf"
    });
});

router.post('/subscribe', function(req, res, next) {
    ntf.subscribe(req.body)
        .then(function(status) {
            res.status(200).send(status);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
});

router.post('/init', function(req, res, next) {
    ntf.init(req.body)
        .then(function(status) {
            res.status(200).send(status);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
});

module.exports = router;