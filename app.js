const express = require('express');
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const mongoose = require('mongoose');
const graphQlSchema = require("./graphql/schema/index");
const graphQlResolvers = require("./graphql/resolvers/index");
const isAuth = require("./middleware/is-auth");
var cors = require('cors');


const app = express();
app.use(bodyParser.json());
app.use(isAuth);
app.use(cors());

app.use ((req, res, next)=> {
    res.setHeader('Access-Control-Allow-Origion', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Origion', 'Content-Type, Authorization');
    if(req.method === 'OPTIONS'){
        return res.sendStatus(200);
    }
    next();

});

app.use('/graphql', 
    graphqlHTTP({
    schema: graphQlSchema,
    rootValue: graphQlResolvers,
    graphiql: true
       
}));

app.get('/', (req, res, next) => {
    res.send("Hello world server!");
});

const conStr = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.p6rxg.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;
mongoose.connect(conStr) 
.then(()=>{
    app.listen(8000);
})
.catch(err => {
    console.log(err)
});

