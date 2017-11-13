
var mosca = require('mosca');
var mongoClient = require('mongodb').MongoClient;
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');	// index = ./routers/index.js
var users = require('./routes/users');	// users = ./routers/users.js
var fibonacci = require('./routes/fibonacci');  //fibonacci.js
var data = require('./routes/data');	//data.js
var log = require('./routes/log');	//log.js
var lwt = require('./routes/lwt');    //lwt.js
var savePublishData = require('./savePublishData');    //lwt.js

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(path.dirname(require.resolve("mosca")) + "/public"))

app.use('/', index);		// when open url "localhost:4000/" -> run file ./routers/index.js (module.export.index)
app.use('/log', log);		
app.use('/users', users);   
app.use('/data', data);	
app.use('/lwt', lwt); // when open url "localhost:4000/lwt" -> run file ./routers/lwt.js (module.export.lwt)
app.use('/fibonacci', fibonacci.index);	

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
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


Date.prototype.vnDate = function () {
    var yyyy = this.getFullYear();
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    // var hours = this.getHours();
    // var minutes = this.getMinutes();
    // var seconds = this.getSeconds();

    // return dd + "/" + mm + "/" + yyyy + " " + hours + ":" + minutes + ":" + seconds;
    return mm + "/" + dd + "/" + yyyy; // + " " + hours + ":" + minutes + ":" + seconds;
}


module.exports = app;	// export - dử dụng để gọi 'app.js' trong file './bin/www'
