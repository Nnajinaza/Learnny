import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import CourseModel from "../models/course_model";

// create course
export const createCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;  // Assuming that the data is in the request body
        const course = await CourseModel.create(data);

        res.status(201).json({
            success: true,
            course,
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
        });
    }
});
