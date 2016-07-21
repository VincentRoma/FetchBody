#!/usr/bin/env node
'use strict';

var express  = require('express');
var request = require('request');
var cheerio  = require('cheerio');
var NodeCache = require( "node-cache" );
var url_paser = require('url');
var cors = require('cors');
var app      = express();

var clean_url = function(url, base_url){
    // protocol less
    if(/^\/\//.exec(url)){
        return url;
    }
    // absolute url
    if(/^\/[^\/]/.exec(url)){
        url = url_paser.parse(base_url).host + url;
    }
    if(!/^http/.exec(url)){
        if(base_url){
            return url_paser.parse(base_url).protocol + '//'+url;
        } else {
            return 'http://'+url;
        }
    }
    return url;
};

var myCache = new NodeCache();

app.use(cors());

var get_cache_key = function(request){
    return (request.query.maxwidth || '') + request.query.url;
};

app.get('*', function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var url = req.query.url;


    if(url){
        // Log Activity
        console.log("Request from: "+ ip + " for: " + req.originalUrl);

        // Clean URL
        url = clean_url(url);

        var cache_key = get_cache_key(req);

        // Checking for cache
        myCache.get(cache_key, function(err, value){
            if( !err ){
                if(value){
                    res.statusCode = 200;
                    res.send(value);
                }else{
                    // [HTTP] CRAWL GIVEN URL
                    request(url, function(error, resp, body){

                        if(!error && resp.statusCode === 200){
                            //var $ = cheerio.load(body);
                            //var text = $('p').text();
                            var response = {'html': body};
                            res.statusCode = 200;
                            // Set cache
                            myCache.set(cache_key, response, 172800);
                            res.send(response);
                        }else{
                            var err = {
                                'error': 'Invalid URI: '+url
                            };
                            if(resp){
                                err.status = resp.statusCode;
                            }
                            console.log('Error for url ', url)
                            console.log(error);
                            res.statusCode = 400;
                            res.send(err);
                        }
                    });
                }
            }
        });
    }else{
        //BAD REQUEST
        res.statusCode = 400;
        res.send({'error': "URL is missing in Request"});
    }
});

app.listen(8080);

console.log('Server started on port 8080');
