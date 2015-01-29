
var http = require('http') ;

module.exports = {
	get Reporter() { return require('./reporter') },
	get Service() { return require('./service') },

	/* 
	 * Helper (for apps that need monitoring), add the middleware and routes
	 * for checking for HTTP errors and presenting them back to a client
	 */
	reportOn:function(app,config) {
		var reporter = module.exports.Reporter(config) ;
	    app.use(reporter.monitor);
	    app.get('/healthcheck',reporter.lastError);
		return app ;
	},
	
	/* 
	 * Helper (for an app that does monitoring), start a basic HTTP
	 * server and present the monitoring results for the specified 
	 * configuration on the specified port.
	 */
	listen:function(port,config) {
		var route = module.exports.Service.route(config) ;
		http.createServer(route(req,res)).listen(port) ;
	}
}
