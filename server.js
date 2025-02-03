import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import cors from 'cors';

const app = express();
const port = 4000;
const DB = "mongodb://localhost:27017/chatData"

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function dbConnection() {
    const dbConnect = DB
    if (!dbConnect) {
        console.log("missing string")
    }

    try {
        const db = await mongoose.connect(dbConnect)

        if (!db) {
            console.log("db not connect")
        } else {
            console.log("db connected")
        }
    } catch (error) {
        throw new Error(error)
    }
}
dbConnection()

// create model
const userModel = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["ideator", "consultant"],
        required: true
    }
}, { timestamps: true })


const User = mongoose.model("userData", userModel)

// chat schema
const chatSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'userData',
            required: true
        }
    ],// Array to store Ideator and Consultant IDs
    messages: [
        {
            sender: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'userData',
                required: true
            },
            text: {
                type: String,
                required: true
            },
            timeStamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
})

const Chat = mongoose.model("Chat", chatSchema)


// create post api
app.post("/create-user", async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
    } else {
        try {
            const salt = await bcrypt.genSalt(12);
            const hassPass = await bcrypt.hash(password, salt);

            const createUser = new User({ name, email, password: hassPass, role })
            const saveUser = await createUser.save();

            res.status(201).json({ message: "User created successfully", data: saveUser });

        } catch (error) {
            console.error("Error creating user:", error.message);
            res.status(500).json({ message: "Something went wrong", error: error.message });
        }
    }
})

//Login api
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isCorrectPassword = await bcrypt.compare(password, user.password)

        if (!isCorrectPassword) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        res.status(200).json({ message: "Login successfull", user })
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message })
    }
})


// find user api
app.get("/user", async (req, res) => {
    try {
        const getUser = await User.find()
        if (getUser) {
            return res.status(200).json({ message: "user found", user: getUser })
        } else {
            return res.status(400).json({ message: "user not found" })
        }
    } catch (error) {
        return res.status(500).json({ message: "something went wrong", error: error.message })
    }
})


//Create new chat api
app.post("/create-chat", async (req, res) => {
    const { participants } = req.body;

    if (!participants || participants.length !== 2) {
        return res.status(400).json({ message: "Both participants are required." });
    }

    try {
        // Ensure participants are ObjectIds (string)
        const participantIds = participants
            .filter(id => id && mongoose.Types.ObjectId.isValid(id)) // Remove null or invalid IDs
            .map(id => new mongoose.Types.ObjectId(id));

        // Check if a chat already exists between these participants
        const existingChat = await Chat.find({
            participants: { $all: participantIds }
        })
        // console.log("Query Result:", existingChat.map(chat => ({
        //     _id: chat._id,
        //     participants: chat.participants.map(p => p.toString()),
        //     messagesCount: chat.messages.length
        // })));

        if (existingChat.length > 0) {
            return res.status(200).json({ message: "Chat already exists.", chat: existingChat[0] });
        }

        if (existingChat) {
            return res.status(200).json({ message: "Chat already exists.", chat: existingChat });
        }

        // Create new chat
        const newChat = new Chat({ participants: participantIds })
        const savedChat = await newChat.save()

        res.status(201).json({ message: "Chat created successfully.", chat: savedChat });
    } catch (error) {
        console.error("Error creating chat:", error.message);
        res.status(500).json({ message: "Something went wrong.", error: error.message });
    }
})


// Get chat(s) for a user
app.get("/get-chat/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // Find all chats where the user is a participant
        const chats = await Chat.find({ participants: userId }).populate("participants messages.sender");

        if (!chats || chats.length === 0) {
            return res.status(404).json({ message: "No chats found for this user." });
        }

        res.status(200).json({ message: "Chats retrieved successfully.", chats });
    } catch (error) {
        console.error("Error retrieving chats:", error.message);
        res.status(500).json({ message: "Something went wrong.", error: error.message });
    }
});


// Send a message
app.post("/send-message", async (req, res) => {
    const { chatId, sender, text } = req.body; // chatId: Chat ID, sender: User ID, text: Message text

    if (!chatId || !sender || !text) {
        return res.status(400).json({ message: "Chat ID, sender, and text are required." });
    }

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        // Add the message to the chat
        chat.messages.push({ sender, text });
        chat.updatedAt = Date.now();

        const updatedChat = await chat.save();

        res.status(200).json({ message: "Message sent successfully.", chat: updatedChat });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ message: "Something went wrong.", error: error.message });
    }
});

// Retrieve all messages for a chat
app.get("/chat/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        const chat = await Chat.findById(chatId).populate("participants messages.sender");

        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        res.status(200).json({ message: "Chat retrieved successfully.", chat });
    } catch (error) {
        console.error("Error retrieving chat:", error.message);
        res.status(500).json({ message: "Something went wrong.", error: error.message });
    }
});



app.listen(port, () => {
    console.log(`server listning on http://localhost:${port})`)
})