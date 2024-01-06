import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { ErrorHandler } from "../utils/ErrorHandler";
import cloudinary from "cloudinary"
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course_model";
import { redis } from "../utils/redis";


// Upload an already created course
export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
        createCourse(data, res, next)
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// EDIT A COURSE
export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            await cloudinary.v2.uploader.destroy(thumbnail.public_id)
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }

        const courseId = req.params.id;
        const course = await CourseModel.findByIdAndUpdate(
            courseId, { $set: data }, { new: true }
        )
        res.status(201).json({
            success: true,
            course
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// Get a single course
export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params._id;
        console.log(courseId)

        const isCacheExist = await redis.get(courseId);


        if (isCacheExist) {
            console.log("getting from redis")
            const course = JSON.parse(isCacheExist);
            console.log(course);

            res.status(200).json({
                success: true,
                course,
            });
        }
        else {
            const course = await CourseModel.findById(courseId).select("-courseData.videoUrl -courseData.links -courseData.suggestion -courseData.questions")
            console.log("getting from mongo")
            console.log("Course to be stored in Redis:", course);
            await redis.set(courseId, JSON.stringify(course))

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: "Course not found",
                });
            }


            res.status(200).json({
                success: true,
                course
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// GET ALL CORUSES
export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isCacheExist = await redis.get("allCourses")
        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                courses,
            })
        } else {
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.links -courseData.suggestion -courseData.questions")

            res.status(200).json({
                success: true,
                courses
            })
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get users course list
export const getCourseOfUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses //All the courses to view
        const courseId = req.params.id // The id will be passed through the parameter
        console.log(courseId);
        console.log(userCourseList)
        
        
        const courseExists = userCourseList?.find((course: any) => course._id.toString() === courseId) //All the courses that the user is eligible to view
        console.log(courseExists);
        
        if(!courseExists) {
            return next(new ErrorHandler("You are not eligible to view this course", 404))
        }

        const course = await CourseModel.findById(courseId)
        const content = course?.courseData

        res.status(201).json({
            success: true,
            content
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))  
    }
})