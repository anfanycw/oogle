// Author: Anthony Wang

$(function() {
	
	var addr = window.location.origin,
		timer = undefined,
		ndcgarr = [],
		googlearr = [],
		xhr = undefined,
		ajaxprocess = false;

	$('#backbtn-top')
	.click(function(event) {
		window.location = '/'
	});

	$('#searchbox-main')
	.keyup(function() {
		$('#results').empty();
		$('#loading').hide();
		var terms = $('#searchbox-main').val();
		$('#searchmain').css('display', 'none');
		$('#searchres').css('display', 'block');
		$('#searchbar-top').val(terms);
		$('#searchbar-top').focus();
		$("#resultpages li a.pager-prev").prop('disabled', true);
	});

	$('#searchbar-top')
	.keyup(function(event) {
		var terms = $('#searchbar-top').val();
		if (event.which != 13) {
			if (terms.length > 2) {
				$('#results').empty();
				$('#loading').hide();
				// delay
				clearTimeout(timer);
				timer = setTimeout(function() {
					if (ajaxprocess)
						xhr.abort();
					search(terms, 0);
				}, 350);
			} else {
				$('#results').empty();
				$('#results').html('<span id="emptysearch" class="label label-default">No Results...</span>');
			}
		}
	});//*/

	// on oogleit button on secondary search page
	$('#searchbar-top')
	.keypress(function(event) {
		var text = $('#searchbar-top').val();
		if (event.which == 13) {
			if (text != "") {
				$('#results').empty();
				event.preventDefault();
				search(text);
			}
		}
	});//*/

	$('#searchbtn-top')
	.click(function(event) {
		var text = $('#searchbar-top').val();
		if (text != "") {
			$('#results').empty();
			event.preventDefault();
			search(text);
		}
	});

	$('#searchbtn-main')
	.click(function(event) {
		var text = $('#searchbox-main').val();
		if (text != "") {
			$('#results').empty();
			event.preventDefault();
			search(text);
		}
	});

	$('#statsbtn')
	.click(function(event) {
		var text = $('#searchbar-top').val();
		if (text != "") {
			$('#ndcg').empty();
			event.preventDefault();
			$('.ndcgtitle').html(text);
			var at = parseInt($('ul#ndcgpills li.active a').attr('name'));
			getNDCG(text, at);
		}
	});

	$('.ndcgpill')
	.click(function(event) {
		var text = $('#searchbar-top').val();
		var at = $(this).attr('name');
		$('ul#ndcgpills li.active').removeClass('active');
		$(this).parent('li').addClass('active');
		if (text != "") {
			$('#ndcg').empty();
			event.preventDefault();
			//$('.ndcgtitle').html(text);
			getNDCG(text, at);
		}
	});

	$(".pager li a")
	.click(function(event) {
		event.preventDefault();
		if ($("#results div.panel").length > 0) {
			if ($(this).attr("name") == "prev") {
				var lastpage = parseInt($("#results div.panel:last").attr("class").replace(/panel\spanel-default\spanel-/g, '').replace(/\spanel-hide/g,''));
				var currpage = parseInt($("#results div.panel-show").attr("class").replace(/panel\spanel-default\spanel-/g, '').replace(/\spanel-hide/g,''));
				$(".pager li a[name='next']").prop('disabled', false);

				if (currpage-1 < 1 || currpage == 0)
					$(this).prop("disabled", true);

				if (currpage > 0) {
					var prevpage = currpage-1;
					$("#results div.panel-"+currpage).addClass("panel-hide").removeClass("panel-show");
					$("#results div.panel-"+prevpage).removeClass("panel-hide").addClass("panel-show");
				}
			} else {
				var lastpage = parseInt($("#results div.panel:last").attr("class").replace(/panel\spanel-default\spanel-/g, '').replace(/\spanel-hide/g,''));
				var currpage = parseInt($("#results div.panel-show").attr("class").replace(/panel\spanel-default\spanel-/g, '').replace(/\spanel-hide/g,''));
				$(".pager li a[name='prev']").prop('disabled', false);

				if (currpage == lastpage-1)
					$(this).prop("disabled", true);

				if (currpage < lastpage) {
					var nextpage = currpage+1;
					$("#results div.panel-"+currpage).addClass("panel-hide").removeClass("panel-show");
					$("#results div.panel-"+nextpage).removeClass("panel-hide").addClass("panel-show");
				}
			}
		}
	});

	/*

	// on oogleit button main page - not needed for now
	$('#searchbox-main')
	.keypress(function(event) {
		var text = $('#searchbox-main').val();
		if (event.which == 13) {
			if (text != "") {
				event.preventDefault();
				clickFunc('search-main', text);
			}
		}
	});	

	*/

	function search(terms) {
		$('#loading').show();
		// clear global arrays
		ndcgarr = [];
		googlearr = [];

		xhr = $.ajax({
			url: addr+'/query',
			dataType: 'json',
			timeout: 10000,
			data: {
				query: terms
			},
			beforeSend: function() {
				$('#loading').show();
				ajaxprocess = true;
			},
			success: function(data) {
				var skip = 0,
					first = 0;

				if (!data.length > 0) {
					$('#results').html('<span id="emptysearch" class="label label-warning">No Results Found!</span>');
				} else {
					$("#loading").hide();	
					var pages = data.length;

					$.map(data, function(item) {
						var title = item.title,
							url = item.hyperlink,
							doc = item.doc,
							inlinks = item.in,
							outlinks = item.out,
							preview = item.snippet;

						if (typeof title !== 'undefined' && typeof url !== 'undefined') {
							if (title == null || title == "")
								title = "[No title]";
							if (typeof preview == 'undefined')
								preview = "[No preview available]"
							// highlight relevant terms
							var terms = $('#searchbar-top').val().toLowerCase();
							var termArr = terms.split(" ");
							var panel = "";

							if (first < 10) {
								// store top 10 url for ndcg calc later
								ndcgarr.push(url);

								// put items in results div
								panel = '<div class="panel panel-default panel-'+skip+' panel-show">'+
											'<div class="panel-heading"><a target="_blank" href="#">'+title+'</a></div>'+
											'<div class="panel-body">'+
												'<font color="#999">URL: '+url+'</font><br/>'+
												'<br/>'+preview+' ...'+
											'</div>'+
										'</div>';
							} else {
								if (first%10 == 0)
									skip++;
								// put items in results div but hide
								panel = '<div class="panel panel-default panel-'+skip+' panel-hide">'+
											'<div class="panel-heading"><a target="_blank" href="#">'+title+'</a></div>'+
											'<div class="panel-body">'+
												'<font color="#999">URL: '+url+'</font><br/>'+
												'<br/>'+preview+' ...'+
											'</div>'+
										'</div>';								
							}
							first++;

							// bold phrase
							for (t in termArr) {
								var uword = termArr[t].charAt(0).toLowerCase()+termArr[t].substr(1,termArr[t].length-1);
								var patt = new RegExp(uword, "gm");
								var word = panel.match(patt);
								if (word)
									panel = panel.replace(patt, '<b>'+word[0]+'</b>');

								var lword = termArr[t].charAt(0).toUpperCase()+termArr[t].substr(1,termArr[t].length-1);
								var patt2 = new RegExp(lword, "gm");
								var word2 = panel.match(patt2);
								if (word2)
									panel = panel.replace(patt2, '<b>'+word2[0]+'</b>');
							}

							// avoid <b> tag in url
							panel = panel.replace('href="#"', 'href="'+url+'"');
							
							$('#results').append(panel);
						}
					});
				}
			},
			complete: function(event) {
				ajaxprocess = false;
			}
		});
	}

	function getNDCG(terms, cnt) {
		$.ajax({
			url: addr+'/stats',
			dataType: 'json',
			timeout: 5000,
			data: {
				query: terms,
				at: cnt
			},
			beforeSend: function() {
				$('#modalloading').show(); // modal show
			},
			success: function(data) {
				if (!data.length > 0) {
					$('#ndcg').html('<span id="ndcg-warn" class="label label-warning">Somethings wrong!</span>');
				} else {
					$.map(data, function(item) {
						// add url to array
						googlearr.push(item);
					});
				}
			},
			complete: function(xhr, status) {
				$('#modalloading').hide();
				if (status == "success") {
					var res = [];
					var ideal = undefined;
					if (cnt == 10)
						ideal = [10,9,8,7,6,5,4,3,2,1];
					else
						ideal = [5,4,3,2,1];
					var found = false;
					//console.log(googlearr);
					for (var u in ndcgarr) {
						for (var g in googlearr) {
							var ourURL = ndcgarr[u].replace(/http:\/\//g, '');
							var googleURL = googlearr[g].replace(/(http:\/\/|https:\/\/)/g, '');
							if (ourURL == googleURL) {
								// push relevancy score for d
								var relevance = cnt - parseInt(g);
								res.splice(u, 0, relevance);
								found = true;
								break;
							}
						}
						if (!found) {
							res.splice(u, 0, 0);
						}
						found = false;
					}

					// calculate ndcg@10
					var dcg = calcDCG(res, cnt, true);

					//console.log("Prelim Total: "+dcg);
					$("#ndcg").append("<br/><span><b>Unnormalized total: "+dcg+"</b></span><br/>");
					$("#ndcg").append("<br/>");

					//res.sort(function(a, b) {
					//	return b - a;
					//});

					var dcg_norm = calcDCG(ideal, cnt, false);

					//console.log("Normalized Total: "+ dcg_norm);
					$("#ndcg").append("<br/><span><b>Normalized total: "+dcg_norm+"</b></span><br/>");

					var ndcg = 0;
					if (dcg > 0 && dcg_norm > 0)
						ndcg = Math.round(1000*(dcg / dcg_norm))/1000;

					$("#ndcg").append("<br/>");
					//console.log("------ NDCG@10 -------");
					if (cnt == 10)
						$("#ndcg").append("<span>--------- NDCG@10 --------</span><br/>");
					else
						$("#ndcg").append("<span>--------- NDCG@5 --------</span><br/>");
					//console.log("Score: "+ ndcg);
					$("#ndcg").append("<span><b>Score: "+ndcg+"</b></span><br/>");
				}
			}
		});
	}

	function calcDCG(rel, cnt, norm) {
		var oracle = undefined;
		if (cnt == 10)
			oracle = [1,2,3,4,5,6,7,8,9,10];
		else
			oracle = [1,2,3,4,5];
		var res = [];
		if (norm)
			$("#ndcg").append("<span>DCG score for page 1 is: "+rel[0]+"</span><br/>");
		else
			$("#ndcg").append("<span>IDCG score for page 1 is: "+rel[0]+"</span><br/>");

		for (var o=1; o<oracle.length; o++) {
			var s = 0;
			if (rel[o] > 0)
				s = Math.round( 1000 * (rel[o] / (Math.log(oracle[o])/Math.LN2)))/1000;
			res.push(s);
			if (norm)
				$("#ndcg").append("<span>DCG score for page "+(o+1)+" is: "+s+"</span><br/>");
			else
				$("#ndcg").append("<span>IDCG score for page "+(o+1)+" is: "+s+"</span><br/>");
		}

		//console.log(res);
		var total = res.reduce(function(prev, next, index, array) {
			return prev + next;
		});

		var dcg = rel[0] + total;

		return dcg;
	}

});