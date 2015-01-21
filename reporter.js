/* 
 * Trap out-going http errors and remember them so we can serve the last known error
 */

module.exports = function Reporter(config){
	var last ;

	config = config || {} ;
	config.errorTTL = config.errorTTL || 600000 ;
	config.errorThreshold = 400 ;

	Reporter.monitor = function(req,res,next){
		var writer = res.write ;
		var responseBody = [] ;
		res.write = function(chunk) {
			if (res.statusCode>=errorThreshold)
				responseBody.push(chunk) ;
			writer.apply(this,arguments) ;
		}
		res.on('finish',function(){
			if (res.statusCode>=errorThreshold)
				last = {
					url:req.originalUrl,
					status:res.statusCode,
					timestamp:Date.now(), 
					response:responseBody.map(function(x){ 
						return x.toString()}).join("")} ;
		}) ;
		next && next() ;
	};

	Reporter.lastError = function(req,res,next){
		if (last) last.age = Date.now()-last.timestamp ;
		if (last && last.age<config.errorTTL) 
			res.status(400).json({status:"ERROR",lastError:last}) ;
		else
			res.json({status:"OK", lastError:last}) ;
	};

	Reporter.setLastError = function(info){
		last = {
			status:999,
			timestamp:Date.now(), 
			error:info
		} ;
	};
}
