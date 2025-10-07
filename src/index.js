import mongoose from "mongoose";
import DB_NAME from "./constans.js";
import { connectDB } from "./db/db.js";
import express from "express";

// require("dotenv").config( {path:"./.env"});//to use env variables

/*
const app=express();
(async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI+"/"+DB_NAME)
        console.log("Database connected")
        app.on("error",()=>{
            console.log("error",error)
            throw new Error("Failed to connect with server")
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    }catch(error){
        console.error(error)
        console.log("Database connection failed")
    }
})()*/

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });//to use env variables
const PORT = process.env.PORT || 8000;
const app = express();
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await connectDB();
});
