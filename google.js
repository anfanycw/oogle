// NODE JS script to fetch google top 10

// Author: Anthony Wang
//		   Ivan Leung

var google = require('google');

google.resultsPerPage = 10;
var nextCounter = 0;

google('site:ics.uci.edu graduate courses', function(err, nextpage, links){
	if (err) console.error(err);

	for (var i = 0; i < links.length; ++i) {
		console.log(links[i].title + ' | URL: ' + links[i].link); //link.href is an alias for link.link
		console.log("-------");
	}
});