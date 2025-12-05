import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User }  from '../models/user.model.js';
import { uploadToCloudinary ,deletefromCloudinary } from '../utils/cloudinary.js';
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

export const changepassword =asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword,consfirmPassword}=req.body;
    if([oldPassword,newPassword,consfirmPassword].some(
        (fields)=>fields?.trim()===""
    )){
        throw new ApiError(400,"All fields are required");
    }
    if(newPassword!==consfirmPassword){
        throw new ApiError(400,"New password and confirm password do not match");
    }
    const user = await User.findById(req.user._id)
    const isPasswordCorrect= isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401,"Old password is incorrect");
    }
    user.password=newPassword;
    await user.save({validationBeforeSave:true});
    return res.
              status(200).
              json(new ApiResponse(
                200,
                {},
                "Password changed successfully"
              ))
})


export const curretuserProfile=asyncHandler(async(req,res)=>{
    return res.
           status(200).
              json(new ApiResponse(
                200,
                req.user,
                "Current user profile fetched successfully"
              ))
})

export const updateAccoutnt=asyncHandler(async(req,res)=>{
    const {fullname,email,username}=req.body;
    if(!fullname && !email && !username){
        throw new ApiError(400,"Atleast one field is required to update");
    }
    const updatedUserDetails = await User.findByIdAndUpdate(req.user._id,{
        $set:{
            fullname:fullname || req.user.fullname,
            email:email || req.user.email,
            username:username || req.user.username,
            }
    },{new:true}).select("-password -refretoken");
    return res.
              status(200).
              json(new ApiResponse(
                200,
                updatedUserDetails,
                "User account updated successfully"
              ))

})


export const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    const avatar = await uploadToCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Error uploading avatar image");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._1d,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-password -refretoken");

    await deleteOldAvatarOrCoverImage(req.user.avatar); 
    return res.
                status(200).
                json(new ApiResponse(
                    true,
                    200,
                    "User avatar updated successfully",
                    updatedUser
                ));
})

export const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is required");
    }
    const coverImage = await uploadToCloudinary(coverImageLocalPath);
    if (!coverImage) {
        throw new ApiError(500, "Error uploading coverImage ");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._1d,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select("-password -refretoken");
    await deleteOldAvatarOrCoverImage(req.user.coverimage);
    return res.
                status(200).
                json(new ApiResponse(
                    true,
                    200,
                    "User avatar updated successfully",
                    updatedUser
                ));
})

const deleteOldAvatarOrCoverImage=(async(url)=>{
    let oldPublicId=null
    if(!url) return;//https://res.cloudinary.com/demo/image/upload/v173590/users/abc123.png
    const parts=url.split("/");//['https:', '', 'res.cloudinary.com', 'demo','image', 'upload', 'v173590','users', 'abc123.png']
    const filename=parts[parts.length-1];//'abc123.png'
    oldPublicId=filename.split(".")[0];//remove file extension ('abc123')
    await deletefromCloudinary(oldPublicId);
})

export const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {usenrame} =req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is required");
    }
    const channel =await User.aggregate([
        {
            $match:{username:username?.toLowerCase()}
        },
        {
            $lookup:{
                from:"subscription",
                localfield: "_id",
                foreignfield:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscription",
                localfiled:"_id",
                foreignfield:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{$size:"$subscribers"},
                channelssubscribedToCount:{$size:"$subscribedTo"},
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user._id,"$subscribers.subscriber"]}
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                fullname:1,
                email:1,
                avatar:1,
                coverimage:1,
                subscribersCount:1,
                channelssubscribedToCount:1,
                isSubscribed:1,
            }
        }
    ])

    if(!channel || channel.length===0){
        throw new ApiError(404,"Channel not found with this username");
    }
    return res.
              status(200).
              json(new ApiResponse(
                200,
                channel[0],
                "channel profile fetched successfully"
              ))
})