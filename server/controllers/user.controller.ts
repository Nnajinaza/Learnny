import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel, { EUser } from "../models/user_model";
import { ErrorHandler } from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import path from "path";
import ejs from "ejs"
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";
require('dotenv').config()
import cloudinary from "cloudinary"

// registering a new user
interface ERegistrationBody {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    avatar?: string;
    role:  string;
}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { firstname, lastname, email, password, role } = req.body;

        const isEmailExist = await userModel.findOne({ email })
        if (isEmailExist) {
            return next(new ErrorHandler("Email Already Exists", 400))
        };

        const user: ERegistrationBody = {
            firstname, lastname, email, password, role
        };

        const activatonToken = createActivationToken(user)
        const activationCode = activatonToken.activationCode;

        const data = { user: { firstname: user.firstname }, activationCode };
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data)

        try {
            await sendMail({
                email: user.email,
                subject: "Activate our account",
                template: "activation-mail.ejs",
                data,
            });
            res.status(201).json({
                success: true,
                message: `Please check your email: ${user.email} to activate your account!`,
                activatonToken: activatonToken.token,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
});

interface EActivationToken {
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: any): EActivationToken => {
    const activationCode = Math.floor(1000 * Math.random() * 9000).toString();

    const token = jwt.sign({ user, activationCode },
        process.env.ACTIVATION_SECRET as Secret,
        { expiresIn: "5m", });
    return { token, activationCode }
}

interface IActivationRequest {
    activation_token: string;
    activation_code: string
}

// activate user
export const activatedUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;

        const newUser: { user: EUser; activationCode: string } = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string
        ) as { user: EUser; activationCode: string };

        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400))
        }

        const { firstname, lastname, email, password, role } = newUser.user;
        const existUser = await userModel.findOne({ email });

        if (existUser) {
            return next(new ErrorHandler("User with this email already exist", 400));
        }
        const user = await userModel.create({
            firstname, lastname, email, password, role
        })
        res.status(201).json({
            success: true,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface ELoginRequest {
    email: string;
    password: string;
}

// login user
export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ELoginRequest;

        if (!email || !password) {
            return next(new ErrorHandler("Please input email and password", 400));
        }

        const user = await userModel.findOne({ email }).select("password firstname lastname email courses");
        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400));
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Incorrect Password", 400))
        }

        sendToken(user, 200, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
})

// logout user
export const logoutUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.cookie("access_token", "", { maxAge: 1 })
            res.cookie("refresh_token", "", { maxAge: 1 })
            const userId = req.user?._id || '';
            redis.del(userId)
            res.status(200).json({
                success: true,
                message: "Logged out successful"
            })
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }
    }
)

// update access token
export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload
        const message = 'Could not refresh token'
        if (!decoded) {
            return next(new ErrorHandler(message, 400))
        }

        const session = await redis.get(decoded.id as string)
        if (!session) {
            return next(new ErrorHandler(message, 400))
        }
        const user = JSON.parse(session)

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, { expiresIn: "5m" })
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, { expiresIn: "3d" })

        req.user = user
        res.cookie("access_token", accessToken, accessTokenOptions)
        res.cookie("refresh_token", refreshToken, refreshTokenOptions)

        res.status(200).json({
            status: "success",
            accessToken,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// get user info
export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        getUserById(userId, res)
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface ESocialAuthBody {
    email: string;
    firstname: string;
    lastname: string;
    avatar: string;
}

// social auth
export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, firstname, lastname, avatar } = req.body;
        const user = await userModel.findOne({ email })
        if (!user) {
            const newUser = await userModel.create({ email, firstname, lastname, avatar })
            sendToken(newUser, 200, res)
        } else {
            sendToken(user, 200, res)
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// update user info
interface EUpdateUserInfo {
    firstname?: string;
    lastname?: string;
    email: string;
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, firstname, lastname } = req.body as EUpdateUserInfo;
        const userId = req.user?._id
        const user = await userModel.findById(userId)

        if (email && user) {
            const isEmailExist = await userModel.findOne({ email })
            if (isEmailExist) {
                return next(new ErrorHandler("Email already exist", 400))
            }
            user.email = email
        }
        if (firstname && user) {
            user.firstname = firstname
        }
        await user?.save()
        await redis.set(userId, JSON.stringify(user))

        res.status(201).json({
            status: "success",
            user,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface EUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
}

export const updateUserPassword = CatchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try {
        const {oldPassword, newPassword} = req.body as EUpdateUserPassword;
        // const userId = req.user?._id
        
        if(!oldPassword || !newPassword) {
            return next(new ErrorHandler("Please enter old and new Password", 400))
        }

        const user = await userModel.findById(req.user?._id).select("+password");
        
        if (user?.password === undefined) { 
            return next(new ErrorHandler("Invalid User", 400))
        }
        const isPasswordMatch = await user?.comparePassword(oldPassword)
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Incorrect old Password", 400))
        }
        user.password = newPassword
        await user.save()

        await redis.set(req.user?._id, JSON.stringify(user))

        res.status(201).json({
            status: "success",
            user,
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


interface EUpdateUserAvatar {
    avatar: string;
}

export const updateUserAvatar = CatchAsyncError(async(req: Request, res: Response, next: NextFunction) => {
    try {
        const {avatar} = req.body
        const userId = req.user?._id
        const user = await userModel.findById(userId)

        if (avatar && user) {
            if(user?.avatar?.public_id) {
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id)

                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150
                })
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            } else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150
                })
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            }

            await user?.save()

            await redis.set(userId, JSON.stringify(user))
    
            res.status(200).json({
                status: "success",
                user,
            })
    
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})
