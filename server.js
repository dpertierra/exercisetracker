const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bodyParser = require('body-parser');
require('dotenv').config()
const mongouri = process.env.MONGO_URI;

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
      users.push(user);
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
        '_id': user._id,
        'description': data.description,
        'duration': data.duration,
        'date': data.date
      });
    })
  });
});

app.get('/api/users/:_id/logs/', (req, res) => {
  let userid = req.params._id
  let {from, to, limit } = req.query;
  console.log(from, to);
  let logs = [];
  User.findById(userid, (err, user) => {
    if (err) return console.log(err);
    else if (!user) return res.json({'error': 'User does not exist'});
    let query = {username: user.username};
    if (from && to)
      query.date = {$gte: new Date(from), $lte: new Date(to)};
    else if (from)
      query.date = {$gte: new Date(from)};
    else if (to)
      query.date = {$lte: new Date(to)};
    console.log(query);
    Exercise.find(query)
        .select(['description', 'duration', 'date'])
        .limit(+limit)
        .then(function (docs, err) {
          if (err) return console.log(err);
          for (let doc of docs) {
            let log = {
              description: doc.description,
              duration: doc.duration,
              date: doc.date.toDateString()
            };
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
