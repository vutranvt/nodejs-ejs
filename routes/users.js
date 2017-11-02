var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  // res.send('respond with a resource');
  	
  	// db.collection('clientInfo').find().toArray((err, result) => {
  	db.collection('clientInfo').find({}, {_id: 0}).toArray(function(err, result){
      	if (err) return console.log(err)
      	// renders index.ejs
      	res.render('users', {title: 'Mqtt Client Info', clientInfo: result});
    });

	// res.render('users', { title: 'mqtt webapp client' });
});

module.exports = router;
