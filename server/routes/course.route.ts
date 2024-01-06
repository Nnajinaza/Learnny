import express from "express"
import { isActivated, authorizeRoles } from "../middleware/auth"
import { createCourse } from "../services/course.service"
import { editCourse, getAllCourses, getCourseOfUser, getSingleCourse, uploadCourse } from "../controllers/course.controller"

const courseRouter = express.Router()

courseRouter.post("/create-course", isActivated, authorizeRoles("admin"), createCourse, uploadCourse)
courseRouter.put("/edit-course/:id", isActivated, authorizeRoles("admin"), editCourse, uploadCourse)
courseRouter.get("/get-course/:_id", getSingleCourse)
courseRouter.get("/get-courses", getAllCourses)
courseRouter.get("/get-courses-content/:id", isActivated, getCourseOfUser)

export default courseRouter