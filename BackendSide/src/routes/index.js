import express  from "express";
import {
    fetchAllTasks,
    createTask,
    deleteTask,
    updateTask,
} from "../controllers/index.js";



const router = express.Router();

//get all tasks

router.get("/",fetchAllTasks);
router.post("/create", createTask);
router.put("/update/:id", updateTask);
router.delete("/delete/:id", deleteTask); 

export default router;