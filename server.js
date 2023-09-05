//Make sure to change the metadata.set("authorization", "Key YOUR_API_KEY"); to your own api key

//express
const express = require('express')
const app = express()
app.use(express.json())
//cors
const cors = require('cors')
app.use(cors())
//bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10;
//knex
const knex = require('knex')
const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : 'test',
      database : 'smart-brain'
    }
});

app.post('/imageurl', (req, res) => {
    const {ClarifaiStub, grpc} = require("clarifai-nodejs-grpc");

    const stub = ClarifaiStub.grpc();
    
    const metadata = new grpc.Metadata();
    metadata.set("authorization", "Key YOUR_API_KEY");

    stub.PostModelOutputs(
        {
            // This is the model ID of a publicly available General model. You may use any other public or custom model ID.
            model_id: "face-detection",
            inputs: [{data: {image: {url: req.body.input}}}]
        },
        metadata,
        (err, response) => {
            if (err) {
                console.log("Error: " + err);
                return;
            }
    
            if (response.status.code !== 10000) {
                console.log("Received failed status: " + response.status.description + "\n" + response.status.details);
                return;
            }
    
            console.log("Predicted concepts, with confidence values:")
            for (const c of response.outputs[0].data.concepts) {
                console.log(c.name + ": " + c.value);
            }
        res.json(response)
        }
    );
})

app.get('/', (req, res) => {
    res.json(database)
})

app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    db.select('*').from('users').where({
        id: id
    }).then(user => {
        if(user.length) {
            res.json(user[0])
        } else {
            res.status(400).json("No found user")
        }
    }).catch(err => res.json.status(400).json("error"))
})

app.post('/signin', (req, res) => {
    if(!req.body.email || !req.body.password) {
        return res.status(400).json("invalid information")
    }
    db.select('email', 'hash').where('email', '=', req.body.email).from('signin').then(user => {
        bcrypt.compare(req.body.password, user[0].hash, function(err, hash) {
            if(hash) {
                db.select('*').from('users').where('email', '=', req.body.email).then(user => res.json(user[0]))
            }
        });
    }).catch(err => res.json("invalid username or password"))
})

app.post('/signup', (req, res) => {
    const {name, email, password} = req.body;
    if(!email || !name || !password) {
        return res.status(400).json("invalid information")
    }
    bcrypt.hash(password, saltRounds, function(err, hash) {
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            }).into('signin').returning('email').then(loginEmail => {
                trx('users').returning('*').insert({
                    email: loginEmail[0].email,
                    name: name,
                    joined: new Date()
                }).then(user => res.json(user[0]))
            }).then(trx.commit).catch(trx.rollback)
        }).catch(err => res.json("error"))
    });
})

app.put('/image', (req, res) => {
    const {id} = req.body;
    db('users').where('id', '=', id).increment('entries', 1).returning('entries').then(entries => res.json(entries[0].entries))
})

app.listen(3000, () => {
    console.log("Port 3000 is active")
})