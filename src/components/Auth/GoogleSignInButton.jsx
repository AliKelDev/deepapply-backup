import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { GOOGLE_CLIENT_ID, loadGoogleIdentity, useAuth } from "../../context/AuthContext";

/**
 * Renders the official "Sign in with Google" button (Google Identity Services).
 * Falls back to a short explanation when VITE_GOOGLE_CLIENT_ID is not set.
 */
const GoogleSignInButton = ({ size = "large", text = "signin_with", width, onSignedIn, className = "" }) => {
  const { signInWithCredential, authError } = useAuth();
  const slotRef = useRef(null);
  const [state, setState] = useState(GOOGLE_CLIENT_ID ? "loading" : "unconfigured");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !slotRef.current) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setState("signing-in");
            setLocalError("");
            try {
              const user = await signInWithCredential(response.credential);
              onSignedIn?.(user);
            } catch (error) {
              setLocalError(error.message || "Sign-in failed");
            } finally {
              setState("ready");
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });
        slotRef.current.innerHTML = "";
        google.renderButton(slotRef.current, {
          type: "standard",
          theme: "outline",
          size,
          text,
          shape: "pill",
          logo_alignment: "left",
          width,
        });
        setState("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setState("error");
          setLocalError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [size, text, width, signInWithCredential, onSignedIn]);

  if (state === "unconfigured") {
    return (
      <p className={`text-sm text-obsidian-500 ${className}`}>
        Google sign-in isn&apos;t configured on this deployment yet.
      </p>
    );
  }

  return (
    <div className={className}>
      <div ref={slotRef} className="min-h-[40px]" aria-busy={state === "loading" || state === "signing-in"} />
      {state === "signing-in" && <p className="mt-2 text-xs text-obsidian-500">Signing you in…</p>}
      {(localError || authError) && (
        <p className="mt-2 text-sm text-obsidian-900" role="alert">
          {localError || authError}
        </p>
      )}
    </div>
  );
};

GoogleSignInButton.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  text: PropTypes.oneOf(["signin_with", "signup_with", "continue_with", "signin"]),
  width: PropTypes.number,
  onSignedIn: PropTypes.func,
  className: PropTypes.string,
};

export default GoogleSignInButton;
