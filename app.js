
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

// Sử dụng thư viện ascoltatore nhằm hỗ trợ publish message, subscribe topic đến  từ các Broker/Protocol
var ascoltatore = {
  //using ascoltatore
  type: 'mongo',        
  url: 'mongodb://localhost:27017/nthdb',    //địa chỉ url của mongodb. 'nthdb' là tên database 
  pubsubCollection: 'ascoltatori',          //collection lưu trữ data
  mongo: {}     //cài đặt cho mongodb. Không sử dụng
};

var settings = {
    port: 1884,
    http: {
       port: 3333,
       bundle: true,
       static: './'     
    }
  // backend: ascoltatore
};

var authenticate = function (client, username, password, callback) {
    if (username == "esp32" && password.toString() == "mtt@23377")
        callback(null, true);
    else
        callback(null, false);
}

var authorizePublish = function (client, topic, payload, callback) {
    var auth = true;
    // set auth to :
    //  true to allow 
    //  false to deny and disconnect
    //  'ignore' to puback but not publish msg.
    callback(null, auth);
}

var authorizeSubscribe = function (client, topic, callback) {
    var auth = true;
    // set auth to :
    //  true to allow
    //  false to deny 
    callback(null, auth);
}

// here we start mosca
// var http = require('http')
// var httpServer = http.createServer()
var broker = new mosca.Server(settings);
// broker.attachHttpServer(app);

// httpServer.listen(9000)
/*httpServer.get('/index.htm', function (req, res) {
   res.sendFile( __dirname + "/" + "index.htm" );
})*/

// httpServer.listen(9000);
broker.on('ready', setup);
 
// httpServer.use('/', index);    
 


// fired when the mqtt broker is ready
function setup() {
    broker.authenticate = authenticate;
    broker.authorizePublish = authorizePublish;
    broker.authorizeSubscribe = authorizeSubscribe;

    mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
        if (err){
            console.log(err.name); 
            console.log(err.message); 
            //throw err;
        }
    });
    console.log('Mosca broker is up and running')
}

// fired whena  client is connected
// add "clientId", "clientStatus"
broker.on('clientConnected', function(client) {     
    console.log('Client connected: ', client.id);
    console.log('----------------');

    var infoData = {
        clientState: "connected",
        session: { 
            // startTime: Date().vnDate(),
            startTime: Date(),
            endTime: ""
        }
    }

    var newInfoData = {
        clientId: client.id,    // mqtt client ID
        dateInit: Date(),           // the first time device connect to broker
        clientState: "connected",   // state of client
        session: {              // sesstion interval
            startTime: Date(),  
            endTime: ""
        }
    }

    // if found 'clientId' in mongodb: update info for client
    // if not found 'clientId' in mongodb: insert new client 
    db.collection('clientInfo').find({clientId: client.id}).count(function(err, count){
        if (err) {                    
            console.log(err);   // console.log(err.name, err.message);    // throw err
        }
        else if (count==0){         // not found: update info for client 
            db.collection('clientInfo').insert(
                newInfoData,
                function (err,res) {
                    if (err) console.log(err); 
                    // console.log('client connected updateOne-mongodb', res.modifiedCount);
                });
        } else if (count==1) {      // found: insert new client
            db.collection('clientInfo').updateOne(
                { clientId: client.id}, 
                { $set: infoData},  
                function (err,res) {
                    if (err)console.log(err);
                    // console.log('client connected updateOne-mongodb', res.modifiedCount);
                });
        }                
    });

});
 
