import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel from "../models/user_model";
import { ErrorHandler } from "../utils/ErrorHandler";
import jwt, { Secret } from "jsonwebtoken";
import path from "path";
import ejs from "ejs"
import sendMail from "../utils/sendMail";

// registering a new user
interface ERegistrationBody {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        const isEmailExist = await userModel.findOne(email)
        if (isEmailExist) {
            return next(new ErrorHandler("Email Already Exists", 400))
        };

        const user: ERegistrationBody = {
            firstname, lastname, email, password
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
                success:true,
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