import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router=express.Router();

router.post('/register',async(req,res)=>{
    try{
        const {username,email,password}=req.body;
        const existingUser= await User.findOne({$or: [{email},{username}]});

        if(existingUser) return res.status(400).json({message:'user already exists'})

        //hash the password
        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);

        const newUser=new User({
            username,
            email,
            password:hashedPassword
        });
        await newUser.save();

        res.status(201).json({message:'user registered successfully'});
    }catch(error){
        console.error('registration error',error);
        res.status(500).json({message:'internal server error'})
    }
});


//login route
router.post('/login',async(req,res)=>{
     try{
        const {email,password}=req.body;

        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({message: "user not found"});
        }

        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({error:"invalid password"});
        }

        const token=jwt.sign(
            {id: user._id,username: user.username},
            process.env.JWT_SECRET,
            {expiresIn:'24h'}
        );

        res.status(200).json({
            message:"login successful",
            token,
            user:{ username:user.username,email:user.email}
        });
     }
     catch(error){
        console.error('login error',error);
        res.status(500).json({error:'internal server error during login'});
     }
});

export default router;