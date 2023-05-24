import { auth, provider } from "../firebase-config";
import { signInWithPopup } from "firebase/auth";
import Cookies from "universal-cookie";
const cookies = new Cookies();

export const Auth = (props) => {
  const { setIsAuth } = props;

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, provider);
    cookies.set("auth-token", result.user.refreshToken);
    setIsAuth(true);
  };

  return (
    <div className="auth">
      <h5
        style={{
          color: "#6a8fde",
          fontSize: "1.4rem",
          textTransform: "initial",
          margin: "0",
        }}
      >
        ChatApp
      </h5>
      <p>Devam Etmek İçin Google ile Giriş Yap</p>
      <button onClick={signInWithGoogle}>Google ile Giriş Yap</button>
    </div>
  );
};
