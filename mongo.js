// Oogle - mongodb
// Author: Anthony Wang

var Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server,
	BSON = require('mongodb').BSON,
	ObjectID = require('mongodb').ObjectID;

MongoServer = function(host, port) {
	this.db = new Db('project2db', new Server(host, port, {safe: false}, {auto_reconnect: true}, {}));
	this.db.open(function(){
		console.log('Connected to MongoDB');
	});
};

MongoServer.prototype.getCollection = function(col, callback) {
	this.db.collection(col, function(error, collection){
		if (error)
			callback(error);
		else
			callback(null, collection);
	})
};

MongoServer.prototype.findAll = function(terms, callback) {
	this.getCollection('testindex2', function(error, collection) {
		if (error)
			callback(error);
		else {
			//console.log("Getting pages for terms: "+ terms);
			collection.aggregate([
				{ $match : 
					{ 
						'_id' : { $in : terms },
					} 
				},
				{ $unwind : '$value.docs' },
				{ $project : 
					{ 
						'_id' : 0,
					  	'docs' : '$value.docs.num',
					  	'tfidf' : '$value.docs.tfidf',
					  	'pos' : '$value.docs.pos'
					}
				},
				{ $group :
					{
						'_id' : '$docs',
						'weight' : { $sum : '$tfidf' },
						'posArr' : { $addToSet: '$pos' }
					}
				},
				{ $sort : 
					{ 'weight' : -1 } 
				},
				{ $limit: 750 }
			], function(error, results){
				if (error)
					callback(error);
				else
					callback(null, results);
			});
		}
	});
};

MongoServer.prototype.findDocs = function(docs, callback) {
	this.getCollection('crawlf1', function(error, collection) {
		if (error)
			callback(error);
		else {
			//console.log("Getting specific docs...");
			//console.log(docs);
			collection.find(
				{ 
					'doc' : { $in : docs },
					//$or : docs,
				},
				{
					'doc' : 1,
					'hyperlink' : 1,
					'title' : 1,
					'in' : 1,
					'out' : 1,
					'html' : 1,
					'text': 1,
					'_id' : 0
				}
			).toArray(function(err, res) {
				if (error)
					callback(error);
				else
					callback(null, res);
			});//*/
		}
	});
};

exports.MongoServer = MongoServer;