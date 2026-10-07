import db from "../models/index.js";
import { ai } from "../config/index.js";

const { Task } = db;

// 🔄 Retry helper function for Gemini API calls
async function callGeminiWithRetry(promt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: promt,
            });
            return response;
        } catch (error) {
            console.log(`Attempt ${attempt} failed:`, error.message);

            // Quota khatam ho gaya - retry mat karo
            if (error.status === 429) {
                console.log("Quota exceeded - not retrying");
                throw error;
            }

            // Sirf temporary busy (503) pe retry karo
            if (error.status === 503 && attempt < maxRetries) {
                const waitTime = attempt * 2000;
                console.log(`Retrying in ${waitTime / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }

            throw error;
        }
    }
}

export const fetchAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find();
        return res.status(200).json({
            tasks,
            message: "Task fetched Successfully",
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
        });
    }
};

export const createTask = async (req, res) => {
    try {
        const { voiceText } = req.body || {};

        if (!voiceText) {
            return res.status(400).json({ error: "voiceText is required" });
        }

        const promt = `parse the following voice command into a task operation. and return only valid JSON: ${voiceText}
        JSON Format: {
            "operation": "create" | "read" | "delete" | "update", 
            "title": "Task Title",
            "description": "Task description (optional)"
        }

        Examples:

        1. "Create a task to buy groceries"
        {
            "operation": "create",
            "title": "Buy Groceries",
            "description": ""
        }

        2. "Create a task to finish the project report by tomorrow"
        {
            "operation": "create",
            "title": "Finish the project report",
            "description": "By tomorrow"
        }

        3. "Show me all my tasks"
        {
            "operation": "read",
            "title": "",
            "description": ""
        }

        4. "Delete buy a milk task"
        {
            "operation": "delete",
            "title": "Buy a milk",
            "description": ""
        }

        5. "Update buy milk task description to urgent"
        {
            "operation": "update",
            "title": "Buy milk",
            "description": "urgent"
        }

        Parse this voice command: ${voiceText} 
        Return ONLY valid JSON without any markdown formatting or code blocks.`;

        const response = await callGeminiWithRetry(promt);

        let responseText = response?.text || "";
        responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();

        console.log("Gemini Response:", responseText);

        const output = JSON.parse(responseText);
        const { operation, title, description = "" } = output || {};

        // ✅ CREATE
        if (operation === "create") {
            if (!title) {
                return res.status(400).json({ error: "Title is required" });
            }

            const task = await Task.create({ title, description });

            return res.status(200).json({
                task,
                message: "Task created Successfully",
            });
        }

        // ✅ READ
        else if (operation === "read") {
            const tasks = await Task.find();
            return res.status(200).json({
                tasks,
                message: "Tasks Fetched successfully",
            });
        }

        // ✅ DELETE
        else if (operation === "delete") {
            if (!title) {
                return res
                    .status(400)
                    .json({ error: "Title is required to delete" });
            }

            const deletedTask = await Task.findOneAndDelete({
                title: { $regex: title, $options: "i" },
            });

            if (!deletedTask) {
                return res.status(404).json({
                    error: `Task "${title}" not found`,
                });
            }

            return res.status(200).json({
                task: deletedTask,
                message: "Task deleted Successfully",
            });
        }

        // ✅ UPDATE
        else if (operation === "update") {
            if (!title) {
                return res
                    .status(400)
                    .json({ error: "Title is required to update" });
            }

            const updatedTask = await Task.findOneAndUpdate(
                { title: { $regex: title, $options: "i" } },
                { description },
                { new: true }
            );

            if (!updatedTask) {
                return res.status(404).json({
                    error: `Task "${title}" not found`,
                });
            }

            return res.status(200).json({
                task: updatedTask,
                message: "Task updated Successfully",
            });
        }

        return res.status(400).json({
            error: "Unknown operation",
            output,
        });

    } catch (error) {
        console.error("Create Task Error:", error.message);

        if (error.status === 503) {
            return res.status(503).json({
                error:
                    "AI service is temporarily busy. Please try again in a few moments.",
            });
        }

        // Quota khatam - naya error handling
        if (error.status === 429) {
            return res.status(429).json({
                error: "Daily API limit reached. Please try again tomorrow.",
            });
        }

        return res.status(500).json({ error: error.message });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description = "" } = req.body;

        if (!title && !description) {
            return res.status(400).json({
                error: "Title or description is required for update operation",
            });
        }

        const payload = {};
        if (title) payload.title = title;
        if (description) payload.description = description;

        const task = await Task.findByIdAndUpdate(id, payload, { new: true });

        if (!task) {
            return res.status(400).json({
                error: "Task not found with the given Id",
            });
        }

        return res.status(200).json({
            task,
            message: "Task updated Successfully",
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findByIdAndDelete(id);

        if (!task) {
            return res.status(400).json({
                error: "Task not found with the given Id",
            });
        }

        return res.status(200).json({
            task,
            message: "Task Deleted Successfully",
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
