// https://devcenter.heroku.com/articles/mongolab
// http://todomvc.com/examples/angularjs/#/
var express  = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    request = require("request"),
    fs = require('fs'),
    http = require( "http" ),
    url = require( "url" ),
    unzip = require("unzip"),
    moment = require('moment'),
    YQL = require('yql'),

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
    
    TODAY = moment(new Date()).format('YYYYMMDD');
    PATH_DOWNLOAD = __dirname + "/DOWNLOAD";
    PATH_EXTRACTED = __dirname + "/EXTRACTED";
    FILE_DOWNLOAD = PATH_DOWNLOAD + "/" + TODAY +".zip";
    FILE_EXTRACTED = PATH_EXTRACTED + "/" + TODAY +".htm";;
    FILE_EXTRACT_TARGET = "d_megasc.htm";


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

      var file = fs.createWriteStream(FILE_DOWNLOAD);

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


    .get('/api/resultados/descompactar', function (req, res) {

      fs.createReadStream(FILE_DOWNLOAD)
      .pipe(unzip.Parse())
      .on('entry', function (entry) {
          var fileName = entry.path;
          var type = entry.type; // 'Directory' or 'File' 
          var size = entry.size;
          console.log(fileName);
          if (fileName === FILE_EXTRACT_TARGET) {
              entry.pipe(fs.createWriteStream(FILE_EXTRACTED));
          } else {
              entry.autodrain();
          }
        });

      res.json(200, {msg: 'OK' });

    })

  
  .get('/api/resultados/parse', function(req,res){
    
    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    //var q =  "select * from html where url=\"http://www.shinty.com/news/\"";

    var ResultadoParse = [];

    var url = req.protocol + '://' + req.get('host') +"/EXTRACTED/"+ TODAY +".htm";
    var url2 = "https://megamanager-heroku.herokuapp.com/EXTRACTED/20170123.htm";
    var q2 = "select * from html where url="+ "\""+ url2 + "\" and xpath=\"//html/body/table/tbody\"";

    console.log(url);
    console.log(q2);
    
    var yqlCmd = new YQL(q2);
        
    yqlCmd.exec(function (error, response) {

      //console.log("Parse!",response.query.results);

      var k = response.query.results.tbody.tr.length;

      for (var j = 1; j < k; j++) {
        var res = new Resultado();
        for (var i = 0; i <= 7; i++) {
          if (typeof response.query.results.tbody.tr[j].td[i] === "undefined") {
            continue;
          }
          
          var cell = response.query.results.tbody.tr[j].td[i];

          if (cell == null) {
            continue;
          }

          //console.log(cell.content);

          var valor = cell.content

            switch(i)
            {
              case 0:
                res.id = valor;
              break;

              case 1:
                res.DataSorteio = valor;
              break;

              case 2:
                res.Dezena1 = valor;
              break;

              case 3:
                res.Dezena2 = valor;
              break;

              case 4:
                res.Dezena3 = valor;
              break;

              case 5:
                res.Dezena4 = valor;
              break;

              case 6:
                res.Dezena5 = valor;
              break;

              case 7:
                res.Dezena6 = valor;
              break;

              default:
                console.log("Parse Default", valor);
              break;
            }
            
        }
        console.log(res);
        ResultadoParse.push(res);
      }
    });

    console.log(ResultadoParse);

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
  .use(express.static(__dirname + '/EXTRACTED'))
  .listen(process.env.PORT || 5000);