// fired when a message is received
broker.on('published', function(packet, client) {

    var stringPayload = packet.payload.toString('utf-8');
    var stringTopic = packet.topic.toString('utf-8');
    var objPayload = stringPayload;

    try {
        //Nếu Payload là chuối JSON thì convert to Object
        objPayload = JSON.parse(stringPayload); 
    } catch (err) {
        //Xuất lỗi nếu Payload ko phải là chuổi JSON
        console.log(err.message);
    } 
    console.log('Published data: ', objPayload);

    if (objPayload.firmwareVersion) {
        console.log('----------------'); 

        db.collection('clientInfo').update(
            { clientId: client.id},
            { $set: {
                location: objPayload.location,
                type: objPayload.type,
                name: objPayload.name, 
                firmwareVersion: objPayload.firmwareVersion, 
                macAddress: objPayload.macAddress, 
                updateInfo: objPayload.updateInfo,
                deviceConfig: objPayload.deviceConfig 
            }}, 
            function (err,res) {
                if (err) console.log(err);  // console.log(err.name);    console.log(err.message);
            });
    }

    // insert data when client connected to broker 
    if (client) {
        var publishData = {
            clientId: client.id,
            topic: packet.topic,
            value: objPayload,
            timestamp: Date()
        };
        savePublishData(stringTopic, publishData);

        var infoData =  {
            topic: packet.topic,
            type: "publish",
            state: "on"
        }        
        //update dữ liệu cho 'clientInfo'         
        //Tìm 'topicPubSub.type' = 'publish' trong 'clientInfo'
        //Nếu tìm thấy thì 'update'. Không tìm thấy thì 'insert'
        db.collection('clientInfo').find({clientId: client.id, topicPubSub: {$elemMatch: {topic: packet.topic, type: "publish"}}})
        .count(function(err, count) {
            if (err) console.log(err);
            else {
                // not found: insert  "topicPubSub" mới vào 'clientInfo' collection  (insert object in array)
                if (count==0) {
                    db.collection('clientInfo').update(
                        { clientId: client.id}, 
                        { $addToSet: { topicPubSub: infoData}}, 
                        function (err,res) {
                            if (err) console.log(err);
                        });
                } 
                // found: update 'topicPubSub.state' = 'on' vào 'clientInfo' collection
                else if (count==1) {
                    db.collection('clientInfo').update(
                        { clientId: client.id, topicPubSub: { $elemMatch: { topic: packet.topic, type: "publish"}}},
                        { $set: { "topicPubSub.$.state": infoData.state}},
                        function(err, res) {
                            if (err) console.log(err);
                        });
                }
            }
        });
    }
});
 
// fired when a client subscribes to a topic
broker.on('subscribed', function(topic, client) {
    console.log('subscribed topic: ', topic);
    console.log('----------------:');

    var data =  {
        topic: topic,
        type: "subscribe",
        state: "on"
    }
    
    //Insert hoặc update dữ liệu subscribe vào 'topicPubSub'
    db.collection('clientInfo').find({clientId: client.id, topicPubSub: {$elemMatch: {topic: topic, type: "subscribe"}}})
    .count(function(err, count) {
        if (err) {
            console.log(err);
            db.close();
        }
        // not found: insert new "topicPubSub"
        else if (count==0) {
            db.collection('clientInfo').update(
                { clientId: client.id}, 
                { $addToSet: { topicPubSub: data}}, 
                function (err,res) {
                    if (err) console.log(err);
                });
        }
        // found: update 'topicPubSub.state' = 'on'
        else if (count==1) {
            db.collection('clientInfo').update(
                { clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe"}}},
                { $set: {"topicPubSub.$.state": data.state}},
                function(err, res) {
                    if (err) console.log(err);
                });       
        }
    
    });

});
 

// fired when a client subscribes to a topic
broker.on('unsubscribed', function(topic, client) {
    var data = "off";

    //update trạng thái 'off' cho 'topicPubSub'
    db.collection('clientInfo').update(
        { clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe", state: "on"}}}, 
        { $set: {"topicPubSub.$.state": data}}, 
        function (err,res) {
            if (err) console.log(err);
            console.log('unsubscribed success: ', topic);
            console.log('---------------------');
        });

});
 
// fired when a client is disconnecting
broker.on('clientDisconnecting', function(client) {
    console.log('clientDisconnecting : ', client.id);
});
 
/* 
fired when a client is disconnected
add "status: disconnected" into collection: clientInfo
 */
broker.on('clientDisconnected', function(client) {
    // console.log('clientDisconnected id: ', client.id);
    
    //update trạng thái: 'clientState'='disconnected' -- 'session' -- 'topicPubSub.state'=='off'
    db.collection('clientInfo').find({ clientId: client.id})
    .forEach(function (doc) {

        doc.session.endTime = Date();
        
        // found topicPubSub: update trạng thái 'topicPubSub.state'='off' 
        if(doc.topicPubSub) {
            doc.topicPubSub.forEach(function (pubSubEvent) {
                if (pubSubEvent.state == "on") {
                    pubSubEvent.state = "off";
                }
            });
            
            db.collection('clientInfo').updateOne(
                { clientId: client.id }, 
                { $set: { clientState: "disconnected", session: doc.session, topicPubSub: doc.topicPubSub}},
                function(err, res){
                    if (err) console.log(err);
                    console.log('ClientDisconnected success: ', client.id);
                    console.log('---------------------------');
                    // db.close();
                });
        } 
        //Not found topicPubSub:
        else {
            db.collection('clientInfo').updateOne(
                { clientId: client.id},
                { $set: { clientState: "disconnected", session: doc.session}},  
                function(err, res){
                    if (err) console.log(err);
                    console.log('clientDisconnected success: ', client.id);
                    console.log('---------------------------');
                    // db.close();
                });
        }

    });            

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
