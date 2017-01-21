
// https://devcenter.heroku.com/articles/mongolab
// http://todomvc.com/examples/angularjs/#/
var express  = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    request = require("request"),
    fs = require('fs'),
    http = require( "http" ),
    url = require( "url" ),

    // Mongoose Schema definition
    Schema = new mongoose.Schema({
      id       : String, 
      Concurso : Number,
      Dezena1  : Number,
      Dezena2  : Number,
      Dezena3  : Number,
      Dezena4  : Number,
      Dezena5  : Number,
      Dezena6  : Number,
      DataSorteio  : Date,
      Gabarito  : Number
    }),

    URL_GET_COOKIES = "http://www1.caixa.gov.br/loterias/loterias/megasena/download.asp";
    URL_ARQUIVO_RESULTADOS = "http://www1.caixa.gov.br/loterias/_arquivos/loterias/D_mgsasc.zip";

    Resultado = mongoose.model('Resultado', Schema);

mongoose.connect(process.env.MONGOLAB_URI, function (error) {
    if (error) console.error(error);
    else console.log('mongo connected');
});

express()
  // https://scotch.io/tutorials/use-expressjs-to-get-url-and-post-parameters
  .use(bodyParser.json()) // support json encoded bodies
  .use(bodyParser.urlencoded({ extended: true })) // support encoded bodies




  //API
  .get('/api', function (req, res) {
    res.json(200, {msg: 'OK' });
  })

  .get('/api/version', function (req, res) {
    res.json(200, {msg: process.env.VERSION });
  })



  //Resultados

  .get('/api/resultados/download', function (req, res) {

    request({
      uri: URL_GET_COOKIES,
      method: 'GET',
      jar: true,
      followAllRedirects: true,
      maxRedirects: 2 
      }, function(err, res, body) {
        if(err) {
            return console.error(err);
        }

      var file = fs.createWriteStream(__dirname + "/file.zip");

      request({
      uri: URL_ARQUIVO_RESULTADOS,
      method: 'GET',
      jar: true
      }, function(err, res, body) {
          if(err) {
              return console.error(err);
          }
        //console.log("Got a response!", res);
        //console.log("Response body:", body);
      }).pipe(file);
    });

    res.json(200, {msg: 'OK' });
    
  })

  .get('/api/resultados', function (req, res) {
    // http://mongoosejs.com/docs/api.html#query_Query-find
    Resultado.find( function ( err, todos ){
      res.json(200, todos);
    });
  })

  .post('/api/resultados', function (req, res) {
    var todo = new Resultado( req.body );
    todo.id = todo._id;
    // http://mongoosejs.com/docs/api.html#model_Model-save
    todo.save(function (err) {
      res.json(200, todo);
    });
  })

  .del('/api/resultados', function (req, res) {
    // http://mongoosejs.com/docs/api.html#query_Query-remove
    Resultado.remove({ completed: true }, function ( err ) {
      res.json(200, {msg: 'OK'});
    });
  })

  .get('/api/resultados/:id', function (req, res) {
    // http://mongoosejs.com/docs/api.html#model_Model.findById
    Resultado.findById( req.params.id, function ( err, todo ) {
      res.json(200, todo);
    });
  })

  .put('/api/resultados/:id', function (req, res) {
    // http://mongoosejs.com/docs/api.html#model_Model.findById
    Resultado.findById( req.params.id, function ( err, todo ) {
      todo.title = req.body.title;
      todo.completed = req.body.completed;
      // http://mongoosejs.com/docs/api.html#model_Model-save
      todo.save( function ( err, todo ){
        res.json(200, todo);
      });
    });
  })

  .del('/api/resultados/:id', function (req, res) {
    // http://mongoosejs.com/docs/api.html#model_Model.findById
    Resultado.findById( req.params.id, function ( err, todo ) {
      // http://mongoosejs.com/docs/api.html#model_Model.remove
      todo.remove( function ( err, todo ){
        res.json(200, {msg: 'OK'});
      });
    });
  })

  .use(express.static(__dirname + '/'))
  .listen(process.env.PORT || 5000);