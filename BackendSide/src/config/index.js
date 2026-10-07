
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();




console.log("API Key Loaded:", process.env.GEMINI_API_KEY ? "YES ✅" : "NO ❌");





 export const handleDatabaseConnection = async()=>{
    try{
         await mongoose.connect(process.env.MONGO_URI);

         console.log("databse connected successfully!!");
  

    }
    catch(error){
        console.log("Error connecting to the database",error);
    


    }

};

export const ai = new GoogleGenAI({
apiKey: process.env.GEMINI_API_KEY});





