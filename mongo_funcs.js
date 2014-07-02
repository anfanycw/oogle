// MAP-REDUCE for mongo
// authors: Anthony Wang
//          Ivan Leung

// mapReduce to create inverted index
var map = function() {  
    var text = this.text;
    var hash = {};
    if (text) { 
        // quick lowercase to normalize per your requirements
        var arr = text.toLowerCase().replace(/\'/g,'').replace(/[\W_]+/gm, ' ').split(/\s+/);
        // term total for doc
        var tftotal = arr.length;
        // remove stopwords maybe someday??
        for (var i = 0; i < arr.length; i++) {
            arr[i].replace(/(\r\n|\n|\r|\t)/gm, '').trim();

            var po = [];
            // find term freq in page - HERE
            var tcount = 0;
            if (hash[arr[i]] != 1) { // if not in hash, add to hash as 'noted'
                hash[arr[i]] = 1;
                for (var t in arr) {
                    if (arr[t] == arr[i]) {
                        po.push(t);
                        tcount++;
                    }
                }
            }

            // create payload
            if (arr[i].length > 1) {
                var tfcalc = Math.log(1+(parseInt(tcount)/parseInt(tftotal)));
                tfcalc = Math.round(10000*tfcalc)/10000;
                var value = {
                    count : 1,
                    docs : [{
            			num : this.doc,
                        //terms : tftotal,
                        //tcount : tcount,
                        tf : tfcalc,
                        tfidf : 0,
            			pos : po
                    }]
                }
                emit(arr[i], value); // store a 1 for each word
            }
        }
    }
};

var reduce = function( key, values ) {

    var newcount = { 
    	count: 0,
    	docs: []
    };

    for (var idx in values) {
        // increment count
        newcount.count += values[idx].count;

        // if doc is already there, add to position, otherwise, add new doc
        for (var d in values[idx].docs) {
            var reduced = newcount.docs.length;
            if (reduced > 0) {
                var check = false;
    	        for (var i = 0; i < reduced; i++) {
                	if (newcount.docs[i].num == values[idx].docs[d].num) {
                        check = true;
                    }
    	        }
                if (!check) {
                    // page doesn't exist
                    newcount.docs.push(values[idx].docs[d]);         
                }
    	    } else {
                // first item
    	    	newcount.docs.push(values[idx].docs[d]);
    	    }
        }
    }//*/

    return newcount;
};

var calctf = function (key, reduced) {
    // tf = num term appears in doc / total words in doc

    // calc tf
    for (var i = 0; i < reduced.docs.length; i++) {
        var term_in_doc = reduced.docs[i].tcount;
        var tot_terms_in_doc = reduced.docs[i].terms;
        
        var tf = Math.log(1+(parseInt(term_in_doc)/parseInt(tot_terms_in_doc)));
        tf = Math.round(100000*tf)/100000;
        reduced.docs[i].tf = tf;
    }
    //if (key == "computer")
    //    print(key + " found in tf calc step");  
    return reduced;
};

var calctfidf = function () {
    // idf = log( total words in collecion / total times word appears in collection )
    // tf-idf = tf * idf
    var crawled = "htmlcrawl",
        idxout = "testindex";
    var tf = 0,
        //term_in_collection = 0,
        docs_with_terms = 0,
        //tot_term_in_collection = 0,
        total_docs = 0,
        doc_id = "",
        factor = 100000;

    // get total # of words in collection

    total_docs = db[crawled].stats().count;

    // cursor per term
    db[idxout].find().forEach(function(term) {

        // get specific term count
        docs_with_terms = term.value.docs.length;
        
        // calc idf
        var idf = Math.log(total_docs/docs_with_terms);
        idf = Math.round(factor*idf)/factor;

        // get tf value for every doc term is in
        for (var doc = 0; doc < term.value.docs.length; doc++) {
            //print("Doc #: "+doc);
            // get tf from specific doc number term is in
            tf = term.value.docs[doc].tf;
            doc_id = term._id;

            // get tfidf
            var tfidf = tf * idf;
            tfidf = Math.round(factor*tfidf)/factor;

            var loc = "value.docs."+doc+".tfidf";
            var obj = {};
            obj[loc] = tfidf;

            // update index with new tfidf
            db[idxout].update({ _id: doc_id },{ $set: obj });
        }
    });
};

// map-reduce on crawled data set
var crawled = "htmlcrawl";
var idxout = "testindex";
db[idxout].drop();

db[crawled].mapReduce(
    map, 
    reduce, 
    {
        out: idxout
    }
);

// remove entries where _id is < 2 chars
db[idxout].remove({$where: "this._id.length < 2"})

// calc tfidf and update collection
calctfidf();

///////////// STANDALONE USE FUNCS/SHELLCMDS /////////////

var addDocNums = function () {
    // add doc id
    var count = 0;
    var crawl = db.crawl.find();
    crawl.forEach(function(item) {
        db.crawl.update({"_id" : item._id},{$set:{"doc": count}},{upsert: false, multi: false})
        count++;
    });
}

var addInOut = function () {
    var url = "";
    var inlinks = 0;
    var outlinks = 0;
    var in_out = db.in_out.find();
    in_out.forEach(function(item) {
        url = item.hyperlink;
        inlinks = item.in;
        outlinks = item.out;
        db.crawlf1.update({"hyperlink" : url},{$set:{"in": inlinks, "out": outlinks}},{upsert: false, multi: false})
    });
}

var printToFile = function () {
    cursor = db.index2.find();
    while(cursor.hasNext()){
        printjson(cursor.next());
    }
}



///// REFERENCE FOR MONGO SHELL COMMANDS //////

// index doc num and term id in inverted index
// db.index.ensureIndex({ "value.docs.num" : 1 })
// db.index.ensureIndex({ "_id" : 1 })

// find without certain fields
// db.crawl3.find({}, {html: 0, hyperlink:0, title:0})

// db.index.find().sort({"value.count" : -1})

// exporting
// mongodb\bin\mongoexport.exe -h localhost -p 27017 -d project2db -c index2 -o C:/Users/antcw_000/Desktop/index.json

// printing
// db.index2.find({"_id":"scientific"}).forEach( function(term){ printjson(term) });

// print to file
// ./mongo localhost/project2db --quiet --eval "db.index2.find().forEach(printjson);" > C:/Users/wanga18/Desktop/term.txt

// find largest file
/*
var max = 0;
db.testindex.find().forEach(function(obj) {
    var curr = Object.bsonsize(obj); 
    if(max < curr) {
        max = curr;
    } 
})
print(max);
//*/

// load db into memory beforehand
// db.runCommand({touch: "testindex2", data:true, index:true})