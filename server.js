
var mosca = require('mosca');
var mongoClient = require('mongodb').MongoClient;

var savePublishData = require('./savePublishData');    //lwt.js

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
var broker = new mosca.Server(settings);

broker.on('ready', setup);

// fired when the mqtt broker is ready
function setup() {
    broker.authenticate = authenticate;
    broker.authorizePublish = authorizePublish;
    broker.authorizeSubscribe = authorizeSubscribe;

    mongoClient.connect('mongodb://127.0.0.1:27017/nthdb', function (err, database) {
        if (err) {
            console.log(err.name);
            console.log(err.message);
            //throw err;
        }
        db = database;
    });
    console.log('Mosca broker is up and running')
}

// fired whena  client is connected
// add "clientId", "clientStatus"
broker.on('clientConnected', function (client) {
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
    db.collection('clientInfo').find({ clientId: client.id }).count(function (err, count) {
        if (err) {
            console.log(err);   // console.log(err.name, err.message);    // throw err
        }
        else if (count == 0) {         // not found: update info for client 
            db.collection('clientInfo').insert(
                newInfoData,
                function (err, res) {
                    if (err) console.log(err);
                    // console.log('client connected updateOne-mongodb', res.modifiedCount);
                });
        } else if (count == 1) {      // found: insert new client
            db.collection('clientInfo').updateOne(
                { clientId: client.id },
                { $set: infoData },
                function (err, res) {
                    if (err) console.log(err);
                    // console.log('client connected updateOne-mongodb', res.modifiedCount);
                });
        }
    });

});

// fired when a message is received
broker.on('published', function (packet, client) {

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
            { clientId: client.id },
            {
                $set: {
                    location: objPayload.location,
                    type: objPayload.type,
                    name: objPayload.name,
                    firmwareVersion: objPayload.firmwareVersion,
                    macAddress: objPayload.macAddress,
                    updateInfo: objPayload.updateInfo,
                    deviceConfig: objPayload.deviceConfig
                }
            },
            function (err, res) {
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

        var infoData = {
            topic: packet.topic,
            type: "publish",
            state: "on"
        }
        //update dữ liệu cho 'clientInfo'         
        //Tìm 'topicPubSub.type' = 'publish' trong 'clientInfo'
        //Nếu tìm thấy thì 'update'. Không tìm thấy thì 'insert'
        db.collection('clientInfo').find({ clientId: client.id, topicPubSub: { $elemMatch: { topic: packet.topic, type: "publish" } } })
            .count(function (err, count) {
                if (err) console.log(err);
                else {
                    // not found: insert  "topicPubSub" mới vào 'clientInfo' collection  (insert object in array)
                    if (count == 0) {
                        db.collection('clientInfo').update(
                            { clientId: client.id },
                            { $addToSet: { topicPubSub: infoData } },
                            function (err, res) {
                                if (err) console.log(err);
                            });
                    }
                    // found: update 'topicPubSub.state' = 'on' vào 'clientInfo' collection
                    else if (count == 1) {
                        db.collection('clientInfo').update(
                            { clientId: client.id, topicPubSub: { $elemMatch: { topic: packet.topic, type: "publish" } } },
                            { $set: { "topicPubSub.$.state": infoData.state } },
                            function (err, res) {
                                if (err) console.log(err);
                            });
                    }
                }
            });
    }
});

// fired when a client subscribes to a topic
broker.on('subscribed', function (topic, client) {
    console.log('subscribed topic: ', topic);
    console.log('----------------:');

    var data = {
        topic: topic,
        type: "subscribe",
        state: "on"
    }

    //Insert hoặc update dữ liệu subscribe vào 'topicPubSub'
    db.collection('clientInfo').find({ clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe" } } })
        .count(function (err, count) {
            if (err) {
                console.log(err);
                db.close();
            }
            // not found: insert new "topicPubSub"
            else if (count == 0) {
                db.collection('clientInfo').update(
                    { clientId: client.id },
                    { $addToSet: { topicPubSub: data } },
                    function (err, res) {
                        if (err) console.log(err);
                    });
            }
            // found: update 'topicPubSub.state' = 'on'
            else if (count == 1) {
                db.collection('clientInfo').update(
                    { clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe" } } },
                    { $set: { "topicPubSub.$.state": data.state } },
                    function (err, res) {
                        if (err) console.log(err);
                    });
            }

        });

});


// fired when a client subscribes to a topic
broker.on('unsubscribed', function (topic, client) {
    var data = "off";

    //update trạng thái 'off' cho 'topicPubSub'
    db.collection('clientInfo').update(
        { clientId: client.id, topicPubSub: { $elemMatch: { topic: topic, type: "subscribe", state: "on" } } },
        { $set: { "topicPubSub.$.state": data } },
        function (err, res) {
            if (err) console.log(err);
            console.log('unsubscribed success: ', topic);
            console.log('---------------------');
        });

});

// fired when a client is disconnecting
broker.on('clientDisconnecting', function (client) {
    console.log('clientDisconnecting : ', client.id);
});

/* 
fired when a client is disconnected
add "status: disconnected" into collection: clientInfo
 */
broker.on('clientDisconnected', function (client) {
    // console.log('clientDisconnected id: ', client.id);

    //update trạng thái: 'clientState'='disconnected' -- 'session' -- 'topicPubSub.state'=='off'
    db.collection('clientInfo').find({ clientId: client.id })
        .forEach(function (doc) {

            doc.session.endTime = Date();

            // found topicPubSub: update trạng thái 'topicPubSub.state'='off' 
            if (doc.topicPubSub) {
                doc.topicPubSub.forEach(function (pubSubEvent) {
                    if (pubSubEvent.state == "on") {
                        pubSubEvent.state = "off";
                    }
                });

                db.collection('clientInfo').updateOne(
                    { clientId: client.id },
                    { $set: { clientState: "disconnected", session: doc.session, topicPubSub: doc.topicPubSub } },
                    function (err, res) {
                        if (err) console.log(err);
                        console.log('ClientDisconnected success: ', client.id);
                        console.log('---------------------------');
                        // db.close();
                    });
            }
            //Not found topicPubSub:
            else {
                db.collection('clientInfo').updateOne(
                    { clientId: client.id },
                    { $set: { clientState: "disconnected", session: doc.session } },
                    function (err, res) {
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

// smodule.exports = server;	// export - dử dụng để gọi 'app.js' trong file './bin/www'
