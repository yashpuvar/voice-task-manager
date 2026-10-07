

import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema({
    title: String,
    description: String,
});

const Task = mongoose.model("voice_Manager", taskSchema);

export { Task };