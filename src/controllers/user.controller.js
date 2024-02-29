import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

//creating method for refresh and access token for calling again and agian
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //saving refresh token to database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and acess token");
    }

}

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
    const existedUser = await User.findOne({ // User is taken from the model
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email and password is already exit");
    }

    //Here multer give the power of file in req.file insted of req.body to handle file 
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required");
    }

    //Now the image is upoading to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "avatar is required..");

    }

    // now sendeing the data to the database
    const user = await User.create(
        {
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        }
    )


    // after created user what thing wee have to not return like password
    const createdUser = await User.findById(user._id).select(
        // syntax which is not required while returning
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while regestering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User has been created succesfully")
    )


})

const loginUser = asyncHandler(async (req, res) => {
    //check if the user is present in databasee or not
    //using email and password
    // fetch information like email, name , username, photo etc

    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // find the already exited user using username or email
    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(400, "user doesnot exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "invalid password");
    }

    //generating refresh and access token in the user id
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //now sending refresh and access token using cookies for security
    //send using object
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "user logged in successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // taking cookies and match again into database to login without login // this is helpful for frontend
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        //  decoded token from the browser
        const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        // token from database
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        //user?.refreshToken taken from the model user
        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        // now sending the generate token again
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id); // finding the user
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword) // cheking the old password is correct or not

    if (!isPasswordCorrect) {
        throw new ApiError(400, "old password not valid")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(200, ApiResponse(200, {}, "Password changed successfully"))

})

const updateAccountDetails = asyncHandler(async (req, res) => {
 const {fullName, email} = req.body

 if(!fullName || !email){
    throw new ApiError(400, "All fields are required")
 }
 const user = User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            fullName,
            email:email
        }
    },
    {new:true} // this will return the value updated one
    ).select("-password")

    return  res
    .status(200)
    .json(200, user, "Account details updated successfully")
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
 const avatarLocalPath= req.file?.path
 if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is missing")
 }

 const avatar =await  uploadOnCloudinary(avatarLocalPath) //uploading on cloudinary
 if(!avatar.url){
    throw new ApiError(400, "Eror while uploading avatar on cloudinary")

 }
 const user =await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            avatar:avatar.url
        }
    },
    {
      new:true
    }
 ).select("-password")

 return res
    .status(200)
    .json(
        200,
        user,
        "avatar updated successfully"
    )
   

})

const updateCoverImage= asyncHandler(async(req, res)=>{
    const coverImageLocalPath= req.file?.path
    if(!coverImageLocalPath){
       throw new ApiError(400, "coverImage is missing")
    }
   
    const coverImage =await  uploadOnCloudinary(coverImageLocalPath) //uploading on cloudinary
    if(!coverImage.url){
       throw new ApiError(400, "Eror while uploading coverImage on cloudinary")
   
    }
    const user=await User.findByIdAndUpdate(
       req.user?._id,
       {
           $set:{
               coverImage:coverImage.url
           }
       },
       {
         new:true
       }
    ).select("-password")

    return res
    .status(200)
    .json(
        200,
        user,
        "CoverIMage updated successfully"
    )
   
   })

export { updateCoverImage,updateUserAvatar,registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, updateAccountDetails,updateUserAvatar }