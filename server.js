import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path';
import multer from 'multer';
import { v4 as v4uuid } from 'uuid';
const app=express();

// cors
app.use(cors({
    origin:"https://localhost:5600"
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended:true}))

const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"uploads/");
    },
    filename:function(req,file,cb){
        const uniqueFilename=`${Date.now()}-${v4uuid()}${path.extname(file.originalname)}`
        cb(null,uniqueFilename);
    }
})

const upload=multer({storage});

app.get('/',(req,res,next)=>{
    res.send("Welcome");
})

app.post('/upload',upload.single("myfile"),(req,res,next)=>{
    if(!req.file){
        return res.status(400).send("file not uploaded");
    }
    return res.status(201).send({
        message:"file created",
        file:req.file
    })
})
app.listen(3000,()=>{
    console.log("App is listening");
})