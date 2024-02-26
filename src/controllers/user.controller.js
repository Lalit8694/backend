import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    //    res.status(200).json({
    //         message:"ok"
    //     })

    //get user details from frontend
    //validation - not empty
    //check if user already exit: username, email
    //check for image, check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return result

    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

    //checking whether the given field is empty or not
    if (
        [fullName, email, username, password].some((fieldIs) =>
            fieldIs?.trim() === "")
    ) {
        throw new ApiError(400, "All field are required");
    }

    //checking user is already exit or not by username or email
    const existedUser = User.findOne({ // User is taken from the model
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email and password is already exit");
    }

    //Here multer give the power of file in req.file insted of req.body to handle file 
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required");
    }

    //Now the image is upoading to cloudinary
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage= await uploadOnCloudinary(coverImageLocalPath);

   if(!avatar){
    throw new ApiError(400, "avatar is required..");

   }

   // now sendeing the data to the database
   const user = await User.create(
    {
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    }
   )

   // after created user what thing wee have to not return like password
   const createdUser= await User.findById(user._id).select(
    // syntax which is not required while returning
    "-password -refreshToken"
   )

   if(!createdUser){
    throw new ApiError(500,"Something went wrong while regestering the user")
   }

   return res.status(201).json(
    new ApiResponse(200, createdUser, "User has been created succesfully")
   )

})

export { registerUser }