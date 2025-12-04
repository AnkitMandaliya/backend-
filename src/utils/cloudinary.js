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
        console.log("Uploading to cloudinary:", filePath);
        //uploading file to cloudinary
        const result = await cloudinary.uploader.upload(filePath,{
            resource_type:"auto",
        }) //auto-detect the file type(image,video etc)
        console.log("Cloudinary upload result:",result.url);
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);//delete the file from local storage after upload
        return result;
    }catch(err){
        console.error("CLOUDINARY ERROR:", err.message);   // <-- IMPORTANT
        console.error(err); 
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);//delete the file from local storage if error occurs
        return null;
    }
}
export { uploadToCloudinary};