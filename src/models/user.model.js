import mongoose ,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true//for faster search
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    password:{
        type:String,
        required:[true,"Password is required"],
    },
    avatar:{
        type:String,//cloudnary url
        default:"",
        required:true,
    },
    coverimage:{
        type:String,//cloudnary url
        default:"",
        required:true,
    },
    watchhistory:{
        type:[
            {
                type:Schema.Types.ObjectId
                ,ref:"Video"
            }
        ],
        default:[]
    },
    refretoken:{
        type:String,
    }
},timestamps=true)

userSchema.pre("save",async function(next){
    if(this.isModified("password")){
    this.password=await bcrypt.hash(this.password,10);
    }
    next();
})

userSchema.methods.isPasswordCorrect = async function(pass){
    return await bcrypt.compare(pass, this.password); //return true or false
};
export const User =mongoose.model("User",userSchema);

