
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
var fibonacci = require('./routes/fibonacci');	//fibonacci.ejs

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
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.dirname(require.resolve("mosca")) + "/public"))

app.use('/', index);		// when open url "localhost:4000/" -> run file ./routers/index.js (module.export.index)
app.use('/users', users);	// when open url "localhost:4000/users" -> run file ./routers/users.js (module.export.users)
app.use('/fibonacci', fibonacci.index);	// when open url "localhost:4000/fibonacci" -> run file ./routers/fibonacci.js (export.index)

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





var settings = {
  port: 1884
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
var broker = new mosca.Server(settings);
// server.attachHttpServer(httpServer);

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

    console.log('Mosca broker is up and running')
}


/* 
clientInfo collection = {
    clientId: "",
    dateInit: "",
    clientState: "",
    session: {
        startTime: 
        endTime:
    },
    topicPubSub: [
        {
            topic: "",
            type: "publish" / "subscribe"
            state: "on" / "off"
        }
    ],
    firmwareVersion: "1.0",
    macAddress: ""
}
 */

// fired whena  client is connected
// add "clientId", "clientStatus"
broker.on('clientConnected', function(client) {     
    console.log('client connected', client.id);

      mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
        if (err){
            console.log(err.name); 
            console.log(err.message); 
            //throw err;
            // throw new Error(err.message);
        } 
        else {
            var clientInfo = db.collection('clientInfo');
            var infoData = {
                clientState: "connected",
                session: { 
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
            clientInfo.find({clientId: client.id}).count(function(err, count){
                if (err) {                    
                    console.log(err);   // console.log(err.name, err.message);    // throw err
                }
                else if (count==0){         // not found: update info for client 
                    clientInfo.insert(
                        newInfoData,
                        function (err,res) {
                            if (err) console.log(err); 
                            // console.log('client connected updateOne-mongodb', res.modifiedCount);
                            db.close();
                        });
                } else if (count==1) {      // found: insert new client
                    clientInfo.updateOne(
                        { clientId: client.id}, 
                        { $set: infoData},  
                        function (err,res) {
                            if (err)console.log(err);
                            // console.log('client connected updateOne-mongodb', res.modifiedCount);
                            db.close();
                        });
                }                
            });
        }
    });
});
 
// fired when a message is received
broker.on('published', function(packet, client) {

    var stringBuf = packet.payload.toString('utf-8');
    var obj = stringBuf;

    try {
        var obj = JSON.parse(stringBuf);
    } catch (err) {
        console.log(err.message);
    } 
    console.log('Published data: ', obj);

    if (obj.firmwareVersion) {
        mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
            if (err) {
                // throw err;
                console.log(err.name);
                console.log(err.message);
            } else {
                var clientInfo = db.collection('clientInfo');
                clientInfo.update(
                    { clientId: client.id},
                    { $set: {
                        center: obj.center,
                        type: obj.type,
                        location: obj.location, 
                        firmwareVersion: obj.firmwareVersion, 
                        macAddress: obj.macAddress, 
                        updateInfo: obj.updateInfo,
                        deviceConfig: obj.deviceConfig 
                    }}, 
                    function (err,res) {
                        if (err) console.log(err);
                        // console.log('publish info update:');
                        db.close();
                    });
            }  
        });     
    }

    mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
        if (err) {
            // throw err;
            console.log(err.name);
            console.log(err.message);
        }
        // insert data when client connected to broker 
        else if (client) {
            var clientInfo = db.collection('clientInfo');
            var infoData =  {
                topic: packet.topic,
                type: "publish",
                state: "on"
            }
            // find "topicPubSub: { topic: , type: publish}" is exist or not exist in database
            // if found: update "topicPubSub: {state: }" from "off" -> "on"  (client is publishing data to topic)
            // if not found: insert new "topicPubSub" to 'clientInfo' collection
            clientInfo.find({clientId: client.id, topicPubSub: {$elemMatch: {topic: packet.topic, type: "publish"}}})
            .count(function(err, count) {
                if (err) console.log(err);
                else {
                    var clientData = db.collection('clientData');

                    var publishData = {
                        clientId: client.id,
                        topic: packet.topic,
                        // value: packet.payload,
                        value: obj,
                        timestamp: Date()
                    }
                    // insert publish data to "clientData" collection
                    clientData.insertOne(
                        publishData, 
                        function (err, res) {
                            if (err) console.log(err);
                            else {
                                // not found: insert new "topicPubSub" to 'clientInfo' collection  (insert object in array)
                                if (count==0) {
                                    // console.log('count:', count);
                                    clientInfo.update(
                                        { clientId: client.id}, 
                                        { $addToSet: { topicPubSub: infoData}}, 
                                        function (err,res) {
                                            if (err) console.log(err);
                                            // console.log('Published:  insert new topicPubSub', packet.topic);
                                            db.close();
                                        });
                                } 
                                // found: update "topicPubSub: { state: "on"}" in 'clientInfo' collection
                                else if (count==1) {
                                    // console.log('count:', count);
                                    clientInfo.update(
                                        { clientId: client.id, topicPubSub: { $elemMatch: { topic: packet.topic, type: "publish"}}},
                                        { $set: { "topicPubSub.$.state": infoData.state}},
                                        function(err, res) {
                                            if (err) console.log(err);
                                            // console.log('publish info insert :');
                                            db.close();
                                        })
                                }
                            }
                    });
                }
            });
        }
    });
});
 
