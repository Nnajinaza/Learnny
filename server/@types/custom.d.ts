import { EUser } from "../models/user_model";
import { Request } from "express";

declare global {
    namespace Express{
        interface Request{
            user?: EUser
        }
    }
}