import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app= express();


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true    
}))
app.use(express.json({limit:"16kb"})); //middle-ware for jason data
app.use(express.urlencoded({extended: true ,limit:"16kb"})); //middleware use for url data
app.use(express.static("public")); // middleware use for file, pdf, image etc for access in public "which is folder in our case"
app.use(cookieParser()) // use for talking to cookies from server 


//routes import
import userRouter from "./routers/user.routes.js"


//routes declaration
//http://localhost:3000 /api/v1/users/register
app.use("/api/v1/users",userRouter);


export default app