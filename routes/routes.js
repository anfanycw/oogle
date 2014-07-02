var mongo = require('mongodb'),
	fs = require('fs'),
	exec = require('child_process').exec,
	stats = require('stats-lite'),
	google = require('google');

var dbloc = 'localhost',
	port = 27017;

var MongoServer = require('../mongo').MongoServer;
var mongodb = new MongoServer(dbloc, port);

exports.index = function(req, res) {
	res.render('index', {
		title: "Oogle"
	});
};

exports.stats = function(req, res) {
	var query = req.query.query.toLowerCase();
	var at = req.query.at;
	var gquery = "site:ics.uci.edu "+ query;
	google.resultsPerPage = at;
	var gcnt = 0;
	var retArr = [];

	google(gquery, function(err, nextpage, links){
		if (err) 
			console.error(err);

		for (var i = 0; i < links.length; ++i) {
			//console.log(links[i].title + ' - ' + links[i].link);
			//console.log(links[i].description + "\n");
			retArr.push(links[i].link);
		}

		// send it off!
		res.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
		res.write(JSON.stringify(retArr));
		res.end();			
	});

};

exports.query = function(req, res) {
	var q = req.query.query.toLowerCase(),
		cnt = req.query.cnt;
	var terms = q.trim().split(" ");
	var tcnt = terms.length;
	console.log(terms);
	console.time("totalTime"); //--------> total start timer
	console.time("indexquery");

	mongodb.findAll(terms, function(err, doclist) {
		console.timeEnd("indexquery");

		// console.log("---- initial list ----")
		//selectDoc(null, doclist);

		// [{doc : #}, weight ]
		console.time("convertArray");
		var docnums = convertToArray(doclist, tcnt);
		
		//console.log("----- after avgpos -------")
		//selectDoc(docnums, null);
		
		// [{_id : #}, {_id : #}, ...]
		var querydocs = [];
		for (var d in docnums)
			querydocs.push(docnums[d][0].doc);

		console.timeEnd("convertArray");

		console.time("crawlquery");
		mongodb.findDocs(querydocs, function(err, result) {
			console.timeEnd("crawlquery");

			// heuristic: if terms in title or url, then ++
			console.time("evalTitleURL");
			evalTitleUrl(terms, q, result, docnums); // (array[terms], terms string, crawl results, index results)
			console.timeEnd("evalTitleURL");

			// sort weighted array of docs
			console.time("sortcreateFINAL");

			//console.log("--------- after titl/url/inout ---------");
			//selectDoc(docnums, null);

			docnums.sort(function(x, y) {
				return y[1] - x[1];
			});
			
			//console.log("--------- after final sort ---------");
			//selectDoc(docnums, null);

			// now create return array
			var resArr = [],
				finArr = [];

			for (var r in result)
				resArr.push(result[r]);
			for (var d in docnums) {
				resArr.filter(function(elem) {
					if (docnums[d][0].doc == elem.doc) {
						finArr.push(elem);
					}
				});
			}//*/
			console.timeEnd("sortcreateFINAL");
			console.timeEnd("totalTime"); //------------> total end timer

			// send it off!
			res.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
			res.write(JSON.stringify(finArr));
			res.end();
		});
	});
};