// fired when a client subscribes to a topic
broker.on('subscribed', function(topic, client) {
    console.log('subscribed topic: ', topic);

    mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
        if (err){
            console.log(err.name);
            console.log(err.message);
        } else {

            var clientInfo = db.collection('clientInfo');
    
            var data =  {
                topic: topic,
                type: "subscribe",
                state: "on"
            }
          
            clientInfo.find({clientId: client.id, topicPubSub: {$elemMatch: {topic: topic, type: "subscribe"}}})
            .count(function(err, count) {
                if (err) console.log(err);
                // not found: insert new "topicPubSub" (insert object in array)
                else if (count==0) {
                    // console.log('count:', count);
                    clientInfo.update(
                        { clientId: client.id}, 
                        { $addToSet: { topicPubSub: data}}, 
                        function (err,res) {
                            if (err) console.log(err);
                            // console.log('Subscribe mongodb:', res);
                            db.close();
                        });
                }
                // found: update topicPubSub: {type: "subscribe", state: "on"}
                else if (count==1) {
                    // console.log('count:', count);
                    clientInfo.update(
                        // { clientId: client.id, "topicPubSub.topic": topic},
                        { clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe"}}},
                        { $set: {"topicPubSub.$.state": data.state}},
                        function(err, res) {
                            if (err) console.log(err);
                            // console.log('Subscribe mongodb:', res);
                            db.close();
                        })
                }
            });
        }
    });
});
 

// fired when a client subscribes to a topic
broker.on('unsubscribed', function(topic, client) {
    // console.log('unsubscribed topic: ', topic);

    mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
        if (err) {
            console.log(err.name);
            console.log(err.message);
        }
        else {
            var clientInfo = db.collection('clientInfo');
            var data = "off";
            // 
            clientInfo.update(
                { clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe", state: "on"}}}, 
                { $set: {"topicPubSub.$.state": data}}, 
                function (err,res) {
                    if (err) console.log(err);
                    console.log('unsubscribed success :', topic);
                    db.close();
                });
        }
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
    mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function(err, db) {
        if (err) {
            console.log(err.name);
            console.log(err.message);
        } else {
            var clientInfo = db.collection('clientInfo');
            
            // update "publishers.state" in  "clientInfo"
            // var cursor = clientInfo.find({ clientId: client.id/* , publishers: {$elemMatch: {state: "on"}} */});
            clientInfo.find({ clientId: client.id/* , publishers: {$elemMatch: {state: "on"}} */})
            .forEach(function (doc) {

                doc.session.endTime = Date();
                
                // if found topicPubSub: update state: "disconnected" , session: { endTime: }, topicPubSub: {state: "off"}
                // if not found: update state: "disconnected", session : { endTime}
                if(doc.topicPubSub) {
                    doc.topicPubSub.forEach(function (pubSubEvent) {
                        if (pubSubEvent.state == "on") {
                            pubSubEvent.state="off";
                        }
                    });
                    
                    clientInfo.updateOne(
                        { clientId: client.id }, 
                        { $set: { clientState: "disconnected", session: doc.session, topicPubSub: doc.topicPubSub}},
                        function(err, res){
                            if (err) console.log(err);
                            console.log('clientDisconnected success: ', client.id);
                            db.close();
                        });
                } else {
                    clientInfo.updateOne(
                        { clientId: client.id},
                        { $set: { clientState: "disconnected", session: doc.session}},  
                        function(err, res){
                            if (err) console.log(err);
                            console.log('clientDisconnected success: ', client.id);
                            db.close();
                        });
                }

            });            
        }
    });
});

module.exports = app;	// export - dử dụng để gọi 'app.js' trong file './bin/www'
