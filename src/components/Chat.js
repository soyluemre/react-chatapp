import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase-config";
import "../styles/Chat.css";
// import { toast } from "react-hot-toast";
import bildirim from "../assets/bildirim.mp3";

const isSameDay = (date1, date2) => {
  if (!date1 || !date2) {
    return false;
  }

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const Chat = (props) => {
  const { room, setShowModal } = props;
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const messageBoxRef = useRef(null);
  const chatAppRef = useRef(null);
  const messagesRef = collection(db, "messages");

  const [unreadCount, setUnreadCount] = useState(false);
  useEffect(() => {
    setShowModal(false);
  }, []);

  //! Scroll olayını dinlemek için bir fonksiyon
  const handleScroll = () => {
    const chatAppElement = chatAppRef.current;
    if (
      chatAppElement.scrollTop - 150 <
      chatAppElement.scrollHeight - 150 - chatAppElement.clientHeight - 150
    ) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
      //! Scroll yapıldığında unreadCount'i sıfırla
      setUnreadCount(false);
    }
  };

  //! handleScroll useEffect
  useEffect(() => {
    const chatAppElement = chatAppRef.current;
    chatAppElement.addEventListener("scroll", handleScroll);

    return () => {
      chatAppElement.removeEventListener("scroll", handleScroll);
    };
  }, [showScrollButton]);

  //! Yukarı Scroll olduğunda yeni mesaj gelirse uyarı sesi çal
  function playNotificationSound() {
    // Ses dosyasının URL'i
    var soundUrl = bildirim;

    // Yeni bir Audio nesnesi oluşturun
    var audio = new Audio(soundUrl);

    // Ses çal
    audio.play();
  }

  //! yeni mesaj geldiğinde scroll butonu gizli ise oto scroll yap
  useEffect(() => {
    if (showScrollButton) {
      //! eğer scroll butonu görünür ise ve yeni mesaj geldiyse,
      //! scroll butonuna animasyon efekti veren state'i true yap.
      setUnreadCount(true);
    } else {
      //! scroll butonu görünmüyorsa
      //! (yani sayfanın en altındaysak)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (unreadCount && messages) {
      playNotificationSound();
    }
  }, [unreadCount]);

  //! scroll butonuna basınca sayfanın en altına scroll yapmayı sağlayan olay
  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    var animate = document.getElementById("animate-count");
    animate.classList.toggle("paused");
  };

  useEffect(() => {
    const queryMessages = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );
    const unsuscribe = onSnapshot(queryMessages, (snapshot) => {
      const formattedMessages = formatMessages(snapshot);
      setMessages(formattedMessages);
    });

    return () => unsuscribe();
  }, []);

  // useEffect(() => {
  //   const unsubscribeAuth = auth.onAuthStateChanged((user) => {
  //     if (user) {
  //       toast.success(`${user.displayName} Giriş Yaptı`);
  //     }
  //   });

  //   return () => {
  //     unsubscribeAuth();
  //   };
  // }, [room]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    //! Girilen değeri trim() yaparak başındaki ve sonundaki boşlukları temizle
    const trimmedMessage = newMessage.trim();

    //! Eğer girilen değer boşluktan ibaret değilse, true döndürelim ve işleme devam edelim
    if (trimmedMessage) {
      setNewMessage(trimmedMessage);
    } else {
      //! Eğer girilen değer boşluktan ibaretse, false döndürelim ve state'i sıfırlayalım
      setNewMessage("");
      return false;
    }

    const message = {
      text: newMessage,
      createdAt: serverTimestamp(),
      user: auth.currentUser.displayName,
      photoURL: auth.currentUser.photoURL,
      email: auth.currentUser.email,
      messageTime: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      room,
    };

    await addDoc(messagesRef, message);

    setNewMessage("");
  };

  const windowReload = () => {
    window.location.reload();
  };

  const handleMessageDate = (timestamp) => {
    const messageDate =
      timestamp && timestamp.toDate ? timestamp.toDate() : null;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate && messageDate.toDateString() === today.toDateString()) {
      return "Bugün";
    } else if (
      messageDate &&
      messageDate.toDateString() === yesterday.toDateString()
    ) {
      return "Dün";
    } else {
      return messageDate ? messageDate.toLocaleDateString("tr-TR") : null;
    }
  };

  const formatMessages = (snapshot) => {
    let formattedMessages = [];
    let prevMessageDate = null;

    snapshot.forEach((doc) => {
      const messageData = doc.data();
      const messageDate = messageData.createdAt?.toDate();

      const formattedMessage = {
        ...messageData,
        id: doc.id,
        date: messageDate ? handleMessageDate(messageDate) : null,
        //! Varsayılan olarak tarihi göstermeme durumu
        showDate: false,
      };
      if (messageDate && !isSameDay(messageDate, prevMessageDate)) {
        //! Sadece o gün atılan ilk mesajın üstünde tarihi göster
        formattedMessage.showDate = true;
        prevMessageDate = messageDate;
      }

      formattedMessages.push(formattedMessage);
    });

    return formattedMessages;
  };

  return (
    <div className="chat-flex">
      <div className="mobile-header">
        <div className="mobile-back">
          <i onClick={windowReload} className="fas fa-solid fa-circle-left" />
        </div>
        <h3
          style={{
            color: "bisque",
          }}
        >
          {room.toUpperCase()}
        </h3>
      </div>
      <div className="chat-app">
        <div className="header">
          <div className="back">
            <i onClick={windowReload} className="fas fa-solid fa-circle-left" />
          </div>
          <h3
            style={{
              color: "bisque",
            }}
          >
            {room.toUpperCase()}
          </h3>
        </div>
        <div ref={chatAppRef} className={`messages messages-left`}>
          {messages?.map((message, index) => {
            const messageDate = handleMessageDate(message.createdAt);
            let isFirstMessage = false;

            if (index === 0) {
              isFirstMessage = true;
            } else {
              const prevMessageDate = handleMessageDate(
                messages[index - 1].createdAt
              );
              isFirstMessage = messageDate !== prevMessageDate;
            }
            return (
              <div key={message?.id}>
                <div
                  className={
                    isFirstMessage
                      ? "date animate__animated animate__fadeIn"
                      : "dnone"
                  }
                  key={messageDate}
                >
                  <div className="message-date">{messageDate}</div>
                </div>
                <div className="user-flex animate__animated animate__fadeIn">
                  <div className="user">
                    {message?.photoURL === null ? (
                      <i
                        style={{
                          border: "1px solid bisque",
                          borderRadius: "10px",
                          padding: ".4rem",
                          color: "bisque",
                        }}
                        className="fas fa-solid fa-user"
                      ></i>
                    ) : (
                      <img
                        src={message?.photoURL}
                        className="user-img"
                        alt=" "
                      />
                    )}
                  </div>
                  <div className="chat-box">
                    <div
                      ref={messageBoxRef}
                      className="user-div"
                      key={message?.id}
                    >
                      <div className="user-name">
                        <span>{message?.user}</span>
                      </div>
                      <div className="message-text">
                        <span className="msg">{message?.text}</span>

                        <span className="message-time">
                          {message?.messageTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {showScrollButton && (
            <div
              className={
                unreadCount
                  ? "count-animate scroll-button animate__animated animate__bounceIn"
                  : "scroll-button animate__animated animate__bounceIn"
              }
              onClick={handleScrollToBottom}
              id="animate-count"
            >
              <i className="fas fa-solid fa-arrow-down" />
            </div>
          )}
          <div ref={messagesEndRef} className="message-scroll"></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="new-message-form">
        <textarea
          className="new-message-input"
          placeholder="Mesaj..."
          onChange={(e) => setNewMessage(e.target.value)}
          value={newMessage}
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <div
          className="character-count"
          style={
            newMessage.length < 500
              ? {
                  color: "bisque",
                }
              : {
                  color: "red",
                }
          }
        >
          {newMessage.length} / 500
        </div>
        <button type="submit">
          <i
            style={{ color: "bisque" }}
            className="fas fa-light fa-paper-plane"
          ></i>
        </button>
      </form>
    </div>
  );
};
