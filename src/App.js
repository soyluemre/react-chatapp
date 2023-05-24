import { useState, useRef, useEffect } from "react";
import "./App.css";
import { Auth } from "./components/Auth";
import Cookies from "universal-cookie";
import { Chat } from "./components/Chat";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase-config";
import { Toaster, toast } from "react-hot-toast";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
} from "firebase/firestore";
import loadingGif from "../src/assets/loading.gif";

const cookies = new Cookies();

//! Kullanıcının daha önce açtığı odaların listesini almak için işlev

function App() {
  const [isAuth, setIsAuth] = useState(cookies.get("auth-token"));
  const [room, setRoom] = useState(null);
  const roomInputRef = useRef();
  const modalInput = useRef(null);
  const [userPhotoURL, setUserPhotoURL] = useState(
    localStorage.getItem("photoURL")
  );
  const [userDisplayName, setUserDisplayName] = useState(
    localStorage.getItem("displayName")
  );
  const [roomList, setRoomList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Oda Şifresini Girin:");
  const [roomId, setRoomId] = useState("");
  const [disableBackgroundClick, setDisableBackgroundClick] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const modalOverlayRef = useRef(null);

  //! Çıkış Yap Butonuna basınca
  const signUserOut = () => {
    setShowLogoutModal(!showLogoutModal);
    setDisableBackgroundClick(true);
  };

  //! Açılan Modal'da çıkış yapmayı tercih edince
  const handleLogout = async () => {
    toast.success("Çıkış Yapıldı");
    await signOut(auth);
    cookies.remove("auth-token");
    setIsAuth(false);
    setRoom(null);
    localStorage.removeItem("displayName");
    localStorage.removeItem("photoURL");
    setShowLogoutModal(!showLogoutModal);
  };

  const handleGoToChatRoom = async (e) => {
    e.preventDefault();
    const roomName = roomInputRef.current.value;

    if (roomName.trim() === "") {
      toast.error("Oda İsmini Girmediniz");
      return;
    }

    const roomDocRef = doc(db, "rooms", roomName);
    const roomDoc = await getDoc(roomDocRef);

    if (roomDoc.exists()) {
      setModalTitle(
        ` "${roomInputRef?.current.value}" zaten mevcut. Şifresini Girin:`
      );
    } else {
      setModalTitle(`"${roomInputRef?.current.value}" için şifre belirleyin:`);
    }

    setShowModal(!showModal);
    setRoomId(roomName);
    setDisableBackgroundClick(true);
  };

  useEffect(() => {
    if (auth?.currentUser) {
      localStorage.setItem("displayName", auth.currentUser.displayName);
      localStorage.setItem("photoURL", auth.currentUser.photoURL);
      setUserPhotoURL(auth.currentUser.photoURL);
      setUserDisplayName(auth.currentUser.displayName);
    }
  }, [auth?.currentUser]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "rooms")),
      (snapshot) => {
        const rooms = [];
        snapshot.forEach((doc) => {
          const roomData = {
            id: doc.id,
            name: doc.data().roomName,
          };
          rooms.push(roomData);
        });
        setRoomList(rooms);
      }
    );

    //! cleanup function to unsubscribe from the snapshot listener
    return () => unsubscribe();
  }, []);

  const handleRoomClick = (roomId) => {
    setRoomId(roomId);
    setModalTitle("Oda Şifresini Girin:");
    setShowModal(!showModal);
    setDisableBackgroundClick(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const password = modalInput?.current?.value;
    if (!password) {
      toast.error("Şifreyi Girmediniz");
      return;
    }

    const roomDocRef = doc(db, "rooms", roomId);
    const roomDoc = await getDoc(roomDocRef);

    if (roomDoc.exists()) {
      const correctPassword = roomDoc.data().password;

      if (password === correctPassword) {
        setLoading(true);
        setTimeout(() => {
          setRoom(roomId);
          setLoading(false);
        }, 1000);
      } else {
        toast.error("Yanlış Şifre");
        return;
      }
    } else {
      const roomData = {
        roomName: roomId,
        password: password,
      };

      setDoc(roomDocRef, roomData)
        .then(() => {
          setLoading(true);
          setTimeout(() => {
            setRoom(roomId);
            setLoading(false);
          }, 1000);
        })
        .catch((error) => {
          toast.error("Oda oluşturma hatası:", error);
          setShowPassword(false);
        });
    }

    if (loading) {
      setShowModal(!showModal);
    }

    setDisableBackgroundClick(false);
  };

  const handleCloseModal = () => {
    setShowModal(!showModal);
    setShowPassword(false);
    roomInputRef.current.value = "";
  };

  const handleCloseLogoutModal = () => {
    setShowLogoutModal(!showLogoutModal);
    setDisableBackgroundClick(false);
  };

  if (!isAuth) {
    return (
      <div className="App">
        <Toaster position="top-right" />
        <Auth setIsAuth={setIsAuth} />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      {loading && (
        <img src={loadingGif} alt="Loading" className="loading-page" />
      )}

      <div
        className="modal"
        style={{
          top: showModal ? "35%" : "-50%",
          transform: `translate(-50%, ${showModal ? "-50%" : "0%"})`,
        }}
      >
        <div>
          {showModal && (
            <div
              className={`modal-content ${
                showModal
                  ? "animate__animated animate__bounceIn"
                  : "animate__animated animate__backOutUp"
              }`}
            >
              <i
                className="close-button fas fa-solid fa-close"
                onClick={handleCloseModal}
              />

              <h6>{modalTitle}</h6>

              <form onSubmit={handleSend}>
                <div className="input-div">
                  <input
                    ref={modalInput}
                    autoFocus
                    defaultValue=""
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    maxLength={20}
                  />
                  {showPassword ? (
                    <i
                      onClick={() => setShowPassword(!showPassword)}
                      className="show-password fas fa-light fa-eye"
                    />
                  ) : (
                    <i
                      onClick={() => setShowPassword(!showPassword)}
                      className="hide-password fas fa-light fa-eye-slash"
                    />
                  )}
                </div>

                <div className="modal-buttons">
                  <button type="submit">Giriş Yap</button>
                  {/* <button onClick={handleCloseModal}>Kapat</button> */}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <div
        className="logout-modal"
        style={{
          top: showLogoutModal ? "24%" : "-50%",
          transform: `translate(-50%, ${showLogoutModal ? "-50%" : "0%"})`,
        }}
      >
        <div>
          {showLogoutModal && (
            <div
              className={`logout-modal-content ${
                showLogoutModal
                  ? "animate__animated animate__bounceIn"
                  : "animate__animated animate__backOutUp"
              }`}
            >
              <div>
                <h6>Çıkış yapmak istediğinize emin misiniz?</h6>
              </div>

              <div className="logout-modal-buttons">
                <button onClick={handleLogout}>Evet</button>
                <button onClick={handleCloseLogoutModal}>Hayır</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={modalOverlayRef}
        className={showModal ? "modal-overlay" : ""}
        style={{ pointerEvents: disableBackgroundClick ? "auto" : "none" }}
      />
      <div
        ref={modalOverlayRef}
        className={showLogoutModal ? "modal-overlay" : ""}
        style={{ pointerEvents: disableBackgroundClick ? "auto" : "none" }}
      />

      {room ? (
        <div>
          <div className="chat">
            <Chat
              room={room}
              userPhotoURL={userPhotoURL}
              userDisplayName={userDisplayName}
              signUserOut={signUserOut}
              setShowModal={setShowModal}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="nav-buttons">
            <div className="nav-user">
              <img src={userPhotoURL} alt="user" />
              <h6>{userDisplayName}</h6>
            </div>
            <div onClick={signUserOut} className="sign-out">
              <button>
                <i className="fas fa-regular fa-arrow-right-from-bracket" />
              </button>
              <span>Çıkış Yap</span>
            </div>
          </div>
          <div className="home">
            <div className="room">
              <form onSubmit={handleGoToChatRoom}>
                <h6>Oda Oluştur</h6>
                <input
                  minLength={3}
                  maxLength={21}
                  defaultValue=""
                  ref={roomInputRef}
                  type="text"
                />
                <button type="submit">Giriş Yap</button>
              </form>
            </div>
            <div className="room-list">
              <ul>
                <li className="room-list-title">Aktif Odalar</li>
                {roomList?.length < 1 && (
                  <img className="loading-gif" src={loadingGif} alt="loading" />
                )}
                {roomList?.map((room) => (
                  <li key={room?.id}>
                    <span
                      title="Odaya Git"
                      onClick={() => handleRoomClick(room.id)}
                    >
                      {room?.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App;
