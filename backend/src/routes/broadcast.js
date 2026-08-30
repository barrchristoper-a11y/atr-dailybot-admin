const express=require('express'),router=express.Router();router.get('/',(req,res)=>res.json({status:'ok',route:'broadcast'}));module.exports=router;
const Broadcast = require('../models/Broadcast');

router.get('/history', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});