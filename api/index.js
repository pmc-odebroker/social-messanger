const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const app = express();
const port = 8000;
const cors = require('cors');

app.use(cors());
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(passport.initialize());
const jwt = require('jsonwebtoken');

mongoose.connect(
    "mongodb+srv://patrickcharlestz:971997Abcdef.@cluster0.plooqwi.mongodb.net/social-messanger",
    {
        useNewUrlParser: true,
        useUnifiedTopology:true,
    }
).then(() => {
    console.log('connected to Mongo DB');
}).catch((err) => {
    console.log('Error while connecting to Mongo DB',err);
});
app.listen(port, () => {
    console.log('Server running on port 8000');
});

const User = require("./models/user");
const Message = require("./models/message");

//endpoint for registration of User
app.post('/register',(req,res)=>{
    const {name,email,password,image} = req.body;
    const newUser = new User({ name,email,password,image });
    newUser.save().then(()=>{
        res.status(200).json({'message':'User Registered Successfully'});
    }).catch((err)=>{
        console.log('Error Registered User',err);
        res.status(500).json({'message':'Error Registering User'})
    })
})

// function to create a Token based on user
const createToken = (userId) => {
    //set the token payload
    const payload = {
        userId: userId,
    };
        //generate a token key with secret key and expiration time
        const token = jwt.sign(payload, "Q$r2K6W*n!jCW%Zk", { expiresIn: "1h"});
        return token;
    }

    app.post("/login", (req, res) => {
        const { email, password } = req.body;
    
        // check if the email and password are provided
        if (!email || !password) {
            return res.status(400).json({ message: "Email and the password are required" });
        }
    
        // find the user based on the provided email
        User.findOne({ email })
            .then(user => {
                // check if user exists
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }
    
                // compare the provided password with the password in the database
                if (user.password !== password) {
                    return res.status(401).json({ message: "Invalid Password" });
                }
    
                // create and send a token
                const token = createToken(user._id);
                res.status(200).json({ token });
            })
            .catch(error => {
                console.log("Error in finding the user", error);
                res.status(500).json({ message: "Internal Server Error!" });
            });
    });

    //endpoint to access all the users except the user who is currently logged in
    app.get("/users/:userId", (req,res) => {
        const loggedInUserId = req.params.userId;
        User.find({_id:{$ne: loggedInUserId}}).then((users) => {
        }).catch((err) => {
            console.log("Error retrieving users", err);
            res.status(500).json({message:"Error retrieving users"})
        })
    });

    //endpoint to send the request to user
    app.post("/friend-request", async (req, res) => {
        const { currentUserId, selectedUserId } = req.body;
        try {
            //update the recipient friend request []
            await User.findByIdAndUpdate(selectedUserId, {
                $push:{friendRequests : currentUserId },
            });
            //update the sender sent friend request []
            await User.findByIdAndUpdate(currentUserId, {
                $push: {sentFriendRequests, selectedUserId },
            });
            res.sendStatus(200);
        } catch(error){
            res.sendStatus(500);
        }
    });

    //endpoint to show end point request of user
    app.get("/friend-request/:userId", async (req, res) => {
        try{
            const userId = req.params;
            //fetch user document based on userId
            const user = await User.findById(userId).populate("friendsRequests", "name", "email", "image").lean();
            const friendRequests = user.friendRequests;
        }catch(error){
            console.log(error);
            res.status(500).json({messsage: "Internal Server Error"})
        }
    })
 
    //end point to accept a friend request of a person
    app.post("/friend-request/accept", async(req, res) => {

        try {

            const {senderId, recipientId} = req.body;

            //retrieve the documents of sender and the recipient
            const sender = await User.findById(senderId);
            const recipient = await User.findById(recipientId);
    
            sender.friends.push(recipientId);
            recipient.push(senderId);
    
            recipient.friendRequests = recipient.friendRequests.filter(
                (request) => request.toString() !== senderId.toString()
            );
    
            sender.sentFriendRequests = sender.sentFriendRequests.filter((request) => request.toString() !== recipient.toString());
    
            await sender.save();
            await recipient.save();
    
            res.status(200).json({message: "Friend Request accepted Successfully"});

        }catch(error){
            console.log(error);
            res.status(500).json({ message: "Internal Server Error"});
        }
    });

    //endpoint to access all the friends of the logged in user
    app.get("/accepted-friends/:userId",async(req,res) => {

        try {
            const {userId} = req.params;
            const user = await User.findbyId(userId).populate(
                "friends",
                "name email image"
            )
            const acceptedFriends = user.friends;
            res.json(acceptedFriends)

        }catch(error){
            console.log(error);
            res.status(500).json({message:"Internal server error"})
        }
    });

    const multer = require('multer');

    //configure multer for handling file uploads
    const storage = multer.diskStorage({
        destination: function (req, file, cb){
            //specify the desired destination folder
            cb(null, 'files/');
        },
        filename: function (req, file, cb){
            //generate unique for the upload file
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        },
    }); 

    const upload = multer({ Storage: storage});

    //endpoint to post Messages and store it in backend
    app.post("/messages", upload.single("imageFile"), async (req, res) => {
        try{
            const { senderId, recipientId, messageType, messageText } = req.body;
            const newMessage = new Message({
                senderId,
                recipientId,
                messageType,
                message: messageText,
                timestamp: new Date(),
                imageUrl: messageType === "image" ? req.file.path : null,
            });
             
            await newMessage.save();

            res.status(200).json({ message: "Message sent successfully" });
        } catch (error){
            console.log(error);
            res.status(500).json({ error: "Internal Server Error"});
        }
    })
    //endpoint to get the user details to design the chat header
    app.get('/user/userId', async(req, res) => {
        try{
            const {userId} = rq.params;

            //fetch user data from user id
            const recipientId = await User.fimdById(userId);
            res.json(recipientId)
        }catch(error){
            console.log(error);
            res.status(500).json({ error: "Internal Server Error"});
        }
    })

    //endpoint to fetch the messages between two user in chart-room
    app.get("/messages/:senderId/:recipientId", async(req, res) => {
        try{
            const {senderId, recipientId} = req.psrsms;

            const messages = await Message.find({
                $or: [
                    { senderIdk: senderId, recipientId: recipientId },
                    { senderId: senderId, recipientId: recipientId },
                ],
            }).populate("senderId","_id name");

        }catch(error){
            console.log(error);
            res.status(500).json({ error: "Internal Serever Error"});
        }
    });

    //endpoint to  delete the messages
    app.post("/deleteMessages/", async(req, res) => {
        try{
            const {messages} = req.body;
            if(!Array.isArray(messages) || messages.length === 0){
                return res.status(400).json({message: "invalid request body!"});
            }

            await Message.deleteMany({_id:{$in:messages}});
            res.json({message: "message deleted successfully"});

        } catch(error){
            res.status.json("Internal Server Error");
        }
    });