function evalTitleUrl(query, qstring, results, weighted) {
	for (var r in results) {
		var url = results[r].hyperlink,
			title = results[r].title,
			doc_id = results[r].doc,
			inlinks = results[r].in,
			outlinks = results[r].out;
		
		var html = results[r].html.toString();
		/*var html = results[r].html.toString().replace(/(\r\n|\n|\r|\t)/gm, '');
		html = html.replace(/\s+/gm, ' ').replace(/<\/h\d>\s?/gm, '.').toString();
		if (doc_id == 334)
			//console.log(html);
		html = html.replace('/<script[\w\S\s\W]+?<\/script>/gm', '').replace(/<head[\w\S\s\W]+?<\/head>/gm, '').toString();
		html = html.replace('/<script\b[^>]*>(.*)<\/script>/gm', '');
		if (doc_id == 334)
			console.log(html);
		html = html.replace(/<([\S+\s+\/\w\d]+?|\w+?)>/gm, ' ').replace(/\s+/gm, ' ');
		//*/

		var text = results[r].text.replace(/(\r\n|\n|\r|\t|\s)+/gm, ' '),
			snippet = "[No preview available]",
			score = 0;

		// additional weighting
		if (title != null && url != null && inlinks != null 
			&& outlinks != null && html != null) {
			// trim urls .. not entirely necessary
			url = url.toString().toLowerCase();
			title = title.toString().toLowerCase();

			// markup score for complete query string match in title
			if (title.indexOf(qstring) > -1) {
				score += 1; // needs real contemplation
				
				// mark up for high TF
				var checktitle = title.replace(/\'/g,'').replace(/[\W_]+/gm, ' ').split(/\s+/);
				var tf = query.length/checktitle.length;
				var logtf = Math.log(1+tf)/Math.LN10;
				score += logtf;
			}

			// prepare snippet for preview
			var str = qstring.split(' ').join("|");
			//var patt = "[^.!?]([\w\S]+\s+){11}";
			var patt = "[^.!?\\&\\'#\\-:<>\\(\\)\\[\\]0-9][\\\"\\(\\)\\/,;\\&\\:\\#'\\-<>\\w\\s0-9]*("+str+")[\\\"\\(\\)\\/,;\\:\\#'\\-<>\\w\\s0-9]*[.?!]";
			var reg = new RegExp(patt,"gm");
			var snipout = text.match(reg);
			//if (doc_id == 334) {
				//console.log("--- snipout ---");
				//console.log(html);
			//}
			if (snipout) {
				snippet = snipout[0];//.replace(/<([\'\"\/\w\d]+?|\w+?)>/g, ' ');
				results[r].snippet = snippet;
			}//*/

			for (var q in query) {

				// + match per term in title and url
				if (url.indexOf(query[q]) > -1)
					score+= 1/query.length;
				else if (title.indexOf(query[q]) > -1)
					score+= 1/query.length;

				// + for html <h#>text</h> matches and <a href>text</a> matches
				var count = 0;
				var hreg = new RegExp("<h[1-2]>(.*?)<\/h[1-2]>", "g");
				//var areg = new RegExp("<(a|A)\\s(href|HREF)=\".*?\">(.*?)<\/(a|A)>", "g");
				var out1 = html.match(hreg);
				//var out2 = html.match(areg);
				if (out1) {
					out1 = out1.join().split(" "+query[q]+" ").length;
					if (out1 > 1)
						score++;
				}
			}

			if (!snipout) {
				var patt3 = "[^.!?;:,'\\\"]((?:(\\S+\\s+){1,10})\\w+)";
				var reg3 = new RegExp(patt3,"g");
				var snipout3 = text.match(reg3);
				/*if (doc_id == 344) {
					console.log("--- snipout3 ---");
					console.log(snipout3);
				}//*/
				if (snipout3)
					results[r].snippet = snipout3[Math.floor(snipout3.length/2)];
			}//*/

			// mark up for index pages ("authority")
			var reghome = new RegExp(".*(index|home)\.(html|htm|php)$", "g");
			if (reghome.test(url)) {
				score++;
			}

			// mark up for inlinks -- watch for #234 type pages
			var reglinks = new RegExp("(fano|drzaius)\.ics.*\/(apidoc|javadoc|xref|rules|cites)\/", "gi");
			if (!reglinks.test(url)) {
				score += Math.log(1+Math.log(1+(inlinks*Math.log(1+outlinks)/Math.LN10))/Math.LN10)/Math.LN10;
			}
		}

		if (score > 0)
			modifyWeight(weighted, doc_id, score, results);
	}
}

function modifyWeight(array, doc_id, score, results) {
	for (var idx in array) {
		if (array[idx][0].doc == doc_id) {
			array[idx][1] = parseFloat(array[idx][1]) + (score);
		}
	}
}

// includes positional ranking
function convertToArray(json, tcnt) {
	var best = [];
	var arr = [];
	for (var item in json) {
		var doc = json[item],
			len = doc.posArr.length;


		if (len >= tcnt-1) {
			// multiplier for positional similarities
			var multiplier = checkPositions(doc.posArr);
			// add to best tuple array for resorting by weights later
			best.push([{"doc": doc._id}, parseFloat(doc.weight)*multiplier]);
		} else {
			//arr.push(doc._id);
			arr.push([{"doc": doc._id}, parseFloat(doc.weight)]);
		}
	}
	if (best.length > 0) {
		// sort best array and then append normal array to it
		best.sort(function(x, y) {
			return x[1] - y[1];
		});
		// put at beginning of return array
		for (var b in best)
			arr.unshift(best[b]);
	}
	return arr;
}

function checkPositions(posArrs) {
	// nps (num of pages) with all terms
	var nps = posArrs.length;

	if (nps > 1) {
		// do position difference averaging!
		var initArr = posArrs.shift(),
			allArr = [],
			diffArr = [];

		for (var p in posArrs) {
			initArr.push.apply(posArrs[p]);
		}

		var avgdiff = 0; // only weigh more if position array has > 1 value
		var len = 0;
		if (initArr.length > 1) {
			for (var i = 0; i < initArr.length-1; ++i) {
				if (i+1 >= initArr.length)
					break;
				else {
					diffArr.push(Math.abs(initArr[i+1] - initArr[i]));
				}
			}
			len = diffArr.length;
			avgdiff = stats.mean(diffArr);
		}

		if (avgdiff != 0)
			nps = Math.log(1+(len/avgdiff))/Math.LN10;
			//nps += ((1+(1/avgdiff)) * Math.log(len));
		return nps;
	} else
		return 1;
}

// FOR DEBUGGING ONLY
function selectDoc(docnums, doclist) {
	// student affairs
	//var array = [7, 334, 217, 238, 181, 264, 227, 256, 53, 185, 498];
	// machine learning
	//var array = [218, 1739 ,1733];
	// AI
	var array = [27178, 33329, 13475, 99, 1472];
	if (docnums) {
		for (var d in docnums) {
			for (var a in array) {
				if (docnums[d][0].doc == array[a])
					console.log(docnums[d]);
			}
		}
	} else if (doclist) {
		for (var d in doclist) {
			for (var a in array) {
				if (doclist[d]._id == array[a])
					console.log("{"+doclist[d]._id+", "+doclist[d].weight+"}");
			}
		}
	}
}






