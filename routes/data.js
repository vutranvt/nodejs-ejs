var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  	
  	db.collection('bmtData').find({}, {_id: false, clientId: false}).sort({$natural:-1}).limit(10).toArray(function(err, result){

      	if (err) return console.log(err)
      	res.render('data', {title: 'Client Data', bmtData: result});
    });

});

module.exports = router;