# 📌 Create Chat API - README

## 📝 Overview
The **Create Chat API** allows users to establish a chatroom between an **Ideator** and a **Consultant**.  
⚠️ **Only an Ideator and a Consultant can create a chatroom**—chats between two Ideators or two Consultants are not allowed.

---

## 🚀 API Endpoint
### **Create Chat (POST)**
- **URL:** `http://localhost:4000/create-chat`
- **Method:** `POST`
- **Content-Type:** `application/json`

---

## 📌 Usage in Postman
### **1️⃣ Assign a Chatroom to an Ideator and Consultant**
To create a chatroom, send a `POST` request with **both user IDs** in the `participants` array.

### **2️⃣ Request Body Format**
#### **📌 JSON Payload**
```json
{
    "participants": [
        "67a0f6b52a4008d465e61de9",
        "67a0f7372a4008d465e61df1"
    ]
}

---

// You will get response Like

{
    "message": "Chat created successfully.",
    "chat": {
        "_id": "67a1e2345f12ab7890c12345",
        "participants": [
            "67a0f6b52a4008d465e61de9",
            "67a0f7372a4008d465e61df1"
        ],
        "messages": [],
        "createdAt": "2025-02-03T17:00:00.123Z",
        "updatedAt": "2025-02-03T17:00:00.123Z"
    }
}

// And Start Chatting
