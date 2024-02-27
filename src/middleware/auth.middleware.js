import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js"


export const verifyJWT=asyncHandler( async (req,res, next)=>{
   try {
     // accessing token from the exsting user
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","");
    //
     if(!token){
         throw new ApiError(401, "Unauthorized request")
     }
 
     //verify token using jwt
     const decodedToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
     
     //checking user with the accesstoken
     const user= await User.findById(decodedToken?._id).select("-password -refreshToken")
 
     if(!user){
         throw new ApiError(401, "Invalid access token")
     }
      //giving a new accessibity to the method of req
      req.user=user;
      next();
      
   } catch (error) {
     throw  new ApiError(401, error?.message || "Invalid access token")
   }
})