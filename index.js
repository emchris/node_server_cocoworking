// Import package

var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');

var five =require('johnny-five');
var board=new five.Board();

board.on('ready',function(){
    var led=new five.Led(13);
    led.blink(500);});

/*class Event {

    constructor(eventId, userId, text, date){
        this.eventId = eventId;
        this.userId = userId;
        this.text = text;
        this.date = date;
    }
}*/

//Password ultils
//create fucntion to random salt
var getRandomString = function(lenght){
  return crypto.randomBytes(Math.ceil(lenght/2)).toString('hex').slice(0, lenght); //convert to hexa format
};

var sha512 = function(password, salt){
  var hash = crypto.createHmac('sha512', salt);
  hash.update(password);
  var value = hash.digest('hex');
  return {
    salt: salt,
    passwordHash: value
  };
};

function saltHashPassword(userPassword){
  var salt = getRandomString(16); //Create 16 random character
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

function checkHashPassword(userPassword, salt){
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

//Create Express Service
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Create MongoDB Client
var MongoClient = mongodb.MongoClient;

//Connection URL
var url = 'mongodb://localhost:27017' //27017 is default post

MongoClient.connect(url, {useUnifiedTopology: true}, function(err, client){
  if(err)
    console.log('Unable to connect to the mongoDB server.Error', err);
  else{

    //Register

    app.post('/register', (request, response, next)=> {
        var post_data = request.body;

        var plaint_password = post_data.password;
        var hash_data = saltHashPassword(plaint_password);

        var password = hash_data.passwordHash; // Save password hash
        var salt = hash_data.salt; //Save salt

        var name = post_data.name;
        var email = post_data.email;

        var insertJson = {
          'email': email,
          'password': password,
          'salt': salt,
          'name': name
        };

        var db = client.db('cocoworkingdb');

        //check exists email
        db.collection('user').find({'email' : email}).count(function(err, number) {
            if (number != 0){
                response.json('Email already exists');
                console.log('Email already exists');
            }
            else {
                db.collection('user').insertOne(insertJson,function(error, res){
                    response.json('Registration success');
                    console.log('Registration success');
                })
            }
        })

    });

    app.post('/login', (request, response, next)=> {
          var post_data = request.body;

          var email = post_data.email;
          var userPassword = post_data.password;

          var db = client.db('cocoworkingdb');

          //check exists email
          db.collection('user').find({'email' : email}).count(function(err, number) {
              if (number == 0){
                  var responseJson = {
                      '_id': "",
                      'email' : "",
                      'name': "",
                      'message': 'Email not exists',
                      'flag': 0
                  }
                  response.json(responseJson);
                  console.log('' + responseJson.flag + '');
                  console.log('Email not exists');
              }
              else {
                  db.collection('user').findOne({'email' : email}, function(err, user){
                      var salt = user.salt; //get salt from user
                      var hashed_password = checkHashPassword(userPassword, salt).passwordHash; // Hash paswword with salt
                      var encrypted_password = user.password;
                      if(hashed_password == encrypted_password){
                          var responseJson = {
                              '_id': user._id,
                              'email' : user.email,
                              'name': user.name,
                              'message': 'Login success',
                              'flag': 1
                          }
                          response.json(responseJson);
                          console.log('Login success');
                      }
                      else {
                          var responseJson = {
                              '_id': "",
                              'email' : "",
                              'name': "",
                              'message': 'Wrong password',
                              'flag': 0
                          }
                          response.json(responseJson);
                          console.log('Wrong password');
                      }
                  })
              }
          })

      });

      app.post('/updateEvents', (request, response, next)=> {
          var post_data = request.body;

          var idAccount = post_data.idAccount;
          var eventId = post_data.eventId;
          var userId = post_data.userId;
          var text = post_data.text;
          var date = post_data.date;


          var eventJson = {
              'userId': eventId,
              'eventId': eventId,
              'text': text,
              'date': date
          };

          var db = client.db('cocoworkingdb');
          console.log('' + eventId + '');

            db.collection('events').insertOne(eventJson, function (error, res) {
              //let evento = new Event(eventJson.eventId, eventJson.userId, eventJson.text, eventJson.date);
              //console.log(Event);
              //console.log('' + evento.text + '');
              response.json('Event updated');
              console.log('Event updated');

          });
      })

      app.post('/takeEvents', (request, response, next)=> {
          var post_data = request.body;

          var idAccount = post_data.idAccount;
          var eventId = post_data.eventId;
          var userId = post_data.userId;
          var text = post_data.text;
          var date = post_data.date;


          var eventJson = {
              'userId': eventId,
              'eventId': eventId,
              'text': text,
              'date': date
          };

          var db = client.db('cocoworkingdb');
          console.log('' + eventId + '');

          db.collection('events').find({}).toArray(function (error, res) {
              //let evento = new Event(eventJson.eventId, eventJson.userId, eventJson.text, eventJson.date);
              //console.log(Event);
              //res.forEach(e => console.log(e));
              console.log(res);
              response.json(res);
              //res.forEach(e => response.json(e));
              //console.log('Event updated');

          });
      })

    //Start Web Server
    app.listen(3000, ()=> {
      console.log('Connected to MongoDB Server , WebService running on port 3000');
    })
  }
});
