import jwt from 'jsonwebtoken';

export const verifyToken= (req,res,next)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader || !authHeader.startWith('Bearer ')){
        return res.status(401).json({message:'no token provided'})
    }
    const token=authHeader.split(' ')[1];
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.userId=decoded.id;
        next();
    }catch(error){
        console.log('token verification error',error);
        return res.status(401).json({message:'failed to verify token'});
    }
}