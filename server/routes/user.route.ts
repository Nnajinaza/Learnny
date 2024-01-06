import express from "express";
import { activatedUser, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updateUserAvatar, updateUserInfo, updateUserPassword } from "../controllers/user.controller";
import { authorizeRoles, isActivated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post('/register', registrationUser)
userRouter.post('/activate', activatedUser)
userRouter.post('/login', loginUser)
userRouter.post('/logout', isActivated, authorizeRoles("admin"), logoutUser)
userRouter.get('/refresh', updateAccessToken)
userRouter.get('/me', isActivated, getUserInfo)
userRouter.post('/socialauth', socialAuth)
userRouter.put('/update-user-info', isActivated, updateUserInfo )
userRouter.put('/update-user-password', isActivated, updateUserPassword )
userRouter.put('/update-user-avatar', isActivated, updateUserAvatar )
export default userRouter;
