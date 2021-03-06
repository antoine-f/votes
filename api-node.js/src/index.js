var fs = require('fs');
var express  = require('express');
var app = express();
var port = process.env.PORT || 5004;
var http = require('http');

//Express Middlewares
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

var elections = require("./data/elections.json");

//Variable for simple concurrency
var apiLocked = false;


//API routes

app.get('/api/Votes/Elections', function(request, response) {
	response.contentType('application/json');
	response.status(200).json(elections);
});


//Creation of the request parameter :id
app.param('id', function (request, response, next, id) {
	next();
});

app.get('/api/Votes/Elections/:id', function(request, response) {
	var election = '';
	for(i in elections){
		console.log(elections[i]);
		if(elections[i].id === request.params.id){
			election = elections[i];
		}
	}

	if(election === ""){
		response.contentType('text/html');
		response.status(404).send("This election does not exist!");
	}else{
		response.contentType('application/json');
		response.status(200).json(election);
	}
});



app.put('/api/Votes/Elections/:id', function(request, response) {
	if(!apiLocked){
		apiLocked = true;
		var election = {id: request.params.id, votes:[]};
		elections.push(election);
		fs.writeFile('data/elections.json', JSON.stringify(elections), function(error) {
			if(error) {
				return console.log(error);
			}
			apiLocked = false;
			response.contentType('application/json');
			response.status(200).json(elections);
		});
	}else{
		response.contentType('text/html');
		response.status(423).send("Concurrency lock: please retry.");
	}
});

app.post('/api/Votes/Elections/:id/Votes', function(request, response) {
	if(!apiLocked){
		apiLocked = true;
		var election = '';
		for(i in elections){
			if(elections[i].id === request.params.id){
				if(request.body.prenom && request.body.choix){
					elections[i].votes.push(request.body);
					election = elections[i];

					fs.writeFile('data/elections.json', JSON.stringify(elections), function(error) {
						if(error) {
							return console.log(error);
						}
					});
				}else{
					apiLocked = false;
					response.contentType('text/html');
					response.status(400).send("Wrong format for the vote JSON.");
				}
			}
		}
		if(election === ""){
			apiLocked = false;
			response.contentType('text/html');
			response.status(404).send("This election does not exist!");
		}else{
			apiLocked = false;
			response.contentType('application/json');
			response.status(200).json(election);
		}
	}else{
		response.contentType('text/html');
		response.status(423).send("Concurrency lock: please retry.");
	}
});

// Teapot HTTP code
app.all('/api',function(request,response){
    response.contentType('text/html');
	response.status(418).send('I am a teapot API.');
});

// HTTP codes for bad requests
app.delete('*',function(request,response){
	response.contentType('text/html');
    response.status(405).send('DELETE method not allowed.');
});

app.all('*', function(request, response){
	response.contentType('text/html');
	response.status(400).send('This URL does not exist, or the HTTP method is incorrect. See the readme to see valid requests.');
});

app.listen(port);
console.log("App listening on port " + port);
