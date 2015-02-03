/* 
 * Report on the status of a collection of services.
 * 
 * The supported methods for testing the services defined here is:
 * 	for HTTP: 	ping(url,[result-validation-expression])
 *  
 *  For 'ping' the optional result-validation-expression is used if the HTTP request
 *  return correctly formatted json with a status code of <2xx. The request can be made to 
 *  'fail' if the condition is met. The parsed JSON response is bound to the expression, e.g:
 *  	"this.messsages>10" 
 *  will cause the ping to fail is the HTTP statusCode >=300, the response is not JSON, or it
 *  is JSON and contains a member called 'messages' that is > 10, otherwise it passes.
 */

var http = require('http'),
    async = require('async'),
    path = require('path'),
    util = require('util'),
    URL = require('url');

var probe = {} ;

probe.ping = function(a) {
	var validate ;
	if (a.validation) {
		validate = new Function("require","if ("+a.validation+") return '"+a.validation+"'") ;
	}
	return function(cb) {
		var result = this ;
		http.get(a.url,function(res){
			if (res.statusCode>=400) {
				result.error = res.statusCode ;
			} else {
				result.ok = true ;
			}
			result.detail = "" ;
			res.on('data',function(chunk){ result.detail += chunk.toString() }) ;
			res.on('end',function(){ 
				try {
					result.detail = JSON.parse(result.detail) ;
				} catch (meh) {} ;
				if (result.ok && validate) {
					var v = validate.call(result.detail,require) ;
					if (v) {
						delete result.ok ;
						result.error = v ; 
					}
				}
				cb() ; 
			}) ;
		}).on('error',function(err){
			result.error = err ;
			cb() ;
		}) ;
	};
};

/* If they don't exist, implement the Express like API on a ServerResponse */
function enhanceResponse(res) {
	res.status = res.status || function(code) { res.statusCode = code ; return res ; } ;
	res.json = res.json || function(obj) {
		res.setHeader("Content-Type","application/json") ;
		res.end(JSON.stringify(obj)) ;
	}
	return res ;
}

function route(config){
	var probes = {}
	Object.keys(config).forEach(function(k){
		if (config[k] && config[k].probe && probe[config[k].probe])
			probes[k] = probe[config[k].probe].call(null,config[k]);
	}) ;
	
	return function(req,res) {
		res = enhanceResponse(res) ;
		var status = {} ;
		
		var checks = Object.keys(probes).map(function(k){
			status[k] = {} ;
			return probes[k].bind(status[k]);
		}) ;
		
		async.parallel(checks,function(err,mapped){
			for (var k in status) {
				if (status[k].error) {
					res.status(400).json({status:"ERROR",details:status}) ;
					return ;
				}
			}
			res.json({status:"OK",details:status}) ;
		}) ;
	}
};

module.exports = {
	route:route,
	probe:probe
};
