var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();
app = module.exports = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.appCfg = {
    product_id: "HelloWebhook",
    domain: "127.0.0.1",
    db: {
        admin: "admin:",
        adminP: "admin",
        ip: "127.0.0.1",
        port: ":5986",
        ntfDB: "ntf"
    }
};

app.use('/ntf/', require('./routes/ntf'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

var minuteCron = require('node-cron');
var ntf = require(path.join(__dirname, 'models/ntf'));
minuteCron.schedule('* * * * *', () => {
	// ntf.resendNotification();
},{
    scheduled: true,
    timezone: "Asia/Kuala_Lumpur"
});

module.exports = app;