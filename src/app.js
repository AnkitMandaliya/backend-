import express from 'express';
import cookieparser from 'cookie-parser';
import cors from 'cors';
export const app = express();

app.use(cors(
    {
        origin:process.env.CORS_ORIGIN,
        credentials:true,
        methods:["GET","POST","PUT","DELETE"],
        allowedHeaders:["Content-Type","Authorization"]
    }
))

app.use(express.json({limit:'10kb'}));
app.use(express.urlencoded({extended:true,limit:'10kb'}));
app.use(express.static('public'));
app.use(cookieparser());


