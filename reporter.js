/* 
 * Trap out-going http errors and remember them so we can serve the last known error
 */

module.exports = function Reporter(config){
	var last ;

	config = config || {} ;
	config.errorTTL = config.errorTTL || 600000 ;
	config.errorThreshold = 400 ;

	return {
		monitor:function(req,res,next){
			var writer = res.write ;
			var responseBody = [] ;
			res.write = function(chunk) {
				if (!res.statusCode || res.statusCode>=config.errorThreshold)
					responseBody.push(chunk) ;
				writer.apply(this,arguments) ;
			}
			res.on('finish',function(){
				if (!req.doNotMonitor && res.statusCode>=config.errorThreshold)
					last = {
						url:req.originalUrl,
						status:res.statusCode,
						timestamp:Date.now(), 
						response:responseBody && responseBody.map(function(x){ 
							return x.toString()}).join("")} ;
			}) ;
			next && next() ;
		},

		lastError:function(req,res,next){
			req.doNotMonitor = true ;
			if (last) last.age = Date.now()-last.timestamp ;
			if (last && last.age<config.errorTTL) 
				res.status(400).json({status:"ERROR",lastError:last}) ;
			else
				res.json({status:"OK", lastError:last}) ;
		},

		setLastError:function(info){
			last = {
					status:999,
					timestamp:Date.now(), 
					error:info
			} ;
		}
	}
}
