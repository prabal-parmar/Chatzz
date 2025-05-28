import React, { useContext, useEffect, useState } from "react";
import "./ChatBox.css";
import assets from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { toast } from "react-toastify";
import upload from "../../lib/upload";

function ChatBox() {
  const {
    userData,
    messagesId,
    chatUser,
    messages,
    setMessages,
    chatVisible,
    setChatVisible,
    isAI,
  } = useContext(AppContext);
  const [input, setInput] = useState("");

  const handelSubmitByEnter = (e) => {
    if(e.key == 'Enter'){
      sendMessage();
    }
  }
  const sendMessage = async () => {
    try {
      if (isAI && input) {
        let combinedMessages = "";

        for (let i = 1; i < Math.min(20, messages.length); i+=2) {
          combinedMessages = messages[i].text + ". " + combinedMessages;
        }
        
        const res = await fetch("http://localhost:8000/api/chatappai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: input, name: userData.name, prevMessages: combinedMessages }),
        });
        const data = await res.json();
        const messageFromAI = data.response.content;

        if (input && messagesId) {
          await updateDoc(doc(db, "messages", messagesId), {
            messages: arrayUnion({
              sId: userData.id,
              text: input,
              createdAt: new Date(),
            }),
          });

          const userIDs = [chatUser.rId, userData.id];

          userIDs.forEach(async (id) => {
            const userChatsRef = doc(db, "chats", id);
            const userChatsSnapshot = await getDoc(userChatsRef);

            if (userChatsSnapshot.exists()) {
              const userChatData = userChatsSnapshot.data();
              const chatIndex = userChatData.chatsData.findIndex(
                (c) => c.messageId === messagesId
              );
              userChatData.chatsData[chatIndex].lastMessage = input.slice(
                0,
                30
              );
              userChatData.chatsData[chatIndex].updatedAt = Date.now();
              userChatData.chatsData[chatIndex].messageSeen = true;
              await updateDoc(userChatsRef, {
                chatsData: userChatData.chatsData,
              });
            }
          });
        }

        // Saving message sent by AI in database
        await updateDoc(doc(db, "messages", messagesId), {
          messages: arrayUnion({
            sId: chatUser.rId,
            text: messageFromAI,
            createdAt: new Date(),
          }),
        });

        const userIDs = [chatUser.rId, userData.id];

          userIDs.forEach(async (id) => {
            const userChatsRef = doc(db, "chats", id);
            const userChatsSnapshot = await getDoc(userChatsRef);

            if (userChatsSnapshot.exists()) {
              const userChatData = userChatsSnapshot.data();
              const chatIndex = userChatData.chatsData.findIndex(
                (c) => c.messageId === messagesId
              );
              userChatData.chatsData[chatIndex].lastMessage = messageFromAI.slice(
                0,
                30
              );
              userChatData.chatsData[chatIndex].updatedAt = Date.now();
              userChatData.chatsData[chatIndex].messageSeen = true;
              await updateDoc(userChatsRef, {
                chatsData: userChatData.chatsData,
              });
            }
          });


      } else if (input && messagesId) {
        await updateDoc(doc(db, "messages", messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            text: input,
            createdAt: new Date(),
          }),
        });
        const userIDs = [chatUser.rId, userData.id];

        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, "chats", id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data();
            const chatIndex = userChatData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            );
            userChatData.chatsData[chatIndex].lastMessage = input.slice(0, 30);
            userChatData.chatsData[chatIndex].updatedAt = Date.now();
            if (userChatData.chatsData[chatIndex].rId === userData.id) {
              userChatData.chatsData[chatIndex].messageSeen = false;
            }
            await updateDoc(userChatsRef, {
              chatsData: userChatData.chatsData,
            });
          }
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
    setInput("");
  };

  const sendImage = async (e) => {
    try {
      const fileUrl = await upload(e.target.files[0]);

      if (fileUrl && messagesId) {
        await updateDoc(doc(db, "messages", messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            image: fileUrl,
            createdAt: new Date(),
          }),
        });

        const userIDs = [chatUser.rId, userData.id];

        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, "chats", id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data();
            const chatIndex = userChatData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            );
            userChatData.chatsData[chatIndex].lastMessage = "Image";
            userChatData.chatsData[chatIndex].updatedAt = Date.now();
            if (userChatData.chatsData[chatIndex].rId === userData.id) {
              userChatData.chatsData[chatIndex].messageSeen = true;
            }
            await updateDoc(userChatsRef, {
              chatsData: userChatData.chatsData,
            });
          }
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const convertTime = (timestamp) => {
    const date = timestamp.toDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    if (hour > 12) {
      return hour - 12 + ":" + minute + " PM";
    } else {
      return hour + ":" + minute + " AM";
    }
  };

  useEffect(() => {
    if (messagesId) {
      const unSub = onSnapshot(doc(db, "messages", messagesId), (res) => {
        setMessages(res.data().messages.reverse());
      });
      return () => {
        unSub();
      };
    }
  }, [messagesId]);

  return chatUser ? (
      <div className={`chat-box ${chatVisible ? "" : "hidden"}`}>
        <div className="chat-user">
          <img src={chatUser.userData.avatar} alt="" />
          <p>
            {chatUser.userData.name}{" "}
            {Date.now() - chatUser.userData.lastseen <= 70000 ? (
              <img className="dot" src={assets.green_dot} alt="" />
            ) : null}
          </p>
          <img
            onClick={() => setChatVisible(false)}
            src={assets.arrow_icon}
            className="arrow"
            alt=""
          />
        </div>

        <div className="chat-msg">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.sId === userData.id ? "s-msg" : "r-msg"}
            >
              {msg["image"] ? (
                <img className="msg-img" src={msg.image} alt="" />
              ) : (
                <p className="msg">{msg.text}</p>
              )}
              <div>
                <img
                  src={
                    msg.sId === userData.id
                      ? userData.avatar
                      : chatUser.userData.avatar
                  }
                  alt=""
                />
                <p>{convertTime(msg.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            type="text"
            placeholder="Send a message"
            onKeyDown={handelSubmitByEnter}
          />
          {
          !isAI
          ?
         <><input
            onChange={sendImage}
            type="file"
            id="image"
            accept="image/png, image/jpeg"
            hidden
          />
          <label htmlFor="image">
            <img src={assets.gallery_icon} alt="" />
          </label>
          </>
          : null
          }
          <img onClick={sendMessage} src={assets.send_button} alt="" />
        </div>
      </div>
  ) : (
    <div className={`chat-welcome ${chatVisible ? "" : "hidden"}`}>
      <p className="welcome">Let's Chat!</p>
      <p className="harishchandra">(You can talk with HarishChandra anytime)</p>
    </div>
  );
}

export default ChatBox;
