var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  	
  	db.collection('clientData').find({}, {_id: false}).sort({$natural:-1}).limit(10).toArray(function(err, result){

      	if (err) return console.log(err)
      	res.render('data', {title: 'Client Data', clientData: result});
    });

});

module.exports = router;