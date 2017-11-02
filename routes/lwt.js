var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  	
  	db.collection('clientData').find({value: 'offline'}, {_id: false}).sort({$natural:-1}).limit(30).toArray(function(err, result){

      	if (err) return console.log(err)
      	res.render('lwt', {title: 'lwt', clientData: result});
    });

});

module.exports = router;