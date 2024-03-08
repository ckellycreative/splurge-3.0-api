require('rootpath')();
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('_middleware/error-handler');

app.set('etag', false)

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors requests from any origin and with credentials
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

// api routes
app.use('/api/accounts', require('./accounts/accounts.controller'));
app.use('/api/transactions', require('./transactions/transactions.controller'));
app.use('/api/categories', require('./categories/categories.controller'));
app.use('/api/plans', require('./plans/plans.controller'));


// swagger docs route
app.use('/api-docs', require('_helpers/swagger'));

// global error handler
app.use(errorHandler);

if (process.env.NODE_ENV === 'production'){
	app.get('/*', function(req, res) {
	  res.sendFile(path.join(__dirname, 'public/index.html'), function(err) {
	    if (err) {
	      res.status(500).send(err)
	    }
	  })
	});
	app.get('*.js', function (req, res, next) {
	  req.url = req.url + '.gz';
	  res.set('Content-Encoding', 'gzip');
	  next();
	});		
}


// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
app.listen(port, () => console.log('Server listening on port ' + port));
