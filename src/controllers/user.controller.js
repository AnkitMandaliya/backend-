import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User }  from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
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

