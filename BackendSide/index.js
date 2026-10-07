

import 'dotenv/config';  // ⭐ Number 1 priority - sabse pehle load hoga


import express from 'express';
import cors from "cors";
import { Task } from "./src/models/task.js";
import { handleDatabaseConnection } from "./src/config/index.js";
import routes from "./src/routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/tasks", routes);

handleDatabaseConnection();

app.listen(5000, () => {
    console.log("server runing on port No 5000");
});
