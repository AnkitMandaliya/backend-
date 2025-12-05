import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User }  from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

export const registerUser = asyncHandler(async (req, res) => {
    //get data from frontend 
    const {username,email,fullname,password } = req.body;
    //validation -empty fields
    if ([username,email,fullname,password].some(
        (fields) =>
            fields?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    //check if user already exists- username or email
    const existerUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existerUser) {
        throw new ApiError(409, "User already exists with this username or email");
    }
    //check image ,check avatar
     const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let coverImageLocalPath ;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

     if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    //upload image to cloudinary
    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImg = await uploadToCloudinary(coverImageLocalPath);
    console.log(coverImageLocalPath);
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);

    if (!avatar) {
        throw new ApiError(500, "Error uploading avatar image");
    }
   
    //create user object in db 
    const newUser = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverimage: coverImg?.url || "",
    })
    //remove password and refresh token from response
    const createdUser = await User.findById(newUser._id).select("-password -refretoken");
    //check for user creation 
    if (!createdUser) {
        throw new ApiError(500, "Error creating user");
    }
    //return res to frontend

    res.status(201).json(new ApiResponse(
        true,
        201,
        "User registered successfully",
        createdUser
    ));
})

export  const loginUser =asyncHandler(async(req,res)=>{
    // get data from frontend
    const{username,email,password}=req.body;
    if (!username && !email){
        throw new ApiError(400,"Username or email are required");
    }
    //validation - empty fields
    if([username,password].some(
        (fields)=>fields?.trim()===""
    )){
        throw new ApiError(400,"All fields are required");
    }
    //check if user exists
    const existingUser=await User.findOne({
        $or:[{username:username?.toLowerCase()},{email}]
    });
    if(!existingUser){
        throw new ApiError(404,"User not found with this username");
    }
    //check password
    const isPasswordMatch=await existingUser.isPasswordCorrect(password);
    if(!isPasswordMatch){
        throw new ApiError(401,"Invalid password");
    }   
    //generate tokens and store refresh token in db
    const { accessToken, refreshToken }= await generateAccessTokenAndRefreshToken(existingUser._id);
    //remove password and refresh token from response
    const loggedInUser=await User.findById(existingUser._id).select("-password -refretoken");
    //return res to frontend through cookie 
    const option={
        httpOnly:true,
        secure:true,
    }
    return res
           .status(200)
           .cookie("refreshToken",refreshToken,option)
           .cookie("accessToken",accessToken,option)
           .json(new ApiResponse(
            true,
            200,
            "User logged in successfully",
            {user:loggedInUser,accessToken,refreshToken}
           ));
})

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refretoken = refreshToken;
        await user.save({validationBeforeSave:false});
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error generating tokens");
    }
}

export const logoutUser = asyncHandler(async (req, res) => {
     await User.findByIdAndUpdate(req.user._id, 
        { 
            $set :{
                refretoken: null
            }
         }
         ,{
            new:true
        });

     const option ={
        httpOnly: true,
        secure: true,
     }
    return res.
         status(200).
         clearCookie("refreshToken", option).
         clearCookie("accessToken", option).
         json(new ApiResponse(
            200,    
            {},
            "User logged out successfully",
         ));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    if (!incommingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }
    try {
        const decodedToken=jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?.userId)
    
        if (!user){
            throw new ApiError(404, "Invalid refresh token, user not found");
        }
        if (incommingRefreshToken !== user.refreshtoken){
            throw new ApiError(401, "Invalid refresh token");
        }
    
        const options={
            httpOnly:true,
            secure:true,
        }
        const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)
    
        return res.
                 status(200).
                 cookie("accessToken",accessToken,options).
                 cookie("refreshToken",refreshToken,options).
                 json(new ApiResponse(
                    200,
                    {accessToken,refreshToken},
                    "Access token refreshed successfully"
                 ))
    } catch (error) {
        throw new ApiError(401, error?.message ||"Invalid or expired refresh token");        
    }

})