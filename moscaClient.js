// Khai báo biến mqtt để sử dụng các thuộc tính thuộc module mqtt
var mqtt = require('mqtt');
var options = {
	username: "esp32",
	password: "mtt@23377"
}
// Tạo 1 kết nối đến địa chỉ 192.168.1.7 port 1883 thông qua giao thức MQTT
// var client  = mqtt.connect('mqtt://192.168.5.39:1884', options);
var client  = mqtt.connect('mqtt://113.161.21.15:1884', options);
// Khi có sự kiện connect đến server, client sẽ subscribe topic MQTTlens/test/3 và
// publish 1 message "on" vào topic hello/world để ON led ở board ESP8266 WiFi Uno
client.on('connect', function () {
  client.subscribe('Broker/app');
  client.publish('esp8266/GPIO16', 'on');

})
// Khi có message gửi đến client, client sẽ chuyển đổi dữ liệu từ Buffer sang dạng String và in ra màn
// hình console dữ liệu nhận được và đóng kết nối.
client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
  //client.end();
})