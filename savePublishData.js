var savePublishData = function (topic, data) {
	// body..
	var collectionName = "";
	for (var i = 0; i < topic.length; i++) {
		if (topic[i] != '/') {
			collectionName += topic[i];
		} else if (topic[i] == '/') {
			collectionName += "Data";
			break;
		}
	}
	db.collection(collectionName).insertOne(data, function (err, res) {
	    if (err) console.log(err);
	});	
		
}

module.exports = savePublishData;