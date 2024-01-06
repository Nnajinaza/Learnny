import mongoose, { Document, Model, Schema } from "mongoose";

export interface EComment extends Document {
    user: string;
    comment: string;
    commentReplies: string;
    likes: number
}
export interface EReview extends Document {
    user: string;
    rating: number;
    comment: string;
    commentReplies: EComment
}

interface ELink extends Document {
    title: string;
    url: string;
}

interface ECourseData extends Document {
    title: string;
    description: string;
    videoUrl: string;
    videoThumbnail: object;
    videoSection: string;
    videoLength: number;
    videoPlayer: string;
    links: ELink[];
    suggestion: string;
    questions: EComment
}

interface ECourse extends Document {
    name: string;
    description: string;
    price: number;
    estimatedPrice?: number;
    thumbnail: object;
    tags: string;
    level: string;
    demoUrl: string;
    benefits: { title: string }[];
    prerequisites: { title: string };
    reviews: EReview[];
    courseData: ECourseData;
    ratings?: number;
    purchased?: number;
}

const reviewSchema = new Schema<EReview>({
    user: Object,
    rating: {
        type: Number,
        default: 0,
    },
    comment: String,
})

const linkSchema = new Schema<ELink>({
    title: String,
    url: String
})

const commentSchema = new Schema<EComment>({
    user: Object,
    comment: String,
    commentReplies: [Object],
})


const courseDataSchema = new Schema<ECourseData>({
    title: String,
    description: String,
    videoUrl: String,
    videoSection: String,
    videoLength: Number,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [commentSchema]
})


// const userSchema: Schema<EUser> = new mongoose.Schema({
//     firstname:{
//         type:String,
//         required: [true, "Please enter your first name"]
//     },

const courseSchema: Schema<ECourse> = new mongoose.Schema({
    name: { type:String, required: [true, "Please enter your  name"] },
    description: { type: String, required: [true, "Please enter the course description"] },
    price: { type: Number, required: [true, "Please enter the course price"] },
    estimatedPrice: { type: Number },
    thumbnail: {
        public_id: {
             type: String
        },
        url: {
             type: String
        }
    },
    tags: { type:String, required: [true, "Please enter course tags"] },
    level: { type:String, required: [true, "Please enter course level"] },
    demoUrl: { type:String, required: [true, "Please enter course demoUrl"] },
    benefits: [{ title:String }],
    prerequisites: [{ title: String }],
    reviews: [reviewSchema],
    courseData: [courseDataSchema],
    ratings: {
        type: Number,
        default: 0,
    },
    purchased: {
        type: Number,
        default: 0,
    },

})

const CourseModel: Model<ECourse> = mongoose.model("Course", courseSchema);

export default CourseModel;