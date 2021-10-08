import dotenv from 'dotenv';
try{
    const dotenvResult = dotenv.config();
    if(dotenvResult.error){
        console.log(dotenvResult.error)
    }
}
catch(e){
    if(process.env.NODE_ENV !== "production") {
        console.error(e);
    }
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import routes from "./routes.js";

import { cleanUp } from './janitor.js';

const app = express();

app.use(express.json({limit: "80kb", extended: true}));
app.use(express.urlencoded({limit: "80kb", extended: true}));
app.use(cors());
app.use('/', routes);

cleanUp();

const CONNECTION_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 5000;

mongoose.connect(CONNECTION_URL, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((error) => console.log(error.message));

mongoose.set('useFindAndModify', false);