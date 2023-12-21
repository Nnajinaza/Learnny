import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EUser extends Document{
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    avatar: {
        public_id: string;
        url: string;
    },
    role: string;
    isVerified: boolean;
    courses: Array<{courseId: string}>;
    comparePassword: (password: string) => Promise<boolean>;
}

const userSchema: Schema<EUser> = new mongoose.Schema({
    firstname:{
        type:String,
        required: [true, "Please enter your first name"]
    },
    lastname:{
        type:String,
        required: [true, "Please enter your last name"]
    },
    email:{
        type:String,
        required: [true, "Please enter your email"],
        validate: {
            validator: function (value: string){
                return emailRegexPattern.test(value)
            },
            message: "Please enter a valid email address"
        },
        unique: true,
    },
    password:{
        type:String,
        required: [true, "Please enter your password"],
        minlength: [6, "Password must be at least 6 characters"],
        select: false,
    },
    avatar:{
        public_id: String,
        url: String
    },
    role:{
        type: String,
        default: "user"
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    courses: [
        {
            courseId: String,
        }
    ],
}, {timestamps:true})

// Password will be hashed before saving
userSchema.pre<EUser>('save', async function(next) {
    if(!this.isModified('password')) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

// Compare passwords 
userSchema.methods.comparePassword = async function(enteredPassword:string): Promise<boolean>{
    return await bcrypt.compare(enteredPassword, this.password)
}

const userModel: Model<EUser> = mongoose.model("User", userSchema);
export default userModel