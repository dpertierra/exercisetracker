const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bodyParser = require('body-parser');
const {forEach} = require("mongoose/lib/statemachine");
const {log} = require("nodemon/lib/utils");
require('dotenv').config()
const mongouri = process.env['MONGO_URI'];

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true })
    .catch((err) =>{ console.log(err) });

const UserSchema = new Schema({
  username: {type: String, unique:true }
});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

const LogSchema = new Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});
const Log = mongoose.model("Log", LogSchema);


app.post('/api/users', (req, res) =>{
  let username = req.body.username;
  let user = new User({username: username});
  user.save((err, user) =>{
    if (err) return res.json({'error': 'Username already taken'});
    res.json({'username': user.username, '_id': user._id});
  });
});

app.get('/api/users', (req, res) =>{
  User.find({}, (err, docs) =>{
    if (err) return console.log(err);
    let users = [];
    for (let doc of docs) {
      let user = {_id: doc._id, username: doc.username}
      users.append(user);
    }
    res.json({'users': users});
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let date = req.body.date ? new Date(req.body.date): new Date();
  let userid = req.params._id
  User.findById(userid,function (err, user){
    if (err) return console.log(err);
    else if (!user) return res.json({'error': 'User does not exist'});
    let exercise = new Exercise({
      username: user.username,
      description: req.body.description,
      duration: +req.body.duration,
      date: date
    });

    exercise.save((err, data) =>{
      if (err) return console.log(err);
      res.json({
        'username': user.username,
        'description': data.description,
        'duration': data.duration,
        'date': data.date,
        '_id': user._id
      });
    })
  });
});

app.get('/api/users/:_id/logs/', (req, res) => {
  let userid = req.params._id
  let {from, to, limit } = req.query;
  let logs = [];
  User.findById(userid, (err, user) => {
    if (err) return console.log(err);
    else if (!user) return res.json({'error': 'User does not exist'});
    Exercise.find({username: user.username, date: { $gte: new Date(from), $lte: new Date(to) }})
            .select(['description', 'duration', 'date'])
            .limit(+limit)
            .then(function (docs, err) {
              if (err) return console.log(err);
              for (let doc of docs) {
                console.log(doc);
                let log = { description: doc.description,
                            duration: doc.duration,
                            date: doc.date.toDateString()};
                logs.push(log);
              }
              res.json({'username': user.username,
                              'count': logs.length,
                              '_id': user._id,
                              'log': logs});
            });
  });

});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
