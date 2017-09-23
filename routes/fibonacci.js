var math = require('../math');
exports.index = function(req, res) {
    if(req.query.fibonum) {
        res.render('fibonacci', {
            title: "Calculate Fibonacci numbers",
            fibonum: req.query.fibonum,
            fiboval: math.fibonacci(req.query.fibonum)
        });
    } else {
        res.render('fibonacci', {
            title: "Calculate Fibonacci numbers",
            fiboval: undefined
        });
    }
};