import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary=async(filePath)=>{
    try{
        if(!filePath) throw new Error("File path is required");
        //uploading file to cloudinary
        const result = await cloudinary.uploader.upload(filePath,{
            resource_type:"auto",
        }) //auto-detect the file type(image,video etc)
        console.log("Cloudinary upload result:",result.url);
        return result;
    }catch(err){
        fs.unlinkSync(filePath);//delete the file from local storage if error occurs
        return null;
    }
}
export { uploadToCloudinary};